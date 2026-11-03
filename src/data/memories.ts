// ============================================================
// DATA: Koleksi foto kenangan dummy untuk demonstrasi & fallback offline
// ============================================================

import { Memory } from "@/types/memory";
export type { Memory };

// Array dummy data awal dengan multi-foto untuk demonstrasi fitur carousel
export const MEMORIES: Memory[] = [
  {
    id: 1,
    title: "Sunset di Pantai Kuta",
    date: "12 Juni 2024",
    location: "Bali",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["pantai", "sunset", "bali", "liburan", "alam"],
    color: "from-orange-400 to-pink-500",
  },
  {
    id: 2,
    title: "Ngumpul Bareng Teman",
    date: "20 Juli 2024",
    location: "Kafe Merdeka, Jakarta",
    images: [
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["teman", "kafe", "baju-hitam", "malam", "gathering"],
    color: "from-purple-400 to-indigo-500",
  },
  {
    id: 4,
    title: "Hiking Gunung Rinjani",
    date: "15 September 2024",
    location: "Lombok, NTB",
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["gunung", "hiking", "alam", "petualangan", "baju-hitam"],
    color: "from-green-400 to-teal-500",
  },
  {
    id: 5,
    title: "Ulang Tahun Sahabat",
    date: "3 Oktober 2024",
    location: "Rumah sendiri",
    images: [
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["ulang-tahun", "kue", "teman", "bahagia", "keluarga"],
    color: "from-pink-400 to-rose-500",
  },
  {
    id: 6,
    title: "Jalan-jalan ke Bromo",
    date: "25 Oktober 2024",
    location: "Gunung Bromo, Jawa Timur",
    images: [
      "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1570784332176-fdd73da66f03?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["gunung", "bromo", "alam", "petualangan", "pagi"],
    color: "from-blue-400 to-cyan-500",
  },
  {
    id: 7,
    title: "Dinner Keluarga",
    date: "10 November 2024",
    location: "Restoran Padang",
    images: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["keluarga", "makan", "malam", "formal", "baju-hitam"],
    color: "from-red-400 to-orange-500",
  },
  {
    id: 8,
    title: "Liburan ke Lombok",
    date: "20 Desember 2024",
    location: "Senggigi, Lombok",
    images: [
      "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&auto=format&fit=crop&q=80"
    ],
    tags: ["pantai", "liburan", "lombok", "alam", "biru"],
    color: "from-sky-400 to-blue-500",
  },
];
