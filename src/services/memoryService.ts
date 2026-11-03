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
import { ref, uploadBytes, uploadBytesResumable, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Memory } from "@/types/memory";

const COLLECTION_NAME = "memories";

import imageCompression from "browser-image-compression";

/**
 * Batas maksimal ukuran file (1 GB)
 */
export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

/**
 * Mengompresi file/blob gambar sebelum diunggah ke Firebase Storage.
 * Jika file adalah video atau bukan gambar, proses kompresi dilewati (pass-through).
 */
async function compressImageIfApplicable(blob: Blob, isVideo: boolean): Promise<Blob> {
  if (isVideo || !blob.type.startsWith("image/")) {
    return blob;
  }

  // Jika ukuran sudah kecil (< 400KB), tidak perlu kompresi
  if (blob.size < 400 * 1024) {
    return blob;
  }

  try {
    const options = {
      maxSizeMB: 1, // Maksimal 1MB
      maxWidthOrHeight: 1920, // Resolusi Full HD
      useWebWorker: true,
      fileType: "image/jpeg",
    };
    const file = new File([blob], "image.jpg", { type: blob.type });
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (err) {
    console.warn("Kompresi gambar dilewati karena terjadi kendala:", err);
    return blob;
  }
}

/**
 * Mengunggah satu file/blob media besar (> 50MB) ke Firebase Storage menggunakan Resumable Upload (chunked).
 * Dibungkus ke dalam Promise dengan event observer lengkap (state_changed, error, complete).
 */
async function uploadMediaResumable(
  storageRef: any,
  fileOrBlob: Blob,
  contentType: string,
  onFileProgress?: (percent: number) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const uploadTask = uploadBytesResumable(storageRef, fileOrBlob, {
        contentType,
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onFileProgress) {
              onFileProgress(progress);
            }
          }
        },
        (error) => {
          console.error("[uploadMediaResumable] Error saat upload:", error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onFileProgress) {
              onFileProgress(100);
            }
            resolve(downloadUrl);
          } catch (urlErr) {
            console.error("[uploadMediaResumable] Gagal mendapatkan downloadURL:", urlErr);
            reject(urlErr);
          }
        }
      );
    } catch (taskErr) {
      console.error("[uploadMediaResumable] Gagal menginisialisasi uploadBytesResumable:", taskErr);
      reject(taskErr);
    }
  });
}

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "gw3opahb";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "memori_unsigned";

/**
 * Mengunggah media ke Cloudinary.
 * - Jika ukuran < 20MB: Gunakan single XHR request biasa
 * - Jika ukuran >= 20MB (Video/File besar): Gunakan Cloudinary Chunked Upload (20MB per chunk)
 *   dengan header X-Unique-Upload-Id dan Content-Range
 */
