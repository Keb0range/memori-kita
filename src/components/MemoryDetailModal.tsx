"use client";

import React, { useState, useEffect, useRef } from "react";
import { Memory } from "@/data/memories";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Maximize2,
  Tag,
  Play,
  Pencil,
  Check,
  Upload,
  Plus,
  Hash,
  Calendar,
} from "lucide-react";

const isVideoMedia = (url: string) => {
  if (!url) return false;
  return (
    url.startsWith("data:video") ||
    url.includes("#video") ||
    url.includes("#t=") ||
    url.endsWith(".mp4") ||
    url.endsWith(".webm") ||
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes("video")
  );
};

const getVideoSrc = (url: string) => {
  if (!url) return "";
  const cleanUrl = url.split("#")[0];
  return `${cleanUrl}#t=0.1`;
};

// Helper konversi format tanggal ke format HTML5 YYYY-MM-DD
const toInputDateFormat = (dateStr: string): string => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const months: Record<string, string> = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const day = parts[0].replace(/\D/g, "").padStart(2, "0");
    const month = months[parts[1].toLowerCase()];
    const year = parts[2].replace(/\D/g, "").slice(0, 4);
    if (month && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split("T")[0];
  }
  return "";
};

const formatDateToLocale = (dateStr: string) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return dateStr;
};

interface MemoryDetailModalProps {
  memory: Memory | null;
  isOpen: boolean;
  onClose: () => void;
  onDeletePhoto: (memoryId: number | string, photoIndex: number) => void;
  onDeleteMemory: (memoryId: number | string) => void;
  onUpdateMemory?: (updatedMemory: Memory) => void;
}

