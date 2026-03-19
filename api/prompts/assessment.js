function buildPrompt(options) {
  const { subject, grade, topics } = options;

  const topicList = topics && topics.length > 0
    ? topics.join(', ')
    : 'semua topik dasar';

  return `Kamu adalah guru Matematika SD yang membuat soal assessment diagnostik.

TUGAS: Generate 15 soal assessment untuk anak SD Kelas ${grade}.
MATA PELAJARAN: ${subject}
TOPIK: ${topicList}
TUJUAN: Menilai kemampuan anak di berbagai tingkat kesulitan (mudah, sedang, sulit).

DISTRIBUSI:
- 5 soal mudah (konsep dasar)
- 7 soal sedang (aplikasi konsep)
- 3 soal sulit (pemecahan masalah)

FORMAT: Multiple choice, 4 pilihan, 1 jawaban benar.
BAHASA: Bahasa Indonesia sederhana.

PERSYARATAN:
1. Cover berbagai topik untuk assessment menyeluruh
2. Mix soal hitung langsung dan soal cerita
3. Penjelasan singkat untuk setiap jawaban
4. Tandai tingkat kesulitan di metadata

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "text": "Soal di sini",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Penjelasan singkat",
      "topic": "nama_topik",
      "difficulty": "mudah/sedang/sulit"
    }
  ]
}

Generate 15 soal sekarang. HANYA output JSON.`;
}

module.exports = {
  buildPrompt
};
