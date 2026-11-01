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

    // Validasi tipe file: terima file ber-tipe image/* atau dengan ekstensi gambar
    const isImage =
      (imageFile.type && imageFile.type.startsWith("image/")) ||
      /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(imageFile.name || "");

    if (!isImage) {
      return NextResponse.json(
        { error: "File yang dikirim bukan gambar/foto." },
        { status: 400 }
      );
    }

    // ============================================================
    // STEP 2: Konversi File → Base64
    // ============================================================
    const arrayBuffer = await imageFile.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "File gambar kosong atau tidak terbaca." },
        { status: 400 }
      );
    }
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType =
      imageFile.type && imageFile.type.startsWith("image/")
        ? imageFile.type
        : "image/jpeg";

    // ============================================================
    // STEP 3: Kirim ke Gemini Vision API
    // Prompt terstruktur untuk Pakaian Bergender, Kerudung, Makanan/Minuman, dan Lokasi
    // ============================================================
    const prompt = `Analisis foto ini secara mendalam untuk ekstraksi tag cerdas:

1. PAKAIAN & GENDER (WAJIB JIKA ADA ORANG DI DALAM FOTO):
   - Jika ada pria/cowok: sebutkan jenis & warna pakaian, format 'cowo-[jenis]-[warna]' (contoh: cowo-baju-mustard, cowo-baju-hitam, cowo-kemeja-putih, cowo-kaos-biru, cowo-celana-jeans, cowo-celana-hitam).
   - Jika ada wanita/cewek: sebutkan jenis & warna pakaian, format 'cewe-[jenis]-[warna]' (contoh: cewe-baju-pink, cewe-baju-putih, cewe-blouse-cream, cewe-celana-putih, cewe-rok-hitam).
   - Hijab/Kerudung (jika dipakai): format 'kerudung-[warna]' (contoh: kerudung-hitam, kerudung-cream, kerudung-cokelat, kerudung-pink).

2. OBJEK (HANYA MAKANAN ATAU MINUMAN):
   - Jika ada makanan atau minuman di foto, sebutkan nama spesifiknya (contoh: es-krim, bakso, es-teh, mie-ayam, kopi, kue, pizza, jus).
   - DILARANG menyebut objek benda mati selain makanan/minuman (abaikan laptop, mobil, sofa, meja, tas, dinding, lantai, dsb).

3. LOKASI:
   - Lokasi foto: '${lokasi && lokasi.trim() ? lokasi.trim() : "Tidak disebutkan"}'.

4. DILARANG:
   - JANGAN buat tag suasana/emosi (bahagia, santai, liburan, seru).
   - JANGAN buat tag perabot atau latar (sofa, meja, kursi, dinding, ruangan).
   - JANGAN buat tag pose foto (selfie, potret, pose).

FORMAT OUTPUT:
HANYA kembalikan kata-kata tag yang dipisahkan oleh tanda koma. Huruf kecil semua (lowercase), tanpa tanda pagar (#), tanpa spasi setelah koma, dan tanpa kalimat pembuka/penjelasan apapun.
Contoh: cowo-baju-mustard,cewe-baju-pink,kerudung-hitam,es-krim`;

    let rawText = "";
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash-preview"];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Image,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });
        rawText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (rawText && rawText.trim().length > 0) {
          break; // Model berhasil menghasilkan respons
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[analyze-image] Model ${model} failed, trying next model:`, err?.message || err);
      }
    }

    if (!rawText && lastError) {
      console.error("[analyze-image] All Gemini models failed:", lastError);
      if (lastError?.status === 429 || lastError?.message?.includes("Quota")) {
        return NextResponse.json(
          { error: "Kuota AI sedang padat, silakan isi tag secara manual." },
          { status: 429 }
        );
      }
    }

    // ============================================================
    // STEP 4: Parse respons & Gabungkan Tag Lokasi Input Pengguna
    // ============================================================
    // 1. Ekstrak Tag Lokasi dari input pengguna secara otomatis
    const locationTags: string[] = [];
    if (lokasi && lokasi.trim()) {
      const cleanParts = lokasi
        .split(/[,/|]+/)
        .map((part) =>
          part
            .trim()
            .toLowerCase()
            .replace(/^#+/, "")
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/g, "")
        )
        .filter((part) => part.length > 1);

      locationTags.push(...cleanParts);
    }

    // 2. Daftar kata/pola terlarang (furnitur, latar, dinding, tulisan, pose, suasana)
    const BANNED_PATTERNS = [
      "sofa", "meja", "kursi", "dinding", "lantai", "atap", "pintu", "jendela",
      "tulisan", "teks", "selfie", "wefie", "pose", "foto", "potret", "kamera",
      "ruangan", "kamar", "indoor", "outdoor", "background", "latar", "dekorasi",
      "suasana", "bahagia", "santai", "liburan", "hangat", "seru", "nostalgia",
      "momen", "indah", "cantik", "estetik", "aesthetic", "vibe"
    ];

    // 3. Bersihkan tag hasil AI
    const aiTags = rawText
      .split(/[,;\n]+/)
      .map((tag: string) =>
        tag
          .trim()
          .toLowerCase()
          .replace(/^#+/, "")
          .replace(/^[-*•\d.]+\s*/, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "")
      )
      .filter((tag: string) => {
        if (tag.length < 2) return false;
        // Tolak jika mengandung kata terlarang
        const isBanned = BANNED_PATTERNS.some((pattern) => tag.includes(pattern));
        return !isBanned;
      });

    // 4. Gabungkan Tag AI (Pakaian & Objek) + Tag Lokasi User (Keduanya harus ada!)
    // Urutkan tag pakaian & objek di depan lalu tag lokasi
    const finalTags = Array.from(new Set([...aiTags, ...locationTags])).slice(0, 8);

    // Jika tidak ada tags sama sekali, kembalikan array kosong
    if (finalTags.length === 0) {
      return NextResponse.json({ tags: [] });
    }

    // Kembalikan tags sebagai array JSON ke frontend
    return NextResponse.json({ tags: finalTags });

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
