"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "@/utils/cropImage";
import { getCroppedImg } from "@/utils/cropImage";
import { X, Check } from "lucide-react";

interface HeroCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void | Promise<void>;
}

export default function HeroCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: HeroCropperModalProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleCropAreaChange = useCallback(
    (_croppedArea: Area, currentCroppedAreaPixels: Area) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) return;

    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      // Optimistic: segera tutup modal setelah crop selesai
      onClose();
      // Panggil handler tanpa menahan modal tetap terbuka
      await onCropComplete(croppedImage);
    } catch (err) {
      console.error("Gagal memproses gambar sampul:", err);
      alert("Gagal memproses gambar sampul. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, isProcessing, onCropComplete, onClose]);

  // Dengarkan tombol Enter untuk Terapkan Sampul, dan Escape untuk Batal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleApplyCrop();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleApplyCrop, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <h3 className="text-base font-bold text-white tracking-tight">
            Sesuaikan Sampul Hero
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Area Cropper (Rasio Ultrawide Banner 21:9 Sesuai Kontainer Hero) */}
        <div className="relative w-full h-[40vh] sm:h-[48vh] bg-black overflow-hidden select-none">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={21 / 9}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropAreaChange}
            showGrid={true}
          />
        </div>

        {/* Kontrol Zoom Slider & Tombol Aksi */}
        <div className="p-6 bg-slate-900/95 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            {/* Icon Zoom Out (-) */}
            <svg
              onClick={() => setZoom((prev) => Number(Math.max(1, prev - 0.1).toFixed(1)))}
              className="w-5 h-5 text-slate-400 shrink-0 cursor-pointer hover:text-blue-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
            </svg>
            
            {/* Range Slider */}
            <input 
              type="range" 
              min={1} 
              max={3} 
              step={0.1} 
              value={zoom} 
              onChange={(e) => setZoom(Number(e.target.value))} 
              className="flex-1 accent-blue-500 cursor-pointer" 
            />
            
            {/* Icon Zoom In (+) */}
            <svg
              onClick={() => setZoom((prev) => Number(Math.min(3, prev + 0.1).toFixed(1)))}
              className="w-5 h-5 text-slate-400 shrink-0 cursor-pointer hover:text-blue-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
            </svg>
            
            {/* Zoom Level Indicator */}
            <span className="text-sm text-slate-300 font-medium ml-1 w-8">{Number(zoom).toFixed(1)}x</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-gray-400 font-medium hover:text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? "Memproses..." : "Terapkan Sampul"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