export default function MemoryDetailModal({
  memory,
  isOpen,
  onClose,
  onDeletePhoto,
  onDeleteMemory,
  onUpdateMemory,
}: MemoryDetailModalProps) {
  const today = new Date();
  const maxDateString = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const isSwipingRef = useRef(false);
  const touchStartCoordRef = useRef<{ x: number; y: number } | null>(null);

  // State untuk Inline Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [editedMedia, setEditedMedia] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagError, setTagError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "media" | "memory" | null;
    targetIndex?: number;
  }>({ isOpen: false, type: null });
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);

  // Reset index dan sync form saat modal dibuka atau memory berubah
  useEffect(() => {
    setCurrentImgIndex(0);
    setIsFullscreen(false);
    setShowControls(false);
    setDeleteConfirm({ isOpen: false, type: null });
    if (memory) {
      setEditedTitle(memory.title || "");
      setEditedDate(toInputDateFormat(memory.date) || memory.date || "");
      setEditedLocation(memory.location || "");
      setEditedTags(memory.tags ? [...memory.tags] : []);
      setEditedMedia(memory.images ? [...memory.images] : []);
    }
    setTagError("");
    setIsEditing(false);
  }, [memory?.id, isOpen]);

  // Pastikan index tetap valid jika ada foto yang dihapus
  useEffect(() => {
    if (memory && memory.images && currentImgIndex >= memory.images.length) {
      setCurrentImgIndex(Math.max(0, memory.images.length - 1));
    }
  }, [memory?.images.length, currentImgIndex, memory]);

  const images = isEditing
    ? editedMedia.length > 0
      ? editedMedia
      : memory?.images || []
    : memory?.images && memory.images.length > 0
    ? memory.images
    : [];
  const totalPhotos = images.length;
  const currentPhoto = images[currentImgIndex] || images[0] || "";

  // Carousel navigasi
  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (totalPhotos <= 1) return;
    setCurrentImgIndex((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (totalPhotos <= 1) return;
    setCurrentImgIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
  };

  // Handlers untuk Mode Edit
  const handleStartEdit = () => {
    if (memory) {
      setEditedTitle(memory.title || "");
      setEditedDate(toInputDateFormat(memory.date) || memory.date || "");
      setEditedLocation(memory.location || "");
      setEditedTags(memory.tags ? [...memory.tags] : []);
      setEditedMedia(memory.images ? [...memory.images] : []);
    }
    setTagError("");
    setIsEditing(true);
  };

  const handleEditMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    const MAX_SIZE_MB = 1024; // 1GB
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const oversizedFiles = newFiles.filter((f) => f.size > MAX_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const oversizedNames = oversizedFiles.map((f) => `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)}MB)`).join(", ");
      alert(`Peringatan: Berkas ${oversizedNames} melebihi batas maksimal 1GB (1024MB).`);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      return;
    }

    newFiles.forEach((file) => {
      if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file) + "#t=0.1";
        setEditedMedia((prev) => [...prev, url]);
      } else {
        const url = URL.createObjectURL(file);
        setEditedMedia((prev) => [...prev, url]);
      }
    });
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const handleCancelEdit = () => {
    if (memory) {
      setEditedTitle(memory.title || "");
      setEditedDate(toInputDateFormat(memory.date) || memory.date || "");
      setEditedLocation(memory.location || "");
      setEditedTags(memory.tags ? [...memory.tags] : []);
      setEditedMedia(memory.images ? [...memory.images] : []);
    }
    setTagError("");
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!memory) return;
    const updated: Memory = {
      ...memory,
      title: editedTitle.trim() || memory.title,
      date: formatDateToLocale(editedDate.trim()) || memory.date,
      location: editedLocation.trim(),
      tags: editedTags,
      images: editedMedia.length > 0 ? editedMedia : memory.images,
    };

    if (onUpdateMemory) {
      onUpdateMemory(updated);
    }
    setIsEditing(false);
  };

  const handleGenerateTags = async () => {
    const targetMedia =
      images.find((url) => !isVideoMedia(url)) ||
      images[0] ||
      (memory?.images && memory.images[0]) ||
      "";
    if (!targetMedia) return;

    try {
      setIsGeneratingTags(true);
      setTagError("");
      const res = await fetch(targetMedia);
      const blob = await res.blob();
      const file = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);
      if (editedLocation.trim()) {
        formData.append("location", editedLocation.trim());
      }

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Gagal menyambung ke AI");
      }

      const data = await response.json();
      if (data.tags && Array.isArray(data.tags)) {
        // CRITICAL LOGIC: Gabungkan tag lama yang sudah diketik dengan tag baru dari AI (append unik)
        setEditedTags((prev) => [...new Set([...prev, ...data.tags])]);
      }
    } catch (err) {
      console.error("Gagal generate tags AI:", err);
      setTagError("Gagal menyambung ke AI (kuota habis).");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // 3. Keyboard Navigation & Shortcuts (ArrowLeft, ArrowRight, Spacebar Play/Pause, F Fullscreen)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika pengguna sedang mengetik di dalam input/textarea/select
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const activeVideo = isFullscreen ? (fullscreenVideoRef.current || videoRef.current) : (videoRef.current || fullscreenVideoRef.current);

      // Navigasi Media (Panah Kiri & Kanan)
      if (e.key === "ArrowRight") {
        handleNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        handlePrev();
        return;
      }

      // Logika Spasi (Play/Pause): Mencegah default browser scroll / button click
      if (e.key === " " || e.code === "Space") {
        if (activeVideo) {
          e.preventDefault();
          if (activeVideo.paused) {
            activeVideo.play();
          } else {
            activeVideo.pause();
          }
        }
        return;
      }

      // Logika tombol 'F' atau 'f' (Toggle Fullscreen)
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (activeVideo) {
          if (!document.fullscreenElement) {
            activeVideo.requestFullscreen().catch((err) => console.log(err));
          } else {
            document.exitFullscreen().catch((err) => console.log(err));
          }
        } else {
          setIsFullscreen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, totalPhotos, isFullscreen]);

  // 4. Auto-Hide Fullscreen Controls (Idle Timer 2.5s)
  useEffect(() => {
    if (!isFullscreen) {
      setShowFullscreenControls(true);
      return;
    }

    let timer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      setShowFullscreenControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setShowFullscreenControls(false);
      }, 2500);
    };

    const handleMouseLeave = () => {
      clearTimeout(timer);
      setShowFullscreenControls(false);
    };

    // Mulai timer awal saat fullscreen dibuka
    resetIdleTimer();

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("mousedown", resetIdleTimer);
    window.addEventListener("touchstart", resetIdleTimer);
    window.addEventListener("keydown", resetIdleTimer);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("mousedown", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isFullscreen]);

  // 5. Swipe Navigation (Mobile/Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.targetTouches.length > 0) {
      touchStartCoordRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
      isSwipingRef.current = false;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartCoordRef.current || e.changedTouches.length === 0) return;
    const deltaX = touchStartCoordRef.current.x - e.changedTouches[0].clientX;
    const deltaY = touchStartCoordRef.current.y - e.changedTouches[0].clientY;

    // Threshold swipe horizontal: lebih dari 50px dan gerakan horizontal lebih dominan daripada vertikal
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwipingRef.current = true;
      if (deltaX > 50) {
        // Usap ke kiri -> Foto berikutnya
        handleNext();
      } else {
        // Usap ke kanan -> Foto sebelumnya
        handlePrev();
      }
    }

    touchStartCoordRef.current = null;
    // Beri jeda 200ms agar event click sintetis browser setelah touchend tidak memicu toggle UI
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 200);
  };

  // Hapus 1 Foto: buka custom dialog konfirmasi
  const handleDeleteCurrentPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, type: "media", targetIndex: currentImgIndex });
  };

  // Hapus Seluruh Kenangan: buka custom dialog konfirmasi
  const handleDeleteEntireMemory = () => {
    setDeleteConfirm({ isOpen: true, type: "memory" });
  };

  // Eksekusi Hapus dari Custom Dialog
  const executeDelete = () => {
    if (!memory) return;

    if (deleteConfirm.type === "media") {
      const targetIdx =
        deleteConfirm.targetIndex !== undefined
          ? deleteConfirm.targetIndex
          : currentImgIndex;
      if (totalPhotos <= 1) {
        onDeleteMemory(memory.id);
        onClose();
      } else {
        onDeletePhoto(memory.id, targetIdx);
        if (targetIdx >= totalPhotos - 1) {
          setCurrentImgIndex(Math.max(0, totalPhotos - 2));
        }
      }
    } else if (deleteConfirm.type === "memory") {
      onDeleteMemory(memory.id);
      onClose();
    }

    setDeleteConfirm({ isOpen: false, type: null });
  };

  if (!isOpen || !memory) return null;

  return (
    <>
      {/* Modal Dialog Utama */}
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <div className="relative w-full max-w-lg md:max-w-4xl lg:max-w-5xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto animate-fadeIn flex flex-col md:flex-row items-stretch md:h-[620px] max-h-[92vh] p-0">
          {/* Tombol Tutup (X) Melayang Modern */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 bg-black/40 hover:bg-black/60 md:bg-white text-white md:text-slate-600 rounded-full p-2 backdrop-blur-sm transition-colors duration-200 hover:bg-gray-200 hover:text-gray-900 cursor-pointer shadow-sm md:border md:border-gray-200"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Hidden File Input untuk Mode Edit */}
          <input
            type="file"
            ref={editFileInputRef}
            multiple
            accept="image/*,video/mp4,video/webm"
            onChange={handleEditMediaUpload}
            className="hidden"
          />

          {/* SISI KIRI: Area Media Utama (Premium Blurred Backdrop, md:w-[60%]) */}
          <div
            onClick={() => {
              if (isSwipingRef.current) return;
              setShowControls((prev) => !prev);
            }}
            className="group relative w-full md:w-[60%] h-full min-h-full self-stretch bg-gray-900 flex items-center justify-center overflow-hidden select-none cursor-pointer shrink-0 p-0 m-0"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Gambar Latar (Efek Blur Glassmorphism) */}
            {currentPhoto && (
              isVideoMedia(currentPhoto) ? (
                <video
                  src={getVideoSrc(currentPhoto)}
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                />
              ) : (
                <img
                  src={currentPhoto}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110 pointer-events-none select-none"
                />
              )
            )}

            {/* Media Utama (Utuh): Video atau Gambar */}
            {currentPhoto ? (
              <div
                className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden p-0 m-0"
              >
                {isVideoMedia(currentPhoto) ? (
                  <video
                    ref={videoRef}
                    src={getVideoSrc(currentPhoto)}
                    controls
                    preload="metadata"
                    playsInline
                    className="relative z-10 w-full h-full max-h-full object-contain block"
                  />
                ) : (
                  <img
                    src={currentPhoto}
                    alt={`${isEditing ? editedTitle : memory.title} - Media ${currentImgIndex + 1}`}
                    onClick={(e) => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        e.stopPropagation();
                        setIsFullscreen(true);
                      }
                    }}
                    className="relative z-10 w-full h-full max-h-full object-contain block cursor-pointer hover:opacity-95"
                    title={typeof window !== "undefined" && window.innerWidth >= 768 ? "Klik untuk membuka Fullscreen" : undefined}
                  />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm py-16 gap-2">
                <span>Tidak ada media</span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium cursor-pointer"
                  >
                    Unggah Media
                  </button>
                )}
              </div>
            )}

            {/* Tombol Hapus 1 Foto/Media: Pojok kiri bawah */}
            {!isEditing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCurrentPhoto(e);
                }}
                className={`absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-black/50 hover:bg-red-500/90 text-white p-2 rounded-full backdrop-blur-xs shadow-md z-20 cursor-pointer transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-0 pointer-events-none md:pointer-events-auto"
                } md:opacity-0 md:group-hover:opacity-100`}
                title="Hapus media ini"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Tombol Fullscreen / Expand: Pojok kiri atas */}
            {!isVideoMedia(currentPhoto) && currentPhoto && !isEditing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(true);
                }}
                className={`absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-xs shadow-md z-20 cursor-pointer transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-0 pointer-events-none md:pointer-events-auto"
                } md:opacity-0 md:group-hover:opacity-100`}
                title="Tampilkan Layar Penuh"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {/* Panah Navigasi Carousel (<, >): Disembunyikan di Mobile, Muncul di Desktop */}
            {totalPhotos > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev(e);
                  }}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white backdrop-blur-xs shadow-md z-20 cursor-pointer transition-opacity duration-300 hidden md:flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
                  title="Media sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white backdrop-blur-xs shadow-md z-20 cursor-pointer transition-opacity duration-300 hidden md:flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
                  title="Media berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Indikator Media: Tengah bawah */}
                <div
                  className={`absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[11px] sm:text-xs px-3 py-1 rounded-full backdrop-blur-xs pointer-events-none z-20 shadow-sm transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                  } md:opacity-0 md:group-hover:opacity-100`}
                >
                  {currentImgIndex + 1} / {totalPhotos}
                </div>
              </>
            )}
          </div>

          {/* SISI KANAN: Panel Info & Detail (iOS Card Grouping & Sticky Footer) */}
          <div className="w-full md:w-[40%] h-auto md:h-full flex flex-col bg-slate-100 min-h-0 overflow-hidden">
            {/* Scrollable Content: Header, Thumbnails, Card Info */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 pr-12 md:pr-14 flex flex-col gap-5 min-h-0">
              {/* Header Area: Tanggal & Judul dengan Garis Pemisah Halus */}
              {isEditing ? (
                <div className="border-b border-gray-200 pb-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">
                      Judul Kenangan
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Judul Kenangan"
                      className="w-full text-base sm:text-lg font-bold text-slate-900 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={toInputDateFormat(editedDate)}
                      max={maxDateString}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && val > maxDateString) {
                          setEditedDate(maxDateString);
                        } else {
                          setEditedDate(val);
                        }
                      }}
                      className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2 outline-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{memory.date}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug break-words">
                    {memory.title}
                  </h2>
                </div>
              )}

              {/* Barisan Thumbnails (Film Strip) */}
              {(totalPhotos > 1 || isEditing) && (
                <div>
                  <div className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">
                    Media Koleksi ({totalPhotos})
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto p-1 py-1.5 scrollbar-thin items-center -mx-1">
                    {images.map((imgUrl, idx) => {
                      const isVideo = isVideoMedia(imgUrl);
                      const isActive = idx === currentImgIndex;
                      return (
                        <div key={idx} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setCurrentImgIndex(idx)}
                            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all block ${
                              isActive
                                ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100 opacity-100 shadow-md"
                                : "border border-slate-200 bg-white opacity-60 hover:opacity-100 hover:scale-102 cursor-pointer"
                            }`}
                          >
                            {isVideo ? (
                              <video
                                src={getVideoSrc(imgUrl)}
                                preload="metadata"
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={imgUrl}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/60 rounded-full p-1 text-white">
                                  <Play className="w-2.5 h-2.5 fill-current translate-x-0.5" />
                                </div>
                              </div>
                            )}
                          </button>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditedMedia((prev) => prev.filter((_, i) => i !== idx));
                                if (currentImgIndex >= totalPhotos - 1) {
                                  setCurrentImgIndex(Math.max(0, totalPhotos - 2));
                                }
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px] shadow-sm z-20 cursor-pointer"
                              title="Hapus media ini"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition shrink-0 cursor-pointer"
                        title="Tambah media lainnya"
                      >
                        <Plus className="w-4 h-4 mb-0.5" />
                        <span className="text-[10px] font-semibold">+ Media</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Card Grouping (Kotak Putih Kontras iOS Style untuk Lokasi & Tags) */}
              {isEditing ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  {/* Edit Lokasi */}
                  <div>
                    <div className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">
                      Lokasi
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 focus-within:bg-white transition-all">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        placeholder="Contoh: Bali, Kafe Merdeka"
                        className="bg-transparent outline-none w-full ml-2 text-sm text-slate-800 placeholder-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  {/* Edit Tags */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">
                      Tags & Kategori
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 focus-within:bg-white transition-all w-full min-h-[44px] gap-1.5">
                      <Hash className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
                      {editedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-md text-xs font-medium"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => setEditedTags(editedTags.filter((_, i) => i !== idx))}
                            className="text-blue-400 hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const clean = newTagInput.trim().toLowerCase().replace(/^#+/, "");
                            if (clean && !editedTags.includes(clean)) {
                              setEditedTags([...editedTags, clean]);
                              setNewTagInput("");
                            }
                          }
                        }}
                        placeholder="Tambah tag..."
                        className="bg-transparent outline-none flex-grow min-w-[100px] text-xs sm:text-sm text-slate-700 placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateTags}
                        disabled={isGeneratingTags}
                        className={`flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-[11px] sm:text-xs px-2.5 py-1 rounded-full font-medium transition-colors ml-auto ${
                          isGeneratingTags ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        {isGeneratingTags ? "Memproses..." : "✨ Auto-Tag"}
                      </button>
                    </div>
                    {tagError && <p className="text-xs text-red-500 mt-1">{tagError}</p>}
                  </div>
                </div>
              ) : (
                (memory.location || (memory.tags && memory.tags.length > 0)) && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                    {/* Lokasi */}
                    {memory.location && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{memory.location}</span>
                      </div>
                    )}

                    {/* Pembatas jika lokasi dan tags sama-sama ada */}
                    {memory.location && memory.tags && memory.tags.length > 0 && (
                      <div className="border-t border-gray-100" />
                    )}

                    {/* Tags & Kategori */}
                    {memory.tags && memory.tags.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">
                          Tags & Kategori
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {memory.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center bg-blue-50/80 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-medium tracking-tight transition-colors duration-200 hover:bg-blue-100 cursor-default"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Area Tombol Bawah (Sticky Footer Solid & Bayangan Atas) */}
            <div className="mt-auto bg-white p-4 sm:p-5 border-t border-gray-200 shadow-sm flex justify-between items-center shrink-0">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleDeleteEntireMemory}
                    className="text-red-600 px-3 py-2 rounded-xl transition-colors duration-200 hover:bg-red-50 hover:text-red-600 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Hapus kenangan ini"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="bg-blue-600 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Edit Kenangan</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Fullscreen / Premium Lightbox */}
      {isFullscreen && (
        <div
          onClick={() => {
            if (isSwipingRef.current) return;
            setShowFullscreenControls((prev) => !prev);
          }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none animate-fadeIn overflow-hidden cursor-default"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Controls Overlay Wrapper with Auto-Hide Transition */}
          <div
            className={`absolute inset-0 z-50 transition-opacity duration-300 pointer-events-none ${
              showFullscreenControls ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Top Vignette Gradient */}
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

            {/* Bottom Vignette Gradient */}
            <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {/* Indikator Angka (4/4): Kunci di Bawah Tengah Layar */}
            {totalPhotos > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-white text-sm z-50 tracking-widest pointer-events-none shadow-md">
                {currentImgIndex + 1} / {totalPhotos}
              </div>
            )}

            {/* Tombol Close (X): Kunci di Pojok Kanan Atas Layar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(false);
              }}
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/75 rounded-full text-white p-2.5 backdrop-blur-sm transition-colors cursor-pointer pointer-events-auto shadow-lg"
              title="Tutup Layar Penuh"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigasi Panah Kiri & Kanan: Disembunyikan di Mobile, Muncul di Desktop */}
            {totalPhotos > 1 && (
              <>
                {/* Tombol Panah Kiri */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev(e);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/75 rounded-full p-2.5 sm:p-3 text-white backdrop-blur-sm transition-colors cursor-pointer pointer-events-auto shadow-lg hidden md:flex items-center justify-center"
                  title="Media sebelumnya"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                {/* Tombol Panah Kanan */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/75 rounded-full p-2.5 sm:p-3 text-white backdrop-blur-sm transition-colors cursor-pointer pointer-events-auto shadow-lg hidden md:flex items-center justify-center"
                  title="Media berikutnya"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </>
            )}
          </div>

          {/* Media Utuh (Object Contain Terjaga Sempurna) */}
          {isVideoMedia(currentPhoto) ? (
            <video
              ref={fullscreenVideoRef}
              src={getVideoSrc(currentPhoto)}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-screen object-contain select-none relative z-10"
            />
          ) : (
            <img
              src={currentPhoto}
              alt={memory.title}
              className="max-w-full max-h-screen object-contain select-none relative z-10"
            />
          )}
        </div>
      )}

      {/* Custom Confirmation Modal (Apple-esque Style) */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] mx-4 shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">
              {deleteConfirm.type === "memory" ? "Hapus Kenangan?" : "Hapus Media?"}
            </h3>
            <p className="text-sm text-center text-slate-500 mb-6">
              {deleteConfirm.type === "memory"
                ? "Kenangan ini akan dihapus secara permanen dan tidak dapat dikembalikan."
                : "Foto/video ini akan dihapus dari kenangan ini."}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: null })}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
