"use client";

import React, { useState, useEffect } from "react";
import { Memory } from "@/data/memories";
import { Calendar, MapPin, Layers, Play } from "lucide-react";

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
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Container Foto / Video Sampul (Paksa Tinggi Seragam) */}
      <div className="w-full h-48 sm:h-52 bg-slate-200 relative overflow-hidden shrink-0">
        {isVideoCover ? (
          <div className="relative w-full h-full">
            <video
              src={getVideoSrc(rawCoverImage)}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* Play Badge Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-2.5 text-white shadow-md">
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
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
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Gradient overlay bawah gambar untuk kontras */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Badge Indikator Multi-Foto di pojok KANAN ATAS foto (jika images.length > 1) */}
        {totalPhotos > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full tracking-widest drop-shadow-sm">
            1/{totalPhotos}
          </div>
        )}

        {/* Badge Tanggal di pojok kiri bawah foto */}
        <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-white text-[11px] font-medium drop-shadow-sm">
          <Calendar className="w-3 h-3 text-white/90" />
          <span>{memory.date}</span>
        </div>
      </div>

      {/* Konten & Deskripsi Kartu (Compact Text Area) */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
            {memory.title}
          </h3>
          <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{memory.location}</span>
          </div>
        </div>

        {/* Tag AI Pills */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {memory.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60"
            >
              #{tag}
            </span>
          ))}
          {memory.tags.length > 3 && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium text-slate-400">
              +{memory.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
