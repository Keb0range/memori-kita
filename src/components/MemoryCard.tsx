"use client";

import React, { useState, useEffect } from "react";
import { Memory } from "@/data/memories";
import { Calendar, Play } from "lucide-react";

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400' fill='%23f1f5f9'%3E%3Crect width='600' height='400' fill='%23f8fafc'/%3E%3Ccircle cx='300' cy='170' r='36' fill='%23cbd5e1'/%3E%3Cpath d='M180 300l80-80 60 50 70-70 90 100H180z' fill='%23cbd5e1'/%3E%3Ctext x='50%25' y='345' font-family='sans-serif' font-size='15' font-weight='600' fill='%2394a3b8' text-anchor='middle'%3ETidak Ada Foto Sampul%3C/text%3E%3C/svg%3E";

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

interface MemoryCardProps {
  memory: Memory;
  onClick: () => void;
}

export default function MemoryCard({ memory, onClick }: MemoryCardProps) {
  // Ambil gambar pertama sebagai cover/sampul utama
  const rawCoverImage =
    memory.images && memory.images.length > 0
      ? memory.images[0]
      : FALLBACK_IMAGE;

  const [imgSrc, setImgSrc] = useState<string>(rawCoverImage || FALLBACK_IMAGE);

  useEffect(() => {
    setImgSrc(rawCoverImage || FALLBACK_IMAGE);
  }, [rawCoverImage]);

  const totalPhotos = memory.images ? memory.images.length : 0;
  const isVideoCover = isVideoMedia(rawCoverImage);

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Container Foto / Video Sampul Persegi (Google Photos Square Aspect Ratio) */}
      <div className="w-full aspect-square bg-slate-100 relative overflow-hidden shrink-0">
        {isVideoCover ? (
          <div className="relative w-full h-full">
            <video
              src={getVideoSrc(rawCoverImage)}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full aspect-square object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* Play Badge Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-2 text-white shadow-md">
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={memory.title}
            referrerPolicy="no-referrer"
            onError={() => {
              setImgSrc(FALLBACK_IMAGE);
            }}
            className="w-full h-full aspect-square object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Badge Indikator Multi-Foto di pojok KANAN ATAS foto (jika images.length > 1) */}
        {totalPhotos > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white/95 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full tracking-wider drop-shadow-xs">
            1/{totalPhotos}
          </div>
        )}
      </div>

      {/* Konten Minimalis Tampilan Grid (Judul & Tanggal saja, tanpa Tags & Lokasi) */}
      <div className="p-2 sm:p-2.5 flex flex-col justify-center">
        <h3
          className="font-medium sm:font-semibold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors truncate leading-tight"
          title={memory.title}
        >
          {memory.title}
        </h3>
        <div className="flex items-center gap-1 text-slate-400 text-[10px] sm:text-[11px] mt-1">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{memory.date}</span>
        </div>
      </div>
    </div>
  );
}
