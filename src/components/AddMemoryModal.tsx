"use client";

import React, { useState, useRef } from "react";
import { Memory } from "@/data/memories";
import { X, Upload, Sparkles, Loader2, Plus, Play, Hash, MapPin, AlertCircle } from "lucide-react";

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMemory: (
    memory: Omit<Memory, "id">,
    onProgress?: (current: number, total: number, percent: number) => void
  ) => Promise<void> | void;
}

const MAX_DATE = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

const isVideoMedia = (url: string, file?: File) => {
  if (file && file.type) {
    return file.type.startsWith("video");
  }
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

const formatDateToLocale = (dateStr: string) => {
  if (!dateStr) {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
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

export default function AddMemoryModal({
  isOpen,
  onClose,
  onAddMemory,
}: AddMemoryModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(MAX_DATE);
  const [location, setLocation] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Multi-Upload File Selection (Foto & Video) - Synchronous order preservation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    const MAX_SIZE_MB = 1024; // Batas dinaikkan menjadi 1GB
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    // Client-Side Size Validation: Cek apakah ada file > 1GB
    const oversizedFiles = newFiles.filter((f) => f.size > MAX_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const oversizedNames = oversizedFiles.map((f) => `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)}MB)`).join(", ");
      alert(`Peringatan: Berkas ${oversizedNames} melebihi batas maksimal 1GB (1024MB). Mohon pilih berkas yang lebih kecil.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const newUrls = newFiles.map((file) => {
      if (file.type.startsWith("video/")) {
        return URL.createObjectURL(file) + "#t=0.1";
      }
      return URL.createObjectURL(file);
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Batalkan/hapus foto tertentu dari antrean upload
  const handleRemovePhoto = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Efisiensi AI: HANYA kirimkan gambar pertama ke API Gemini
  const handleGenerateTagsWithAI = async () => {
    if (selectedFiles.length === 0) {
      setAiError("Pilih minimal satu media terlebih dahulu.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setAiError(null);

      // Ambil file gambar pertama untuk analisis Gemini Vision (dengan fallback ekstensi)
      const imageToAnalyze = selectedFiles.find(
        (f) =>
          f.type.startsWith("image/") ||
          /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(f.name || "") ||
          (!f.type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(f.name || ""))
      );
      if (!imageToAnalyze) {
        setAiError("Auto-Tag hanya mendukung analisis file foto/gambar. Silakan pilih foto terlebih dahulu.");
        return;
      }

      const formData = new FormData();
      formData.append("image", imageToAnalyze, imageToAnalyze.name || "image.jpg");
      if (location.trim()) {
        formData.append("location", location.trim());
      }

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 429 ||
          data.error?.toLowerCase().includes("kuota") ||
          data.error?.toLowerCase().includes("quota")
        ) {
          throw new Error("Gagal menganalisis gambar (kuota API habis). Silakan isi tag secara manual.");
        }
        throw new Error(data.error || "Gagal menganalisis gambar. Silakan isi tag secara manual.");
      }

      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        setTags((prev) => Array.from(new Set([...prev, ...data.tags])));
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal menganalisis gambar (kuota API habis). Silakan isi tag secara manual.";
      setAiError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fungsionalitas tambah tag murni mengandalkan tombol Enter
  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const cleanTag = newTagInput.trim().toLowerCase().replace(/^#+/, "");
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
        setNewTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim() || previewUrls.length === 0) {
      setSubmitError("Mohon isi judul dan upload minimal satu media kenangan.");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(null);
      const formattedDate = formatDateToLocale(date);

      await onAddMemory(
        {
          title: title.trim(),
          date: formattedDate,
          location: location.trim() || "Tidak ditentukan",
          images: previewUrls,
          tags: tags,
        },
        (current, total, percent) => {
          setUploadProgress({ current, total, percent });
        }
      );

      // Reset Form jika berhasil
      setTitle("");
      setDate(MAX_DATE);
      setLocation("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setTags([]);
      setSubmitError(null);
      setUploadProgress(null);
      onClose();
    } catch (err: any) {
      console.error("Gagal menambahkan kenangan:", err);
      const errorMessage =
        err?.message || "Terjadi kesalahan saat menyimpan kenangan ke database.";
      setSubmitError(`Gagal menyimpan: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-fadeIn">
        {/* Header Modal (Netral & Bersih) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shadow-xs" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Tambah Kenangan Baru</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Notifikasi Error Submit */}
          {submitError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="p-1 hover:bg-red-100 rounded-md text-red-500 hover:text-red-700 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {/* Multi-Upload Area (Foto & Video) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Media Kenangan (Foto & Video) *
              </label>
              {previewUrls.length > 0 && (
                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-md text-xs font-medium">
                  {previewUrls.length} media dipilih
                </span>
              )}
            </div>

            {/* Hidden Input File */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,video/mp4,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Thumbnail Preview Row jika sudah ada media */}
            {previewUrls.length > 0 ? (
              <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 scrollbar-thin">
                {previewUrls.map((url, index) => {
                  const isVideo = isVideoMedia(url, selectedFiles[index]);
                  return (
                    <div
                      key={index}
                      className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900 group"
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Overlay ikon Play jika file adalah video */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 rounded-full p-2 text-white flex items-center justify-center shadow-xs">
                            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Tombol X kecil di setiap thumbnail */}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5 shadow transition z-10 cursor-pointer"
                        title="Batalkan media ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm text-white text-xs text-center py-0.5 font-medium z-10">
                          Sampul
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Tombol Tambah Media */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-100 flex flex-col items-center justify-center text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  title="Tambah media lainnya"
                >
                  <Plus className="w-4 h-4 mb-0.5" />
                  <span className="text-[9px] font-semibold">+ Media</span>
                </button>
              </div>
            ) : (
              /* Dropzone: bg-blue-50/50, border-2 border-dashed border-blue-200 hover:border-blue-400, p-8 */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-50/80 transition cursor-pointer text-center group"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:text-blue-700 transition-all duration-300 mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                  Pilih satu atau beberapa media kenangan
                </p>
                <p className="text-xs text-blue-500/80 mt-1">Foto & Video (PNG, JPG, MP4, WebM)</p>
              </div>
            )}
          </div>

          {/* Soft UI Inputs: Judul Kenangan */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Judul Kenangan *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Sunset di Pantai Kuta"
              className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg p-3 transition-colors text-sm text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* Soft UI Inputs: Lokasi & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Lokasi</label>
              <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2 w-full focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Bali, Kafe Merdeka"
                  className="bg-transparent border-none outline-none flex-1 text-slate-700 placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Tanggal</label>
              <input
                type="date"
                defaultValue={MAX_DATE}
                max={MAX_DATE}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2 w-full transition-all outline-none text-slate-700 text-sm"
              />
            </div>
          </div>

          {/* Tokenized Tag Input with Integrated AI Button */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Tags / Kata Kunci</label>
            <div className="flex flex-wrap items-center bg-slate-50 rounded-lg px-3 py-2 w-full focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all min-h-[44px] gap-1.5">
              <Hash className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
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
                onKeyDown={handleKeyDownTag}
                placeholder={tags.length === 0 ? "Ketik tag lalu tekan Enter..." : "Tambah tag..."}
                className="bg-transparent border-none outline-none flex-1 text-slate-700 min-w-[120px] text-sm p-0 placeholder-slate-400"
              />

              <button
                type="button"
                onClick={handleGenerateTagsWithAI}
                disabled={isAnalyzing}
                className="ml-auto bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 text-indigo-600 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 shadow-xs disabled:opacity-60 cursor-pointer shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <span>✨ Auto-Tag</span>
                )}
              </button>
            </div>

            {/* Relokasi Pesan Error API tepat di bawah kotak input tag */}
            {aiError && (
              <p className="text-xs text-red-500 mt-1">
                {aiError}
              </p>
            )}
          </div>

          {/* Progress Bar Indikator Upload Real-time */}
          {isSubmitting && uploadProgress && (
            <div className="space-y-1.5 pt-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>
                  Mengunggah berkas {uploadProgress.current} dari {uploadProgress.total}
                </span>
                <span className="font-bold text-blue-600">{uploadProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shadow-inner">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${Math.max(5, uploadProgress.percent)}%` }}
                />
              </div>
              <p className="text-[11px] text-amber-600 font-medium text-center">
                Mohon jangan menutup atau memuat ulang halaman hingga proses selesai.
              </p>
            </div>
          )}

          {/* Footer Buttons (Tombol Utama Biru Solid Elegan) */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {uploadProgress && uploadProgress.total > 0
                      ? `Mengunggah... ${uploadProgress.percent}% (${uploadProgress.current}/${uploadProgress.total})`
                      : "Menyimpan ke Cloud..."}
                  </span>
                </>
              ) : (
                <span>Simpan Kenangan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
