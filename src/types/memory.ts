// ============================================================
// DEFINISI TIPE & INTERFACE DATA KENANGAN (MEMORI)
// ============================================================

export interface Memory {
  id: number | string;
  title: string;       // Judul singkat kenangan
  date: string;        // Tanggal kejadian
  location: string;    // Lokasi tempat foto diambil
  images: string[];    // Array URL/Base64 gambar kenangan (Multi-Foto / Video)
  tags: string[];      // AI tags — label yang dipakai untuk filtering
  color?: string;     // Warna aksen kartu (opsional)
  userId?: string;    // ID Pengguna pemilik data kenangan (Firestore UID)
  createdAt?: any;
}
