"use client";

import React, { useState, useMemo } from "react";
import { MEMORIES, Memory } from "@/data/memories";
import MemoryCard from "@/components/MemoryCard";
import AddMemoryModal from "@/components/AddMemoryModal";
import MemoryDetailModal from "@/components/MemoryDetailModal";
import {
  Search,
  Plus,
  Sparkles,
  Camera,
  Layers,
  Heart,
  SlidersHorizontal,
  X,
} from "lucide-react";

export default function Home() {
  // State data utama memori (diinisialisasi dari MEMORIES dengan tipe images: string[])
  const [memories, setMemories] = useState<Memory[]>(MEMORIES);

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
  const handleAddMemory = (newMemData: Omit<Memory, "id">) => {
    const newId = memories.length > 0 ? Math.max(...memories.map((m) => m.id)) + 1 : 1;
    const newMemory: Memory = {
      id: newId,
      ...newMemData,
    };
    setMemories([newMemory, ...memories]);
  };

  // Handler: Hapus Seluruh Kenangan
  const handleDeleteMemory = (memoryId: number) => {
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    if (selectedMemory?.id === memoryId) {
      setSelectedMemory(null);
    }
  };

  // Handler: Hapus Hanya 1 Foto Tertentu dari Array images
  const handleDeletePhoto = (memoryId: number, photoIndex: number) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id === memoryId) {
          const updatedImages = m.images.filter((_, idx) => idx !== photoIndex);
          return { ...m, images: updatedImages };
        }
        return m;
      })
    );

    setSelectedMemory((prev) => {
      if (!prev || prev.id !== memoryId) return prev;
      const updatedImages = prev.images.filter((_, idx) => idx !== photoIndex);
      return { ...prev, images: updatedImages };
    });
  };

  // Handler: Update / Edit Data Kenangan
  const handleUpdateMemory = (updatedMemory: Memory) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === updatedMemory.id ? updatedMemory : m))
    );
    setSelectedMemory(updatedMemory);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* ============================================================
          TOP NAVIGATION BAR
          ============================================================ */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Logo & Judul Aplikasi */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-900 text-base tracking-tight">MemoriAI</h1>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                  Agent
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Tambah Kenangan (Biru Solid Elegan) */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all transform hover:-translate-y-0.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kenangan</span>
          </button>
        </div>
      </header>

      {/* ============================================================
          HERO & SEARCH SECTION
          ============================================================ */}
      <section className="bg-gradient-to-b from-blue-50/40 via-white to-slate-50 border-b border-slate-200/60 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200/50 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Retrieval Cerdas Berbasis Visi & Teks</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800 mb-2 md:whitespace-nowrap">
            Temukan Foto Kenangan dalam Sekejap
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-4xl mx-auto leading-relaxed mb-8 md:whitespace-nowrap">
            Cari momen masa lalu secara natural dengan kata kunci objek, lokasi, warna baju, atau suasana.
          </p>

          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Coba: 'sunset bali', 'baju hitam', 'wisuda', 'gunung'..."
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-300/80 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base text-slate-900 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
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
      </div>

      {/* ============================================================
          MAIN GALLERY GRID
          ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex-1 w-full">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
    </div>
  );
}
