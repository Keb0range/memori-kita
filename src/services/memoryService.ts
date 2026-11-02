import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Memory } from "@/data/memories";

const COLLECTION_NAME = "memories";

/**
 * Memproses URL media (mengunggah blob ke Firebase Storage atau fallback ke Data URL)
 * Dilengkapi timeout agar proses tidak pernah mengalami infinite loading.
 */
async function processMediaUrl(userId: string, url: string, index: number): Promise<string> {
  if (!url || !url.startsWith("blob:")) {
    return url;
  }

  try {
    const res = await fetch(url);
    const blob = await res.blob();

    // 1. Coba upload ke Firebase Storage jika bucket aktif (dengan timeout 6 detik)
    try {
      if (storage && userId) {
        const isVideo = blob.type.includes("video");
        const extension = isVideo ? "mp4" : "jpg";
        const cleanUserId = encodeURIComponent(userId.trim() || "anonymous");
        const filename = `memories/${cleanUserId}/${Date.now()}_${index}.${extension}`;
        const storageRef = ref(storage, filename);

        const uploadTask = uploadBytes(storageRef, blob, { contentType: blob.type }).then(
          (snapshot) => getDownloadURL(snapshot.ref)
        );

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Storage upload timeout")), 6000)
        );

        const downloadUrl = await Promise.race([uploadTask, timeoutPromise]);
        return downloadUrl;
      }
    } catch (storageErr) {
      console.warn("Storage upload dialihkan ke Base64 Data URL:", storageErr);
    }

    // 2. Fallback: Convert to Base64 Data URL (andal, instan, & permanen)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(url);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Gagal memproses media blob:", err);
    return url;
  }
}

/**
 * Menambahkan kenangan baru ke Cloud Firestore terikat dengan UID pengguna
 */
export async function addMemoryToFirestore(
  userId: string,
  memoryData: Omit<Memory, "id">
): Promise<string> {
  if (!userId) {
    throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
  }

  const title = (memoryData.title || "").trim();
  if (!title) {
    throw new Error("Judul kenangan wajib diisi.");
  }

  try {
    // Proses seluruh gambar/video agar permanen (dengan timeout anti-hang)
    const processedImages = await Promise.all(
      (memoryData.images || []).map((imgUrl, idx) => processMediaUrl(userId, imgUrl, idx))
    );

    // Timeout guard untuk Firestore (maksimal 15 detik)
    const timeoutFirestore = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Koneksi Firestore timeout. Mohon periksa koneksi internet Anda.")),
        15000
      )
    );

    const addDocPromise = addDoc(collection(db, COLLECTION_NAME), {
      userId,
      title,
      date: memoryData.date || new Date().toISOString(),
      location: memoryData.location || "Tidak ditentukan",
      images: processedImages,
      tags: Array.isArray(memoryData.tags) ? memoryData.tags : [],
      color: memoryData.color || "from-blue-500 to-indigo-600",
      createdAt: serverTimestamp(),
    });

    const docRef = await Promise.race([addDocPromise, timeoutFirestore]);
    return docRef.id;
  } catch (error: any) {
    console.error("[addMemoryToFirestore] Gagal menyimpan ke Firestore:", error);
    throw new Error(error?.message || "Gagal menyimpan data kenangan ke Cloud Firestore.");
  }
}

/**
 * Berlangganan (real-time subscription) daftar kenangan milik pengguna tertentu
 */
export function subscribeUserMemories(
  userId: string,
  onUpdate: (memories: Memory[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const memories: Memory[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "Tanpa Judul",
          date: data.date || "",
          location: data.location || "",
          images: Array.isArray(data.images) ? data.images : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          color: data.color || "from-blue-500 to-indigo-600",
          userId: data.userId,
          createdAt: data.createdAt,
        };
      });

      // Sort memories secara descending (terbaru di atas)
      memories.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const aTime = a.createdAt.toMillis
            ? a.createdAt.toMillis()
            : (a.createdAt.seconds || 0) * 1000;
          const bTime = b.createdAt.toMillis
            ? b.createdAt.toMillis()
            : (b.createdAt.seconds || 0) * 1000;
          return bTime - aTime;
        }
        return 0;
      });

      onUpdate(memories);
    },
    (error) => {
      console.error("Gagal mendengarkan data kenangan dari Firestore:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Menghapus kenangan dari Cloud Firestore berdasarkan ID dokumen
 */
export async function deleteMemoryFromFirestore(memoryId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, memoryId));
}

/**
 * Memperbarui data kenangan di Cloud Firestore (Update Memory)
 */
export async function updateMemory(
  memoryId: string,
  updatedData: Partial<Omit<Memory, "id">>,
  userId?: string
): Promise<void> {
  const dataToUpdate = { ...updatedData };

  // Jika ada media baru berformat blob yang ditambahkan saat edit, proses ke Firebase Storage / Base64
  if (dataToUpdate.images && dataToUpdate.images.length > 0 && userId) {
    dataToUpdate.images = await Promise.all(
      dataToUpdate.images.map((imgUrl, idx) => processMediaUrl(userId, imgUrl, idx))
    );
  }

  await updateDoc(doc(db, COLLECTION_NAME, memoryId), dataToUpdate);
}

