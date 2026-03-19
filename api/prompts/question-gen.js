const TOPICS = {
  operasi_hitung: 'Operasi Hitung (penjumlahan, pengurangan, perkalian, pembagian campuran)',
  fpb_kpk: 'FPB dan KPK (faktor persekutuan terbesar, kelipatan persekutuan terkecil)',
  pecahan: 'Pecahan (penjumlahan, pengurangan, perkalian pecahan)',
  desimal_persen: 'Desimal dan Persen (konversi dan operasi hitung)',
  geometri: 'Geometri (luas dan keliling bangun datar)',
  pengukuran: 'Pengukuran (konversi satuan panjang, berat, waktu)'
};

const DIFFICULTY_DESC = {
  mudah: 'mudah (untuk pemula)',
  sedang: 'sedang (untuk latihan rutin)',
  sulit: 'sulit (untuk tantangan)'
};

function buildPrompt(options) {
  const { subject, topic, difficulty, count, grade } = options;
  const topicDesc = TOPICS[topic] || topic;
  const diffDesc = DIFFICULTY_DESC[difficulty] || 'sedang';

  return `Kamu adalah guru Matematika SD yang membuat soal latihan.

TUGAS: Generate ${count} soal ${subject} untuk anak SD Kelas ${grade}.
TOPIK: ${topicDesc}
TINGKAT KESULITAN: ${diffDesc}
FORMAT: Multiple choice, 4 pilihan (A, B, C, D), hanya 1 jawaban benar.
BAHASA: Bahasa Indonesia yang mudah dipahami anak SD.

PERSYARATAN:
1. Soal harus sesuai kurikulum Kelas ${grade}
2. Gunakan angka yang realistis dan tidak terlalu rumit
3. Sertakan soal cerita (word problem) jika memungkinkan
4. Penjelasan singkat (1-2 kalimat) untuk jawaban benar
5. Output dalam format JSON yang valid

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "text": "Berapa hasil dari 2/3 + 1/4?",
      "options": ["11/12", "3/7", "8/12", "5/7"],
      "correct": 0,
      "explanation": "Samakan penyebut: 2/3 = 8/12, 1/4 = 3/12. Jadi 8/12 + 3/12 = 11/12"
    }
  ]
}

Generate ${count} soal sekarang. HANYA output JSON, tanpa text lain.`;
}

module.exports = {
  buildPrompt
};