async function uploadToCloudinary(
  fileOrBlobOrDataUrl: Blob | string,
  isVideo: boolean,
  onFileProgress?: (percent: number) => void
): Promise<string> {
  const resourceType = isVideo ? "video" : "auto";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  // 1. Jika berupa string Base64 (data:...), gunakan single XHR request langsung
  if (typeof fileOrBlobOrDataUrl === "string") {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("file", fileOrBlobOrDataUrl);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      xhr.open("POST", url);

      if (xhr.upload && onFileProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onFileProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.secure_url) {
              if (onFileProgress) onFileProgress(100);
              resolve(res.secure_url);
              return;
            }
            reject(new Error("Respon Cloudinary tidak memuat secure_url."));
          } catch (e: any) {
            reject(new Error("Gagal mengurai respon Cloudinary: " + e.message));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error?.message || `Cloudinary upload gagal (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Cloudinary upload gagal dengan status HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Koneksi jaringan ke Cloudinary terputus."));
      };

      xhr.send(formData);
    });
  }

  // 2. Berupa Blob/File: Cek ukuran file
  const blob = fileOrBlobOrDataUrl;
  const CHUNK_SIZE = 20 * 1000 * 1000; // 20MB per chunk

  // Jika ukuran file < 20MB: single XHR request standar
  if (blob.size <= CHUNK_SIZE) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("file", blob);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      xhr.open("POST", url);

      if (xhr.upload && onFileProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onFileProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.secure_url) {
              if (onFileProgress) onFileProgress(100);
              resolve(res.secure_url);
              return;
            }
            reject(new Error("Respon Cloudinary tidak memuat secure_url."));
          } catch (e: any) {
            reject(new Error("Gagal mengurai respon Cloudinary: " + e.message));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error?.message || `Cloudinary upload gagal (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Cloudinary upload gagal dengan status HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Koneksi jaringan ke Cloudinary terputus."));
      };

      xhr.send(formData);
    });
  }

  // 3. Logika Chunking (Jika > 20MB): Pecah file per 20MB dengan X-Unique-Upload-Id & Content-Range
  const uniqueUploadId = `cld_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const totalSize = blob.size;
  let start = 0;
  let finalSecureUrl = "";

  console.log(`[Cloudinary Chunked Upload] Memulai upload berkas besar (${(totalSize / (1024 * 1024)).toFixed(1)}MB) dengan ID: ${uniqueUploadId}`);

  while (start < totalSize) {
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = blob.slice(start, end);
    const currentStart = start;

    const chunkResult = await new Promise<{ secure_url?: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("file", chunk);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      xhr.open("POST", url);

      // Header Wajib Cloudinary untuk Chunked Upload
      xhr.setRequestHeader("X-Unique-Upload-Id", uniqueUploadId);
      xhr.setRequestHeader("Content-Range", `bytes ${currentStart}-${end - 1}/${totalSize}`);

      if (xhr.upload && onFileProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const overallLoaded = currentStart + event.loaded;
            const overallPercent = Math.min(99, Math.round((overallLoaded / totalSize) * 100));
            onFileProgress(overallPercent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch (e: any) {
            reject(new Error("Gagal mengurai respon chunk Cloudinary: " + e.message));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error?.message || `Chunk upload gagal (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Chunk upload gagal dengan status HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Koneksi jaringan ke Cloudinary terputus saat mengunggah chunk."));
      };

      xhr.send(formData);
    });

    if (chunkResult.secure_url) {
      finalSecureUrl = chunkResult.secure_url;
    }

    start = end;
  }

  if (!finalSecureUrl) {
    throw new Error("Cloudinary Chunked Upload selesai tetapi tidak mengembalikan URL berkas.");
  }

  if (onFileProgress) onFileProgress(100);
  return finalSecureUrl;
}

/**
 * Mengunggah satu file/blob/Base64 media ke Cloudinary Storage (dan fallback Firebase jika ada):
 * - Mendukung gambar & video berukuran besar
 * - Progress bar akurat 0% - 100%
 * - Bebas dari hambatan CORS dan kuota kartu kredit
 */
async function processMediaUrl(
  userId: string,
  url: string,
  index: number,
  onFileProgress?: (percent: number) => void
): Promise<string> {
  if (!url) return "";

  // Jika sudah berupa URL online/remote (bukan blob lokal dan bukan base64), gunakan langsung
  if (!url.startsWith("blob:") && !url.startsWith("data:")) {
    if (onFileProgress) onFileProgress(100);
    return url;
  }

  if (!userId) {
    throw new Error("Sesi pengguna tidak valid saat mengunggah media.");
  }

  try {
    const isVideo = url.includes("video") || url.includes("video/mp4") || url.includes(".mp4");

    // 1. Jika data berupa string Base64 (data:image/...)
    if (url.startsWith("data:")) {
      console.log("Mencoba unggah Base64 ke Cloudinary:", `media_${index + 1}`, "Length:", url.length);
      const secureUrl = await uploadToCloudinary(url, isVideo, onFileProgress);
      return secureUrl;
    }

    // 2. Jika data berupa Object URL (blob:...)
    console.log("Mencoba fetch blob dari URL:", `media_${index + 1}`);
    const res = await fetch(url);
    const rawBlob = await res.blob();

    console.log("Mencoba unggah Blob ke Cloudinary:", `media_${index + 1}`, "Size:", rawBlob.size, "Type:", rawBlob.type);

    // Validasi ukuran client-side (maksimal 1GB)
    if (rawBlob.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Ukuran file media #${index + 1} melebihi batas maksimal 1GB.`);
    }

    const isVideoBlob = rawBlob.type.includes("video") || isVideo;
    const secureUrl = await uploadToCloudinary(rawBlob, isVideoBlob, onFileProgress);
    return secureUrl;
  } catch (err: any) {
    console.error(`[processMediaUrl] Error saat mengunggah media #${index + 1}:`, err);
    throw new Error(
      `Gagal mengunggah media #${index + 1}: ${err?.message || "Terjadi kesalahan upload."}`
    );
  }
}

