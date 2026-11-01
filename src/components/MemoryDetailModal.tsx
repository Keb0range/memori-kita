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
  onDeletePhoto: (memoryId: number, photoIndex: number) => void;
  onDeleteMemory: (memoryId: number) => void;
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
  const [showControls, setShowControls] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);

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
    setTouchStart(null);
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
    newFiles.forEach((file) => {
      if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file) + "#t=0.1";
        setEditedMedia((prev) => [...prev, url]);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setEditedMedia((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
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
      setShowControls(true);
      return;
    }

    let timer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    };

    const handleMouseLeave = () => {
      clearTimeout(timer);
      setShowControls(false);
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
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || e.changedTouches.length === 0) return;
    const touchEnd = e.changedTouches[0].clientX;
    const delta = touchStart - touchEnd;

    if (delta > 50) {
      // Geser ke kiri lebih dari 50px -> Next
      handleNext();
    } else if (delta < -50) {
      // Geser ke kanan lebih dari 50px -> Prev
      handlePrev();
    }
    setTouchStart(null);
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
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn flex flex-col max-h-[90vh]">
          {/* Header Bar (Info Bar: Judul & Tanggal Slim / Mode Edit) */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-white shrink-0">
            {isEditing ? (
              <div className="flex flex-col flex-1 pr-4 gap-1.5">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Judul Kenangan"
                  className="text-lg font-semibold tracking-tight text-slate-800 bg-transparent border-transparent hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-1 -ml-1 w-full outline-none transition-all"
                />
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
                  className="text-xs font-medium text-slate-500 bg-transparent border-transparent hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded px-1 -ml-1 w-auto max-w-[150px] inline-block outline-none transition-all"
                />
              </div>
            ) : (
              <div className="flex flex-col items-start justify-center pr-4">
                <h2
                  className="text-lg font-semibold tracking-tight text-slate-800 truncate max-w-[200px] sm:max-w-xs leading-tight"
                  title={memory.title}
                >
                  {memory.title}
                </h2>
                <p className="text-xs font-medium text-slate-500 tracking-wide uppercase leading-tight">
                  {memory.date}
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hidden File Input untuk Mode Edit */}
          <input
            type="file"
            ref={editFileInputRef}
            multiple
            accept="image/*,video/mp4,video/webm"
            onChange={handleEditMediaUpload}
            className="hidden"
          />

          {/* Area Media Utama (Statis Edge-to-Edge di Luar Scroll Container) */}
          <div
            className="group relative w-full shrink-0 bg-slate-100 flex items-center justify-center overflow-hidden select-none h-[40vh] sm:h-[45vh]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Media Utama: Video atau Gambar */}
            {currentPhoto ? (
              <div
                key={currentImgIndex}
                className="w-full h-full flex items-center justify-center overflow-hidden"
              >
                {isVideoMedia(currentPhoto) ? (
                  <video
                    ref={videoRef}
                    src={getVideoSrc(currentPhoto)}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full h-full object-cover animate-in fade-in zoom-in-[0.98] duration-300 ease-out"
                  />
                ) : (
                  <img
                    src={currentPhoto}
                    alt={`${isEditing ? editedTitle : memory.title} - Media ${currentImgIndex + 1}`}
                    onClick={() => setIsFullscreen(true)}
                    className="w-full h-full object-cover animate-in fade-in zoom-in-[0.98] duration-300 ease-out cursor-pointer hover:opacity-95 transition"
                    title="Klik untuk membuka Fullscreen"
                  />
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-sm py-16 flex flex-col items-center gap-2">
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

            {/* Tombol Hapus 1 Foto/Media (Mode Normal): Pojok kiri bawah, muncul saat di-hover */}
            {!isEditing && (
              <button
                type="button"
                onClick={handleDeleteCurrentPhoto}
                className="absolute bottom-3 left-3 bg-black/40 hover:bg-red-500/90 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 cursor-pointer"
                title="Hapus media ini"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Tombol Fullscreen Icon di pojok kanan atas media (untuk gambar) */}
            {!isVideoMedia(currentPhoto) && currentPhoto && !isEditing && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="absolute top-3 right-3 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 cursor-pointer"
                title="Tampilkan Layar Penuh"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {/* Panah Navigasi Carousel (<, >) autohide dengan transition-opacity */}
            {totalPhotos > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 rounded-full p-2 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg z-10 cursor-pointer"
                  title="Media sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 rounded-full p-2 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg z-10 cursor-pointer"
                  title="Media berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Indikator Media: Tengah bawah, autohide, tanpa ikon Layers */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                  {currentImgIndex + 1} / {totalPhotos}
                </div>
              </>
            )}
          </div>

          {/* Container Scrollable Details (Thumbnails + Info Lokasi + Tags) */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col pb-6">

            {/* Rapikan Film Strip (Deretan Thumbnail Kotak Sempurna) */}
            {(totalPhotos > 1 || isEditing) && (
              <div className="flex gap-2.5 px-6 py-2.5 mt-3 mb-2 bg-slate-50/80 border-t border-slate-100 overflow-x-auto scrollbar-thin shrink-0">
                {images.map((imgUrl, idx) => {
                  const isVideo = isVideoMedia(imgUrl);
                  const isActive = idx === currentImgIndex;
                  return (
                    <div key={idx} className="relative shrink-0 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCurrentImgIndex(idx)}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all block ${
                          isActive
                            ? "border-blue-500 scale-105 opacity-100 shadow-sm"
                            : "border-transparent opacity-60 hover:opacity-100 cursor-pointer"
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
                            <div className="bg-black/50 rounded-full p-1.5 text-white flex items-center justify-center">
                              <Play className="w-3 h-3 fill-current translate-x-0.5" />
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
                          className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px] backdrop-blur-sm transition-colors shadow-sm z-20 cursor-pointer"
                          title="Hapus foto ini"
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
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition shrink-0 cursor-pointer"
                    title="Tambah media lainnya"
                  >
                    <Plus className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-semibold">+ Media</span>
                  </button>
                )}
              </div>
            )}

            {/* Area Konten (Lokasi & Tags) */}
            <div className="p-4 pr-4 pt-1">
              {isEditing ? (
                <div className="flex flex-col gap-2.5 mt-2">
                  {/* Input Lokasi */}
                  <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 w-full focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      placeholder="Contoh: Bali, Kafe Merdeka"
                      className="bg-transparent outline-none w-full ml-2 text-sm text-slate-700 placeholder-slate-400"
                    />
                  </div>

                  {/* Input Tags */}
                  <div className="w-full mt-2">
                    <div className="bg-slate-100 rounded-lg p-2 flex flex-wrap items-center focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all w-full min-h-[44px] gap-1.5">
                      <Hash className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      {editedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-medium"
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
                        className="bg-transparent outline-none flex-grow min-w-[120px] text-sm text-slate-700 placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateTags}
                        disabled={isGeneratingTags}
                        className={`flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ml-auto ${
                          isGeneratingTags ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        {isGeneratingTags ? "Sedang memproses..." : "✨ Auto-Tag"}
                      </button>
                    </div>
                    {tagError && <p className="text-xs text-red-500 mt-1">{tagError}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col mt-2">
                  {/* Lokasi */}
                  {memory.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{memory.location}</span>
                    </div>
                  )}

                  {/* Tags (Kata Kunci) tepat di bawah Lokasi */}
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex flex-wrap items-center mt-3 -mb-2">
                      {memory.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-medium mr-2 mb-2"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sekat Footer (Navbar Bawah: Aksi Dinamis) */}
          <div className="flex justify-between items-center bg-slate-50 border-t border-slate-200 p-4 rounded-b-xl mt-auto shrink-0">
            {isEditing ? (
              <>
                {/* Kiri: Tombol Batal */}
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>

                {/* Kanan: Tombol Simpan */}
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              </>
            ) : (
              <>
                {/* Kiri: Tombol Hapus */}
                <button
                  type="button"
                  onClick={handleDeleteEntireMemory}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Seluruh Kenangan Ini</span>
                </button>

                {/* Kanan: Tombol Edit Kenangan */}
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Kenangan</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode Fullscreen / Premium Lightbox */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl select-none animate-fadeIn group overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Controls Overlay Wrapper with Auto-Hide Transition */}
          <div
            className={`absolute inset-0 z-50 transition-opacity duration-500 ease-in-out pointer-events-none ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Top Vignette Gradient */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

            {/* Bottom Vignette Gradient */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

            {/* Indikator Posisi di Fullscreen (Tengah Bawah) */}
            {totalPhotos > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/90 text-sm font-medium tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none z-50">
                {currentImgIndex + 1} / {totalPhotos}
              </div>
            )}

            {/* Tombol Close (Naked Icon - Pojok Kanan Atas Simetris) */}
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 z-50 text-white/80 hover:text-white transition-colors duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] cursor-pointer p-4 pointer-events-auto"
              title="Tutup Layar Penuh"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigasi Panah Kiri & Kanan */}
            {totalPhotos > 1 && (
              <>
                {/* Tombol Panah Kiri */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white transition-colors duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] cursor-pointer p-4 pointer-events-auto"
                  title="Media sebelumnya"
                >
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {/* Tombol Panah Kanan */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white transition-colors duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] cursor-pointer p-4 pointer-events-auto"
                  title="Media berikutnya"
                >
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
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
              className="object-contain max-w-full max-h-full rounded-lg shadow-2xl relative z-10"
            />
          ) : (
            <img
              src={currentPhoto}
              alt={memory.title}
              className="object-contain max-w-full max-h-full rounded-lg shadow-2xl relative z-10"
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
