# 📸 MemoriKita (Smart Memory Retrieval Agent)

Aplikasi web modern untuk menyimpan, mengabadikan, dan menelusuri momen/foto kenangan secara instan menggunakan pencarian berbasis kata kunci natural serta tagging otomatis bertenaga **Google Gemini AI Vision**.

---

## ✨ Fitur Utama

- 🔍 **Pencarian Cerdas Multimodal**: Cari kenangan menggunakan bahasa natural (warna pakaian, objek visual, orang, suasana, aktivitas, atau nama lokasi).
- 🤖 **Auto-Tagging dengan Gemini AI**: Ekstraksi tag otomatis langsung dari gambar menggunakan API Google Gemini Vision (`@google/genai`).
- 🖼️ **Multi-Media Support (Foto & Video)**: Unggah banyak foto sekaligus dalam satu kartu kenangan, lengkap dengan pemutar video dan pratinjau thumbnail.
- ✂️ **Interactive Image Cropper**:
  - **Foto Profil / Avatar**: Pemotongan bentuk lingkaran (aspek 1:1) dengan zoom slider.
  - **Sampul Hero Banner**: Pemotongan bentuk landscape lebar (aspek 21:9) agar pas dengan kontainer banner atas.
- 🔐 **Autentikasi Google & Cloud Sync**: Masuk dengan akun Google untuk sinkronisasi data kenangan pribadi ke cloud (Firebase Firestore & Firebase Storage).
- 💬 **Sistem Komentar & Catatan**: Tambahkan dan kelola catatan/komentar di setiap kenangan.
- 📱 **Desain Mobile-First & Responsif**: Tampilan rapi di semua ukuran layar (Mobile, Tablet, Desktop) dengan animasi halus bertenaga Tailwind CSS v4.

---

## 🛠️ Teknologi yang Digunakan

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Library UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **AI Vision**: [Google Gen AI SDK (`@google/genai`)](https://www.npmjs.com/package/@google/genai)
- **Database & Storage**: [Firebase](https://firebase.google.com/) (Auth, Cloud Firestore, Cloud Storage)
- **Kompresi & Crop**: `react-easy-crop` & `browser-image-compression`

---

## 🚀 Panduan Menjalankan Proyek (Setup & Run)

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di komputer lokal Anda:

### 1. Kloning Repositori
```bash
git clone https://github.com/Keb0range/memori-kita.git
cd memori-kita
```

### 2. Pasang Dependensi
Pastikan Anda sudah menginstal **Node.js** (versi 18.x atau yang lebih baru).
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
*(Di Windows PowerShell: `Copy-Item .env.example .env.local`)*

Buka file `.env.local` dan isi nilainya dengan kredensial Anda:

```env
# 1. Google Gemini AI API Key (Dapatkan di https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# 2. Firebase Cloud Configuration (Dapatkan di Firebase Console -> Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Catatan Firebase:**
> - Aktifkan **Authentication** dengan metode *Google Sign-In*.
> - Aktifkan **Cloud Firestore** dan **Firebase Storage** di Firebase Console Anda.

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```

Buka browser Anda dan akses:
```
http://localhost:3000
```

---

## 📂 Struktur Direktori Proyek

```plaintext
memori-kita/
├── src/
│   ├── app/
│   │   ├── api/analyze-image/  # Endpoint backend Gemini AI Vision
│   │   ├── globals.css         # Konfigurasi Tailwind CSS v4
│   │   ├── layout.tsx          # Root Layout HTML
│   │   └── page.tsx            # Halaman utama aplikasi (Gallery, Hero, Search)
│   ├── components/
│   │   ├── AddMemoryModal.tsx     # Modal form tambah kenangan & AI tagging
│   │   ├── AvatarCropperModal.tsx # Modal potong foto profil
│   │   ├── HeroCropperModal.tsx   # Modal potong banner sampul hero
│   │   ├── MemoryCard.tsx         # Komponen kartu kenangan di galeri
│   │   └── MemoryDetailModal.tsx  # Modal detail foto/video, edit, & komentar
│   ├── data/
│   │   └── memories.ts         # Mock data awal untuk demo/fallback offline
│   ├── lib/
│   │   └── firebase.ts         # Inisialisasi Firebase Auth, Firestore, & Storage
│   ├── services/
│   │   └── memoryService.ts    # Logika CRUD Firestore & Firebase Storage
│   ├── types/
│   │   └── memory.ts           # Definisi interface TypeScript (Memory data schema)
│   └── utils/
│       └── cropImage.ts        # Utilitas canvas untuk cropping gambar
├── .env.example                # Template variabel lingkungan
├── package.json
└── tsconfig.json
```

---

## 📦 Perintah yang Tersedia (Scripts)

| Perintah | Keterangan |
| :--- | :--- |
| `npm run dev` | Menjalankan server lokal dalam mode pengembangan. |
| `npm run build` | Melakukan build produksi yang teroptimasi. |
| `npm run start` | Menjalankan aplikasi hasil build produksi. |
| `npm run lint` | Menjalankan pengecekan ESLint. |

---

## 📝 Lisensi
Proyek ini dibuat untuk keperluan akademik dan eksplorasi teknologi AI & Cloud. Bebas dikembangkan lebih lanjut!
