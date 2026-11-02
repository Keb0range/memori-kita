"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { MEMORIES, Memory } from "@/data/memories";
import MemoryCard from "@/components/MemoryCard";
import AddMemoryModal from "@/components/AddMemoryModal";
import MemoryDetailModal from "@/components/MemoryDetailModal";
import HeroCropperModal from "@/components/HeroCropperModal";
import AvatarCropperModal from "@/components/AvatarCropperModal";
import {
  Search,
  Plus,
  Sparkles,
  Camera,
  Layers,
  Heart,
  SlidersHorizontal,
  X,
  LogOut,
} from "lucide-react";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  addMemoryToFirestore,
  subscribeUserMemories,
  deleteMemoryFromFirestore,
  updateMemory,
  updateMemoryInFirestore,
  saveUserAppName,
  saveUserCoverPhoto,
  uploadCoverPhotoToStorage,
  saveUserProfile,
  subscribeUserProfile,
} from "@/services/memoryService";

export default function Home() {
  // State data utama memori (diinisialisasi kosong agar tidak ada flash data guest saat refresh)
  const [memories, setMemories] = useState<Memory[]>([]);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Monitor status autentikasi Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      // Jika pengguna login dan memiliki foto Google
      if (user?.photoURL) {
        if (!localStorage.getItem("userAvatar")) {
          setAvatarSrc(user.photoURL);
        }
        try {
          localStorage.setItem("userAuthPhoto", user.photoURL);
        } catch {}
      } else if (!user) {
        try {
          localStorage.removeItem("userAuthPhoto");
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization data galeri dengan Cloud Firestore saat login
  useEffect(() => {
    // Tahan pemuatan data sampai status autentikasi selesai dikonfirmasi Firebase
    if (isAuthLoading) return;

    if (!currentUser) {
      setMemories(MEMORIES.filter((m) => m.title.toLowerCase().trim() !== "wisuda s1"));
      return;
    }

    const unsubscribe = subscribeUserMemories(currentUser.uid, (firestoreMemories) => {
      const cleaned = firestoreMemories.filter((m) => {
        const isWisuda = m.title.toLowerCase().trim() === "wisuda s1";
        if (isWisuda && typeof m.id === "string") {
          deleteMemoryFromFirestore(m.id).catch(console.error);
          return false;
        }
        return true;
      });
      setMemories(cleaned);
    });

    return () => unsubscribe();
  }, [currentUser, isAuthLoading]);

  // Real-time synchronization Data Pengguna (Nama Aplikasi & Foto Sampul) dari Cloud Firestore
  useEffect(() => {
    if (isAuthLoading) return;

    if (!currentUser) {
      // Mode Guest / Logout: pastikan nama kembali ke default "MemoriAI" dan foto sampul null (default)
      setAppName("MemoriAI");
      setTempAppName("MemoriAI");
      setHeroBg(null);
      try {
        localStorage.removeItem("customAppName");
        localStorage.removeItem("userAppName");
        localStorage.removeItem("userCoverPhoto");
      } catch {}
      return;
    }

    // Mode Login: Dengarkan dan ambil serentak nama aplikasi & foto sampul dari dokumen users/{currentUser.uid}
    const unsubscribe = subscribeUserProfile(currentUser.uid, ({ appName: firestoreName, coverPhoto }) => {
      // 1. Sinkronisasi Nama Aplikasi (hanya update jika berbeda agar tidak memicu re-render berlebihan)
      if (firestoreName) {
        setAppName((prev) => (prev === firestoreName ? prev : firestoreName));
        setTempAppName((prev) => (prev === firestoreName ? prev : firestoreName));
        try {
          localStorage.setItem("userAppName", firestoreName);
        } catch {}
      } else {
        setAppName((prev) => (prev === "MemoriAI" ? prev : "MemoriAI"));
        setTempAppName((prev) => (prev === "MemoriAI" ? prev : "MemoriAI"));
        try {
          localStorage.removeItem("userAppName");
        } catch {}
      }

      // 2. Sinkronisasi Foto Sampul (hanya update jika URL berbeda untuk mencegah flicker/re-render saat pengiriman data)
      if (coverPhoto) {
        setHeroBg((prev) => (prev === coverPhoto ? prev : coverPhoto));
        try {
          localStorage.setItem("userCoverPhoto", coverPhoto);
        } catch {}
      } else {
        setHeroBg((prev) => (prev === null ? prev : null));
        try {
          localStorage.removeItem("userCoverPhoto");
        } catch {}
      }
    });

    return () => unsubscribe();
  }, [currentUser, isAuthLoading]);

  // Handler Login dengan Google Popup
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error("Gagal login dengan Google:", error);
        alert("Gagal login dengan Google: " + (error?.message || "Terjadi kesalahan."));
      }
    }
  };

  // Handler Logout: Bersihkan state & kembalikan nama aplikasi dan foto sampul ke default
  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem("userAuthPhoto");
        localStorage.removeItem("customAppName");
        localStorage.removeItem("userAppName");
        localStorage.removeItem("userCoverPhoto");
      } catch {}
      setAvatarSrc(defaultAvatar);
      setAppName("MemoriAI");
      setTempAppName("MemoriAI");
      setHeroBg(null);
      await signOut(auth);
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  // Hydration Safety State: Mencegah mismatch render SSR vs Client
  const [isMounted, setIsMounted] = useState(false);

  // App Name & Modal Edit State (Default statis "MemoriAI" agar 100% cocok dengan Server Render)
  const [appName, setAppName] = useState("MemoriAI");
  const [tempAppName, setTempAppName] = useState("MemoriAI");
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);

  // User Profile Avatar State & Cropper (Dengan Fallback Anti-Broken)
  const defaultAvatar =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
  const fallbackAvatar =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
  const [avatarSrc, setAvatarSrc] = useState<string>(defaultAvatar);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [isAvatarCropperOpen, setIsAvatarCropperOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Ambil data localStorage hanya setelah client-side mounted
  useEffect(() => {
    // Ambil foto avatar kustom atau foto auth Google yang di-cache dari localStorage
    try {
      const customAvatar = localStorage.getItem("userAvatar");
      const authPhoto = localStorage.getItem("userAuthPhoto");
      const savedAvatar = customAvatar || authPhoto;
      if (savedAvatar) {
        if (savedAvatar.startsWith("blob:")) {
          localStorage.removeItem("userAvatar");
          setAvatarSrc(defaultAvatar);
        } else {
          setAvatarSrc(savedAvatar);
        }
      }
    } catch {}

    // Ambil cache nama user jika ada sesi login tersimpan sebelumnya (anti-flicker)
    try {
      const cachedUserName = localStorage.getItem("userAppName");
      if (cachedUserName && cachedUserName.trim()) {
        setAppName(cachedUserName.trim());
        setTempAppName(cachedUserName.trim());
      }
    } catch {}

    // Ambil cache foto sampul user jika ada sesi login tersimpan sebelumnya (anti-flicker saat reload)
    try {
      const cachedCover = localStorage.getItem("userCoverPhoto");
      if (cachedCover && cachedCover.trim()) {
        setHeroBg(cachedCover.trim());
      }
    } catch {}

    setIsMounted(true);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTempAvatar(URL.createObjectURL(file));
      setIsAvatarCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleAvatarCropComplete = (croppedUrl: string) => {
    setAvatarSrc(croppedUrl);
    try {
      localStorage.setItem("userAvatar", croppedUrl);
    } catch (err) {
      console.error("Gagal menyimpan avatar ke localStorage:", err);
    }
  };

  // Hero Cover Background & Cropper State
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Hitung frekuensi kemunculan tag dan ambil maksimal 7 tag paling populer
  const popularTags = useMemo(() => {
    const frequencyMap: Record<string, number> = {};
    memories.forEach((m) => {
      m.tags.forEach((tag) => {
        const cleanTag = tag.toLowerCase().trim();
        if (cleanTag) {
          frequencyMap[cleanTag] = (frequencyMap[cleanTag] || 0) + 1;
        }
      });
    });

    return Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1]) // Urutkan berdasarkan frekuensi tertinggi
      .slice(0, 7) // Ambil maksimal 7 tag terpopuler
      .map(([tag]) => tag);
  }, [memories]);

  // Filter memories berdasarkan kata kunci pencarian dan tag aktif
  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      // Hapus permanen memori Wisuda S1 tanpa sampul dari galeri
      if (memory.title.toLowerCase().trim() === "wisuda s1") {
        return false;
      }

      // Filter Tag
      if (selectedTag && !memory.tags.includes(selectedTag)) {
        return false;
      }

      // Filter Pencarian Teks (Cari di judul, lokasi, atau tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = memory.title.toLowerCase().includes(query);
        const matchLocation = memory.location.toLowerCase().includes(query);
        const matchTag = memory.tags.some((t) => t.toLowerCase().includes(query));

        if (!matchTitle && !matchLocation && !matchTag) {
          return false;
        }
      }

      return true;
    });
  }, [memories, searchQuery, selectedTag]);

  // Handler: Tambah Kenangan Baru
  const handleAddMemory = async (newMemData: Omit<Memory, "id">) => {
    if (currentUser) {
      if (!currentUser.uid) {
        throw new Error("Sesi login pengguna tidak ditemukan. Silakan login kembali.");
      }
      try {
        await addMemoryToFirestore(currentUser.uid, newMemData);
      } catch (error: any) {
        console.error("Gagal menambahkan kenangan ke Firestore:", error);
        throw new Error(error?.message || "Gagal menyimpan kenangan ke database cloud.");
      }
    } else {
      const newId =
        memories.length > 0
          ? Math.max(...memories.map((m) => (typeof m.id === "number" ? m.id : 0))) + 1
          : 1;
      const newMemory: Memory = {
        id: newId,
        ...newMemData,
      };
      setMemories([newMemory, ...memories]);
    }
  };

  // Handler: Hapus Seluruh Kenangan
  const handleDeleteMemory = async (memoryId: number | string) => {
    if (currentUser && typeof memoryId === "string") {
      try {
        await deleteMemoryFromFirestore(memoryId);
      } catch (error) {
        console.error("Gagal menghapus kenangan dari Firestore:", error);
      }
    } else {
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
    if (selectedMemory?.id === memoryId) {
      setSelectedMemory(null);
    }
  };

  // Handler: Hapus Hanya 1 Foto Tertentu dari Array images
  const handleDeletePhoto = async (memoryId: number | string, photoIndex: number) => {
    const memoryToUpdate = memories.find((m) => m.id === memoryId);
    if (!memoryToUpdate) return;

    const updatedImages = memoryToUpdate.images.filter((_, idx) => idx !== photoIndex);

    if (currentUser && typeof memoryId === "string") {
      try {
        await updateMemoryInFirestore(memoryId, { images: updatedImages });
      } catch (error) {
        console.error("Gagal menghapus foto dari Firestore:", error);
      }
    } else {
      setMemories((prev) =>
        prev.map((m) => {
          if (m.id === memoryId) {
            return { ...m, images: updatedImages };
          }
          return m;
        })
      );
    }

    setSelectedMemory((prev) => {
      if (!prev || prev.id !== memoryId) return prev;
      return { ...prev, images: updatedImages };
    });
  };

  // Handler: Update / Edit Data Kenangan
  const handleUpdateMemory = async (updatedMemory: Memory) => {
    if (currentUser && typeof updatedMemory.id === "string") {
      try {
        await updateMemoryInFirestore(updatedMemory.id, {
          title: updatedMemory.title,
          date: updatedMemory.date,
          location: updatedMemory.location,
          tags: updatedMemory.tags,
          images: updatedMemory.images,
        }, currentUser.uid);
      } catch (error) {
        console.error("Gagal memperbarui kenangan di Firestore:", error);
      }
    } else {
      setMemories((prev) =>
        prev.map((m) => (m.id === updatedMemory.id ? updatedMemory : m))
      );
    }
    setSelectedMemory(updatedMemory);
  };

  // Handler: Simpan Nama Aplikasi ke State, Firestore (User), & Cache
  const handleSaveAppName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAppName(trimmed);
    setTempAppName(trimmed);
    setIsTitleModalOpen(false);

    if (currentUser) {
      try {
        await saveUserAppName(currentUser.uid, trimmed);
        try {
          localStorage.setItem("userAppName", trimmed);
        } catch {}
      } catch (e) {
        console.error("Gagal menyimpan nama aplikasi ke Firestore:", e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pt-14">
      {/* ============================================================
          TOP NAVIGATION BAR
          ============================================================ */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Hidden Avatar File Input */}
          <input
            type="file"
            ref={avatarInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />

          {/* Sisi Kiri: Foto Profil di Paling Kiri & Nama Aplikasi "MemoriAI" di Sebelah Kanannya */}
          <div className="flex items-center gap-3 sm:gap-3.5">
            {/* Foto Profil / Avatar Interaktif (Di Sebelah Paling Kiri) */}
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative group/avatar cursor-pointer shrink-0"
              title="Klik untuk mengganti foto profil"
            >
              {!isMounted || (isAuthLoading && avatarSrc === defaultAvatar) ? (
                /* Skeleton Loader Bundar Saat Memuat Sesi Auth (Cegah Avatar Flicker & Guest Flash) */
                <div className="w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full bg-slate-100 border border-slate-200 shadow-xs animate-pulse" />
              ) : (
                <>
                  <div className="w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-300 group-hover/avatar:scale-105 flex items-center justify-center">
                    <img
                      src={avatarSrc}
                      alt="Foto Profil"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== defaultAvatar && !target.src.includes("unsplash")) {
                          target.src = defaultAvatar;
                        } else {
                          target.src = fallbackAvatar;
                        }
                      }}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200">
                    <Camera className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                  </div>
                </>
              )}
            </div>

            {/* Teks Nama Aplikasi (Persis di Sebelah Kanan Foto Profil) */}
            <div className="group/title flex items-center gap-1.5 min-w-[80px] sm:min-w-[96px] h-7">
              {!isMounted ? (
                /* Skeleton Penahan Saat Awal Render (Cegah Flicker Teks & Cegah Hydration Error) */
                <div className="w-20 sm:w-24 h-5 rounded-md bg-slate-100 animate-pulse" />
              ) : (
                <>
                  <h1 className="text-base sm:text-lg font-medium tracking-tight select-none flex items-center text-slate-800 transition-opacity duration-300 opacity-100">
                    {appName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setTempAppName(appName);
                      setIsTitleModalOpen(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-all opacity-0 group-hover/title:opacity-100 cursor-pointer"
                    title="Ubah nama aplikasi"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bagian Aksi Kanan: Tambah Kenangan & Google Auth */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {isAuthLoading ? (
              /* Skeleton Loader Halus Saat Status Auth Belum Terkonfirmasi */
              <div className="flex items-center gap-2 sm:gap-2.5 animate-pulse">
                <div className="w-24 sm:w-36 h-8 sm:h-9 rounded-xl bg-slate-100" />
                <div className="w-8 sm:w-28 h-8 sm:h-9 rounded-xl bg-slate-100" />
              </div>
            ) : (
              <>
                {/* Tombol Tambah Kenangan (Biru Solid Elegan) */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all transform hover:-translate-y-0.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah Kenangan</span>
                  <span className="sm:hidden">Tambah</span>
                </button>

                {/* Google Authentication Section */}
                {currentUser ? (
                  /* User Info & Logout Button */
                  <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                    <div
                      className="flex items-center gap-2"
                      title={currentUser.email || currentUser.displayName || "Pengguna"}
                    >
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || "User"}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                          {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="hidden lg:flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate leading-tight">
                          {currentUser.displayName || "Pengguna"}
                        </span>
                        <span className="text-[10px] text-slate-400 max-w-[120px] truncate leading-tight">
                          {currentUser.email}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Keluar dari akun"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                ) : (
                  /* Tombol Login dengan Google */
                  <button
                    onClick={handleGoogleLogin}
                    className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
                    title="Masuk dengan akun Google"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Login Google</span>
                    <span className="sm:hidden">Login</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO & SEARCH SECTION (WITH CUSTOM HERO COVER OVERLAY)
          ============================================================ */}
      <section className="group relative w-full flex flex-col items-center justify-center pt-32 pb-36 px-4 overflow-hidden border-b border-slate-200/60 bg-gradient-to-b from-blue-50/40 via-white to-slate-50 transition-all duration-700">
        {/* Hidden Input File untuk Unggah Sampul Hero */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setTempImage(URL.createObjectURL(e.target.files[0]));
              setIsCropperOpen(true);
              e.target.value = "";
            }
          }}
        />

        {/* Sisipkan Gambar Sampul & Pelindung Gradasi (Hero Overlay) */}
        {heroBg && !heroBg.startsWith("blob:") && (
          <>
            <img
              src={heroBg}
              alt="Hero Cover"
              onError={() => {
                // Jika gambar gagal dimuat (misal broken URL atau jaringan terputus), fallback aman ke gradasi default
                console.warn("Foto sampul gagal dimuat, dialihkan ke latar belakang gradasi default.");
                setHeroBg(null);
                try {
                  localStorage.removeItem("userCoverPhoto");
                } catch {}
              }}
              className="absolute inset-0 w-full h-full object-cover object-center z-0"
            />
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-blue-950/90 via-slate-900/60 to-white pointer-events-none" />
          </>
        )}

        {/* Tombol Ubah / Tambah Sampul di Pojok Kanan Bawah (Auto-hide di Desktop) */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            fileInputRef.current?.click();
          }}
          className="absolute bottom-4 right-4 md:bottom-8 md:right-6 z-30 px-2.5 py-1 md:px-4 md:py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-[11px] md:text-xs font-medium flex items-center gap-1.5 md:gap-2 cursor-pointer shadow-lg border border-white/20 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {heroBg ? "Ubah Sampul" : "Tambah Sampul"}
        </button>

        {/* Konten Teks & Search Bar */}
        <div className="relative z-20 w-full max-w-4xl flex flex-col items-center text-center">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 transition-all duration-500 ${
              heroBg
                ? "bg-white/15 backdrop-blur-md text-white border border-white/20"
                : "bg-blue-50 text-blue-700 border border-blue-200/50"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${heroBg ? "text-blue-200" : "text-blue-600"}`} />
            <span>Retrieval Cerdas Berbasis Visi & Teks</span>
          </div>

          <h2
            className={`text-3xl sm:text-4xl font-bold tracking-tight mb-2 md:whitespace-nowrap transition-colors duration-500 ${
              heroBg ? "text-white drop-shadow-md" : "text-slate-800"
            }`}
          >
            Temukan Foto Kenangan dalam Sekejap
          </h2>
          <p
            className={`text-base sm:text-lg max-w-4xl mx-auto leading-relaxed mb-8 md:whitespace-nowrap transition-colors duration-500 ${
              heroBg ? "text-blue-50 drop-shadow-sm" : "text-slate-500"
            }`}
          >
            Cari momen masa lalu secara natural dengan kata kunci objek, lokasi, atau warna baju.
          </p>

          {/* Search Box */}
          <div className="relative w-full max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search
                className={`absolute left-4 w-5 h-5 pointer-events-none transition-colors duration-500 ${
                  heroBg ? "text-white/70" : "text-slate-400"
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Coba: 'baju hitam', 'gunung', 'pantai'..."
                className={`w-full pl-12 pr-10 py-3.5 rounded-2xl outline-none transition-all duration-500 text-sm sm:text-base ${
                  heroBg
                    ? "bg-white/20 backdrop-blur-md border border-white/30 text-white placeholder:text-white/70 shadow-lg focus:ring-2 focus:ring-white/40 focus:border-white/50"
                    : "bg-white border border-slate-300/80 text-slate-900 placeholder-slate-400 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-3.5 p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer ${
                    heroBg ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TAGS FILTER BAR
          ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full">
        {isAuthLoading ? (
          /* Skeleton Filter Bar Saat Memverifikasi Auth */
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none animate-pulse">
            <div className="w-16 h-7 rounded-xl bg-slate-200/60 shrink-0" />
            <div className="w-20 h-7 rounded-xl bg-slate-200/60 shrink-0" />
            <div className="w-24 h-7 rounded-xl bg-slate-200/60 shrink-0" />
            <div className="w-20 h-7 rounded-xl bg-slate-200/60 shrink-0" />
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            {/* Filter Semua */}
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                selectedTag === null
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Semua ({memories.length})
            </button>

            {/* Filter Tag Items (Maksimal 7 Terpopuler) */}
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                  selectedTag === tag
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          MAIN GALLERY GRID
          ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex-1 w-full">
        {isAuthLoading ? (
          /* Skeleton Loader Galeri Saat Menunggu Konfirmasi Auth (Cegah Flash of Guest Content) */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-48 h-4 rounded-md bg-slate-200/60 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl border border-slate-200/80 p-4 space-y-3 shadow-xs animate-pulse"
                >
                  <div className="w-full aspect-[4/3] rounded-2xl bg-slate-100" />
                  <div className="space-y-2 pt-1">
                    <div className="w-3/4 h-4 rounded-md bg-slate-100" />
                    <div className="w-1/2 h-3 rounded-md bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="w-14 h-5 rounded-md bg-slate-100" />
                    <div className="w-16 h-5 rounded-md bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Count Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Menampilkan {filteredMemories.length} dari {memories.length} Kenangan
              </p>
              {(searchQuery || selectedTag) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTag(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Gallery Cards Grid */}
            {filteredMemories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                {filteredMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onClick={() => setSelectedMemory(memory)}
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-300 max-w-md mx-auto p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kenangan tidak ditemukan</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tidak ada kenangan yang cocok dengan kata kunci &quot;{searchQuery || selectedTag}&quot;.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTag(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Tampilkan Semua Kenangan
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ============================================================
          MODALS
          ============================================================ */}
      {/* Modal Tambah Kenangan (Multi-Upload & AI) */}
      <AddMemoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMemory={handleAddMemory}
      />

      {/* Modal Detail Kenangan (Carousel, Single Delete, Fullscreen, Inline Edit) */}
      <MemoryDetailModal
        memory={selectedMemory}
        isOpen={selectedMemory !== null}
        onClose={() => setSelectedMemory(null)}
        onDeletePhoto={handleDeletePhoto}
        onDeleteMemory={handleDeleteMemory}
        onUpdateMemory={handleUpdateMemory}
      />

      {/* Modal Cropper Sampul Hero */}
      <HeroCropperModal
        isOpen={isCropperOpen}
        imageSrc={tempImage}
        onClose={() => {
          setIsCropperOpen(false);
          setTempImage(null);
        }}
        onCropComplete={async (croppedUrl) => {
          if (currentUser) {
            try {
              // 1. Unggah ke Storage (atau Base64) untuk mendapatkan downloadURL
              const downloadUrl = await uploadCoverPhotoToStorage(currentUser.uid, croppedUrl);

              // 2. Optimistic UI: LANGSUNG perbarui state lokal React seketika downloadUrl didapatkan
              setHeroBg(downloadUrl);
              try {
                localStorage.setItem("userCoverPhoto", downloadUrl);
              } catch {}

              // 3. Tulis ke Firestore secara asinkron di latar belakang (JANGAN diawait agar UI tidak terblokir)
              saveUserProfile(currentUser.uid, { coverPhoto: downloadUrl, heroBg: downloadUrl }).catch((err) => {
                console.error("Gagal menyimpan cover photo ke Firestore di latar belakang:", err);
              });
            } catch (err) {
              console.error("Gagal mengunggah foto sampul ke Cloud:", err);
              // Fallback jika proses upload bermasalah
              setHeroBg(croppedUrl);
            }
          } else {
            // Mode Guest: konversi ke Base64 agar tidak kedaluwarsa
            try {
              const res = await fetch(croppedUrl);
              const blob = await res.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                setHeroBg(base64);
                try {
                  localStorage.setItem("userCoverPhoto", base64);
                } catch {}
              };
              reader.readAsDataURL(blob);
            } catch {
              setHeroBg(croppedUrl);
            }
          }
        }}
      />

      {/* Modal Cropper Foto Profil (1:1 / Round) */}
      <AvatarCropperModal
        isOpen={isAvatarCropperOpen}
        imageSrc={tempAvatar}
        onClose={() => {
          setIsAvatarCropperOpen(false);
          setTempAvatar(null);
        }}
        onCropComplete={handleAvatarCropComplete}
      />

      {/* Modal Edit Nama Aplikasi (Glassmorphism Elegan) */}
      {isTitleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ubah Nama Aplikasi</h3>
                  <p className="text-[11px] text-slate-500">Sesuaikan judul galeri kenangan Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTitleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAppName(tempAppName);
              }}
              className="flex flex-col gap-4 mt-1"
            >
              <input
                type="text"
                value={tempAppName}
                onChange={(e) => setTempAppName(e.target.value)}
                autoFocus
                placeholder="Misal: MemoriAI, Galeri Kenangan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white outline-none text-sm font-medium text-slate-800 transition shadow-inner"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTitleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition transform hover:-translate-y-0.5 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