/**
 * Alias kompatibilitas untuk updateMemoryInFirestore
 */
export const updateMemoryInFirestore = updateMemory;

/**
 * Menyimpan data profil/pengaturan pengguna (appName, coverPhoto) ke Firestore di dokumen users/{userId}
 */
export async function saveUserProfile(
  userId: string,
  profileData: Partial<{ appName: string; coverPhoto: string; heroBg: string }>
): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Gagal menyimpan profil pengguna ke Firestore:", error);
    throw error;
  }
}

/**
 * Menyimpan nama aplikasi kustom pengguna ke Firestore di dokumen users/{userId}
 */
export async function saveUserAppName(userId: string, appName: string): Promise<void> {
  return saveUserProfile(userId, { appName: appName.trim() });
}

/**
 * Mengunggah gambar sampul ke Firebase Storage (dengan fallback Base64 permanen)
 * dan mengembalikan URL permanen yang siap dipakai.
 */
export async function uploadCoverPhotoToStorage(userId: string, imageUri: string): Promise<string> {
  if (!imageUri || !imageUri.startsWith("blob:")) {
    return imageUri;
  }

  try {
    const res = await fetch(imageUri);
    const blob = await res.blob();

    let uploadedUrl: string | null = null;

    // Coba upload ke Firebase Storage jika storage aktif (timeout 8 detik)
    try {
      if (storage && userId) {
        const cleanUserId = encodeURIComponent(userId.trim() || "anonymous");
        const filename = `covers/${cleanUserId}/${Date.now()}_cover.jpg`;
        const storageRef = ref(storage, filename);

        const uploadTask = uploadBytes(storageRef, blob, { contentType: "image/jpeg" }).then(
          (snapshot) => getDownloadURL(snapshot.ref)
        );

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Cover upload timeout")), 8000)
        );

        uploadedUrl = await Promise.race([uploadTask, timeoutPromise]);
      }
    } catch (storageErr) {
      console.warn("Upload cover ke Storage dialihkan ke Base64 Data URL:", storageErr);
    }

    if (uploadedUrl) {
      return uploadedUrl;
    }

    // Fallback Base64 permanen: tahan banting, tidak pernah kedaluwarsa
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(imageUri);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Gagal memproses gambar sampul:", e);
    return imageUri;
  }
}

/**
 * Menyimpan foto sampul pengguna ke Firestore (users/{userId}) secara background/asinkron.
 * Jika URL masih berupa blob, upload dulu ke Storage / Base64.
 */
export async function saveUserCoverPhoto(userId: string, imageUri: string): Promise<string> {
  if (!userId) throw new Error("User ID diperlukan untuk menyimpan sampul.");

  // Dapatkan URL permanen (Firebase Storage atau Base64)
  const permanentUrl = await uploadCoverPhotoToStorage(userId, imageUri);

  // Penulisan ke Firestore dijalankan secara background tanpa memblokir pemanggil jika tidak diawait
  const userDocRef = doc(db, "users", userId);
  setDoc(
    userDocRef,
    { coverPhoto: permanentUrl, heroBg: permanentUrl, updatedAt: serverTimestamp() },
    { merge: true }
  ).catch((err) => {
    console.error("Background Firestore saveUserCoverPhoto gagal:", err);
  });

  return permanentUrl;
}

/**
 * Berlangganan secara realtime data profil pengguna (appName & coverPhoto) dari Firestore di users/{userId}
 */
export function subscribeUserProfile(
  userId: string,
  onUpdate: (data: { appName: string | null; coverPhoto: string | null }) => void
): () => void {
  if (!userId) {
    onUpdate({ appName: null, coverPhoto: null });
    return () => {};
  }
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const appName =
          data && typeof data.appName === "string" && data.appName.trim()
            ? data.appName.trim()
            : null;
        
        // Ambil URL sampul, abaikan jika merupakan blob sementara yang sudah mati
        const rawCover = data.coverPhoto || data.heroBg || data.coverUrl || data.heroBackground;
        let coverPhoto: string | null = null;
        if (
          typeof rawCover === "string" &&
          rawCover.trim().length > 0 &&
          !rawCover.startsWith("blob:")
        ) {
          coverPhoto = rawCover.trim();
        }

        onUpdate({ appName, coverPhoto });
        return;
      }
      onUpdate({ appName: null, coverPhoto: null });
    },
    (error) => {
      console.error("Gagal mendengarkan data profil pengguna di Firestore:", error);
      onUpdate({ appName: null, coverPhoto: null });
    }
  );
}

/**
 * Berlangganan secara realtime nama aplikasi dari Firestore di users/{userId} (kompatibilitas)
 */
export function subscribeUserAppName(
  userId: string,
  onUpdate: (appName: string | null) => void
): () => void {
  return subscribeUserProfile(userId, (res) => onUpdate(res.appName));
}