/**
 * Menambahkan kenangan baru ke Cloud Firestore terikat dengan UID pengguna.
 * Mengunggah seluruh media secara SEQUENTIAL (berurutan) dengan pelacak persentase real-time.
 */
export async function addMemoryToFirestore(
  userId: string,
  memoryData: Omit<Memory, "id">,
  onProgress?: (current: number, total: number, percent: number) => void
): Promise<string> {
  if (!userId) {
    throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
  }

  const title = (memoryData.title || "").trim();
  if (!title) {
    throw new Error("Judul kenangan wajib diisi.");
  }

  const rawImages = memoryData.images || [];
  const processedImages: string[] = [];
  const total = rawImages.length;

  // Unggah secara SEQUENTIAL (berurutan dengan loop for...of)
  for (let idx = 0; idx < rawImages.length; idx++) {
    const imgUrl = rawImages[idx];
    if (onProgress) {
      onProgress(idx + 1, total, 0);
    }

    try {
      const downloadUrl = await processMediaUrl(userId, imgUrl, idx, (filePercent) => {
        if (onProgress) {
          onProgress(idx + 1, total, filePercent);
        }
      });
      if (downloadUrl) {
        processedImages.push(downloadUrl);
      }
    } catch (fileErr: any) {
      console.error(`Gagal mengunggah media #${idx + 1}:`, fileErr);
      throw new Error(`Berkas #${idx + 1} gagal diunggah: ${fileErr?.message || "Koneksi terputus."}`);
    }
  }

  if (processedImages.length === 0 && rawImages.length > 0) {
    throw new Error("Semua media gagal diunggah ke Firebase Storage. Mohon periksa koneksi internet Anda.");
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      title,
      date: memoryData.date || new Date().toISOString(),
      location: memoryData.location || "Tidak ditentukan",
      images: processedImages,
      tags: Array.isArray(memoryData.tags) ? memoryData.tags : [],
      color: memoryData.color || "from-blue-500 to-indigo-600",
      createdAt: serverTimestamp(),
    });

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

  // Jika ada media baru berformat blob yang ditambahkan saat edit, proses ke Firebase Storage secara sequential
  if (dataToUpdate.images && dataToUpdate.images.length > 0 && userId) {
    const processed: string[] = [];
    for (let idx = 0; idx < dataToUpdate.images.length; idx++) {
      const url = dataToUpdate.images[idx];
      try {
        const downloadUrl = await processMediaUrl(userId, url, idx);
        if (downloadUrl) processed.push(downloadUrl);
      } catch (err) {
        console.error(`Gagal memproses media edit #${idx + 1}:`, err);
      }
    }
    dataToUpdate.images = processed;
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
 * Mengunggah gambar sampul ke Cloudinary Storage (dengan fallback Base64 permanen)
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

    // Coba upload ke Cloudinary Storage
    try {
      uploadedUrl = await uploadToCloudinary(blob, false);
    } catch (cloudinaryErr) {
      console.warn("Upload cover ke Cloudinary gagal, dialihkan ke Base64 Data URL:", cloudinaryErr);
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
