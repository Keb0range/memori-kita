// ============================================================
// API ROUTE: /api/analyze-image
// File ini berjalan di SERVER (Node.js), bukan di browser.
// Tugasnya: menerima file gambar dari frontend, kirim ke
// Gemini Vision API, kembalikan tags hasil analisis AI.
//
// Menggunakan Next.js App Router Route Handler pattern.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Inisialisasi Gemini client menggunakan API key dari .env.local
// process.env hanya bisa diakses di server — aman dari eksposur ke browser
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // STEP 1: Baca file gambar dari FormData yang dikirim frontend
    // FormData dipakai karena kita mengirim file binary, bukan JSON
    // ============================================================
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const lokasi = (formData.get("location") || formData.get("lokasi")) as string | null;

    // Validasi: pastikan field "image" ada dan berisi file
    if (!imageFile) {
      return NextResponse.json(
        { error: "Field 'image' tidak ditemukan di request." },
        { status: 400 }
      );
    }

    // Validasi tipe file: hanya terima gambar
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File yang dikirim bukan gambar." },
        { status: 400 }
      );
    }

    // ============================================================
    // STEP 2: Konversi File → Base64
    // Gemini API membutuhkan gambar dalam format Base64 string,
    // bukan raw binary atau URL. Prosesnya:
    //   File → ArrayBuffer → Buffer (Node.js) → Base64 string
    // ============================================================
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image  = Buffer.from(arrayBuffer).toString("base64");

    // ============================================================
    // STEP 3: Kirim ke Gemini Vision API
    // Model gemini-3.8-flash dipilih karena:
    //   - Mendukung multimodal (teks + gambar) 
    //   - Cepat dan hemat kuota untuk tugas klasifikasi
    //   - Memberikan hasil yang konsisten untuk format terstruktur
    // ============================================================
    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          parts: [
            // Part 1: Gambar dalam format inline data Base64
            {
              inlineData: {
                mimeType: imageFile.type,   // Contoh: "image/jpeg", "image/png"
                data: base64Image,
              },
            },
            // Part 2: Instruksi teks untuk AI
            {
              text: `Kamu adalah AI pembuat tag cerdas untuk galeri foto. Lokasi foto: '${lokasi || "Tidak disebutkan"}'. Analisis gambar dan hasilkan maksimal 7 tag dengan aturan WAJIB berikut:

1. Tag Entitas Lokasi: Jika lokasi disebutkan, ekstrak nama brand/tempat utama menjadi satu tag (contoh: dari 'Mixue Pleret' jadikan 'mixue').

2. Tag Pakaian & Gender (KONDISIONAL):

- Jika HANYA ADA 1 ORANG (cewe/cowo): gunakan format 'baju-[warna]' (contoh: 'baju-orange'). Jangan sebut gender.

- Jika ADA 2 ORANG GENDER SAMA (cowo-cowo / cewe-cewe): gunakan format 'baju-[warna],baju-[warna]' (contoh: 'baju-hitam,baju-putih'). Jangan sebut gender.

- Jika ADA 2 ORANG BEDA GENDER (cowo & cewe): WAJIB gabungkan gender dan warna dengan format 'cowo-baju-[warna],cewe-baju-[warna]' (contoh: 'cowo-baju-hitam,cewe-baju-pink').

- Jika LEBIH DARI 2 ORANG: sebutkan saja warna-warna dominan 'baju-[warna]'.

3. Tag Makanan/Objek Konkret: Jika ada makanan/minuman, sebutkan nama spesifiknya (contoh: 'es-krim', 'kopi'). Jika tidak ada, sebutkan objek benda mati dominan. HINDARI tag suasana abstrak.

Format Output: HANYA berikan kata-kata yang dipisahkan oleh koma. Huruf kecil semua, tanpa spasi setelah koma, tanpa hashtag (#), dan tanpa kalimat penjelasan.`,
            },
          ],
        },
      ],
    });

    // ============================================================
    // STEP 4: Parse respons dari Gemini
    // Ambil teks mentah dari respons, bersihkan, ubah ke array
    // ============================================================
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Bersihkan teks: hilangkan spasi ekstra, tanda pagar, dan baris baru
    const tags = rawText
      .split(",")
      .map((tag: string) =>
        tag
          .trim()
          .toLowerCase()
          .replace(/^#+/, "")      // Hapus tanda # di awal jika ada
          .replace(/\s+/g, "-")   // Ganti spasi dengan tanda hubung
          .replace(/[^a-z0-9\-]/g, "") // Hapus karakter non-alphanumeric kecuali -
      )
      .filter((tag: string) => tag.length > 0)
      .slice(0, 7); // Maksimal 7 tags

    // Jika AI tidak menghasilkan tags yang valid, kembalikan array kosong
    if (tags.length === 0) {
      return NextResponse.json({ tags: [] });
    }

    // Kembalikan tags sebagai array JSON ke frontend
    return NextResponse.json({ tags });

  } catch (error: any) {
    // ============================================================
    // ERROR HANDLING: Tangkap semua error dan kembalikan ke frontend
    // ============================================================
    console.error("[analyze-image] Error:", error);

    // Tangani kuota habis (429 Rate Limit) secara ramah
    const isQuotaExceeded =
      error?.status === 429 ||
      error?.message?.includes("Quota exceeded") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.message?.includes("rate limit");

    if (isQuotaExceeded) {
      return NextResponse.json(
        { error: "Gagal menganalisis gambar (kuota API habis). Silakan isi tag secara manual." },
        { status: 429 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal.";

    return NextResponse.json(
      { error: `Gagal menganalisis gambar: ${message}. Silakan isi tag secara manual.` },
      { status: 500 }
    );
  }
}
