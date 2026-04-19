'use strict';
/**
 * Seed ChromaDB druygon_curriculum collection with Pekan 11 curriculum
 * Run: node /opt/druygon/api/scripts/seed_curriculum.js
 */

require('dotenv').config({ path: '/opt/druygon/api/.env' });

const CHROMA_BASE = 'http://localhost:32769';
const OLLAMA_BASE = 'http://localhost:11434';
const TENANT = 'default_tenant';
const DATABASE = 'druygon_db';
const COLLECTION_NAME = 'druygon_curriculum';

async function getCollectionId() {
  const res = await fetch(`${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${COLLECTION_NAME}`);
  const data = await res.json();
  return data.id;
}

async function getEmbedding(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text })
  });
  const data = await res.json();
  return data.embedding;
}

async function addDocs(collectionId, docs) {
  const embeddings = [];
  for (const doc of docs) {
    process.stdout.write(`  Embedding: ${doc.id}... `);
    const emb = await getEmbedding(doc.document);
    embeddings.push(emb);
    console.log('ok');
  }
  const body = {
    ids: docs.map(d => d.id),
    embeddings,
    documents: docs.map(d => d.document),
    metadatas: docs.map(d => d.metadata)
  };
  const res = await fetch(
    `${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${collectionId}/add`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const result = await res.text();
  if (!res.ok) throw new Error(`ChromaDB add failed: ${result}`);
}

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM DOCUMENTS — Pekan 11, SD Tara Salvia Kelas 4K
// Source: Kemendikbud Kurikulum Merdeka Kelas 4
// ═══════════════════════════════════════════════════════════════════

const CURRICULUM_DOCS = [

  // ─── MATEMATIKA: PECAHAN SENILAI ─────────────────────────────────
  {
    id: 'mat_p11_01_konsep_dasar',
    document: 'Pecahan senilai adalah dua atau lebih pecahan yang berbeda cara penulisannya tetapi memiliki nilai yang sama persis. Contoh: 1/2 = 2/4 = 3/6 = 4/8. Bayangkan martabak dipotong 2 bagian — ambil 1 potong (1/2). Jika martabak yang sama dipotong 4 — ambil 2 potong (2/4). Jumlah martabak yang dimakan sama! Kata kunci: SAMA NILAI, BEDA CARA TULIS.',
    metadata: { topic_id: 'matematika_pecahan', pekan: 11, subject: 'matematika', subtopic: 'konsep_dasar', difficulty: 'dasar', source: 'kemendikbud_kelas4_kurikulum_merdeka' }
  },
  {
    id: 'mat_p11_02_mencari_senilai',
    document: 'Cara mencari pecahan senilai: kalikan pembilang DAN penyebut dengan angka yang SAMA. Aturan: angka atas dan bawah harus dikerjakan BERSAMA, tidak boleh sendiri-sendiri! Contoh: 1/3 × 2/2 = 2/6 (kalikan semua dengan 2). 1/3 × 3/3 = 3/9 (kalikan semua dengan 3). Analogi: "Angka atas dan bawah adalah sahabat yang selalu pergi bersama — kalau satu dikali 2, yang lain juga dikali 2!"',
    metadata: { topic_id: 'matematika_pecahan', pekan: 11, subject: 'matematika', subtopic: 'mencari_senilai_kali', difficulty: 'dasar', source: 'kemendikbud_kelas4' }
  },
  {
    id: 'mat_p11_03_menyederhanakan',
    document: 'Menyederhanakan pecahan = membagi pembilang DAN penyebut dengan bilangan yang SAMA (harus bisa habis dibagi). Contoh: 4/8 ÷ 4/4 = 1/2 (bagi semua dengan 4). 6/9 ÷ 3/3 = 2/3 (bagi semua dengan 3). Cara cepat: cari FPB (Faktor Persekutuan Terbesar) dari pembilang dan penyebut, lalu gunakan itu untuk membagi. Pecahan paling sederhana = pembilang dan penyebut tidak bisa dibagi lagi dengan angka yang sama.',
    metadata: { topic_id: 'matematika_pecahan', pekan: 11, subject: 'matematika', subtopic: 'menyederhanakan', difficulty: 'menengah', source: 'kemendikbud_kelas4' }
  },
  {
    id: 'mat_p11_04_model_visual',
    document: 'Model visual paling efektif untuk pecahan senilai kelas 4: (1) Batang pecahan/strip: tunjukkan 1/2 dan 2/4 dengan batang sama panjang, arsir bagian yang sama. (2) Garis bilangan: tandai 0, 1/4, 1/2, 3/4, 1 — tunjukkan 2/4 jatuh tepat di titik yang sama dengan 1/2. (3) Kotak cokelat: cokelat 8 kotak, ambil 4 = 4/8 = 1/2. Visual membantu anak MELIHAT kesetaraan sebelum memahami prosedur matematikanya.',
    metadata: { topic_id: 'matematika_pecahan', pekan: 11, subject: 'matematika', subtopic: 'model_visual', difficulty: 'dasar', source: 'kemendikbud_kelas4_pedagogi' }
  },
  {
    id: 'mat_p11_05_misconception',
    document: 'Kesalahan umum siswa kelas 4 tentang pecahan senilai: (1) "1/4 lebih besar dari 1/3 karena 4>3" — KELIRU! Penyebut lebih besar artinya TIAP BAGIAN lebih kecil. Gambarkan pizza dipotong 4 vs dipotong 3 untuk membuktikan. (2) Hanya mengalikan/membagi satu angka — ingatkan "keduanya harus bersama!". (3) Membandingkan pecahan berbeda penyebut tanpa konversi — selalu minta gambar atau garis bilangan dulu.',
    metadata: { topic_id: 'matematika_pecahan', pekan: 11, subject: 'matematika', subtopic: 'misconceptions', difficulty: 'menengah', source: 'riset_pedagogis' }
  },
  {
    id: 'mat_p11_06_soal_latihan',
    document: 'Soal latihan pecahan senilai (fase latihan Draco): MUDAH: "Lengkapi: 1/2 = __/4 = __/6" (jawab: 2/4 dan 3/6). SEDANG: "Sederhanakan 6/8" (jawab: 3/4). SEDANG: "Urutkan dari kecil: 1/2, 2/4, 3/6, 1/4" (jawab: 1/4, lalu ketiga lainnya sama). SULIT: "Dru makan 3/6 pizza, Raka makan 2/4 pizza. Siapa makan lebih banyak?" (jawab: sama — keduanya senilai 1/2). Mulai selalu dari visual/gambar, baru simbol angka.',
    metadata: { topic_id: 'matematika_pecahan', pekan: 11, subject: 'matematika', subtopic: 'soal_latihan', difficulty: 'beragam', source: 'sd_tara_salvia_p11' }
  },

  // ─── BAHASA INDONESIA: CATATAN HARIAN + PUISI ────────────────────
  {
    id: 'bind_p11_01_catatan_harian_komponen',
    document: 'Catatan harian (diary) memiliki 5 komponen wajib: (1) TANGGAL dan TEMPAT di baris pertama contoh "Jakarta, 19 April 2026". (2) PERISTIWA: kejadian utama yang diceritakan — pilih SATU, jangan banyak. (3) WAKTU KEJADIAN: "pagi", "setelah makan siang", "jam 3 sore". (4) LOKASI KEJADIAN: "di lapangan sekolah", "di rumah nenek". (5) PERASAAN/KESAN: "Aku sangat senang karena..." — ini yang membuat catatan terasa personal!',
    metadata: { topic_id: 'bahasa_indonesia_diary', pekan: 11, subject: 'bahasa_indonesia', subtopic: 'catatan_harian_komponen', difficulty: 'dasar', source: 'kemendikbud_kelas4' }
  },
  {
    id: 'bind_p11_02_catatan_harian_struktur',
    document: 'Struktur catatan harian yang baik: PEMBUKAAN — "Hari ini adalah hari yang menyenangkan/tidak terduga/penuh kejutan". URAIAN PERISTIWA — cerita detail dengan kata penghubung: "setelah itu, lalu, kemudian, akhirnya". PENUTUP — perasaan dan refleksi: "Aku sangat senang dan ingin mengulanginya lagi." Target: 80-120 kata, bahasa personal tapi tata bahasa benar. Catatan harian BUKAN laporan — harus ada emosi dan refleksi diri.',
    metadata: { topic_id: 'bahasa_indonesia_diary', pekan: 11, subject: 'bahasa_indonesia', subtopic: 'catatan_harian_struktur', difficulty: 'dasar', source: 'kemendikbud_kelas4' }
  },
  {
    id: 'bind_p11_03_puisi_4_elemen',
    document: 'Membaca nyaring puisi dengan benar membutuhkan 4 elemen: (1) LAFAL — setiap kata diucapkan jelas, pendengar bisa menangkap setiap kata. (2) INTONASI — naik-turun nada sesuai emosi: sedih=nada rendah, gembira=nada tinggi, tanya=nada naik di akhir. (3) TEKANAN — kata-kata penting diucapkan lebih kuat/tegas: "BULAN bersinar TERANG". (4) JEDA — berhenti sesuai tanda baca: titik=jeda panjang, koma=jeda pendek, akhir baris=jeda singkat. Plus: ekspresi wajah sesuai isi puisi.',
    metadata: { topic_id: 'bahasa_indonesia_diary', pekan: 11, subject: 'bahasa_indonesia', subtopic: 'puisi_4_elemen', difficulty: 'dasar', source: 'kemendikbud_kelas4' }
  },
  {
    id: 'bind_p11_04_puisi_latihan',
    document: 'Cara berlatih membaca nyaring puisi secara bertahap: (1) Baca dalam hati dulu, pahami artinya. (2) Tandai tempat jeda dengan garis miring (/). (3) Tandai kata yang perlu ditekankan dengan HURUF KAPITAL. (4) Baca pelan-pelan fokus LAFAL dulu. (5) Baca dengan INTONASI yang sesuai emosi puisi. (6) Tambahkan EKSPRESI wajah dan gestur natural. Kesalahan umum: monoton/datar seperti robot, tidak ada jeda, tidak memahami makna — akibatnya pendengar bosan dan makna tidak tersampaikan.',
    metadata: { topic_id: 'bahasa_indonesia_diary', pekan: 11, subject: 'bahasa_indonesia', subtopic: 'puisi_cara_berlatih', difficulty: 'menengah', source: 'kemendikbud_kelas4' }
  },

  // ─── SAINS: SDA ──────────────────────────────────────────────────
  {
    id: 'sains_p11_01_definisi_jenis',
    document: 'Sumber Daya Alam (SDA) adalah semua yang berasal dari alam dan dimanfaatkan manusia untuk kebutuhan hidup. Dua jenis: (1) SDA TERBARUKAN — dapat pulih kembali dalam waktu manusia jika dikelola baik. Contoh: air (siklus hidrologi), hutan/kayu (bisa ditanam ulang), ikan (berkembang biak), padi/sayuran (musiman), energi matahari/angin/air (tidak habis). (2) SDA TIDAK TERBARUKAN — terbentuk jutaan tahun, sekali pakai praktis tidak bisa diganti. Contoh: minyak bumi, batu bara, gas alam, emas, tembaga, bijih besi.',
    metadata: { topic_id: 'sains_sda', pekan: 11, subject: 'sains', subtopic: 'definisi_jenis', difficulty: 'dasar', source: 'ipas_kemendikbud_kelas4' }
  },
  {
    id: 'sains_p11_02_indonesia_sda',
    document: 'Indonesia adalah negara kaya SDA: TERBARUKAN — hutan tropis terluas ketiga dunia (Kalimantan, Sumatera, Papua), laut dengan ikan dan terumbu karang terkaya, tanah subur hasil vulkanik untuk sawah dan perkebunan, energi air dari sungai-sungai besar. TIDAK TERBARUKAN — minyak bumi (Sumatera, Kalimantan), batu bara (Kalimantan terbesar ke-3 dunia), timah (Bangka Belitung), emas dan tembaga (Papua/Sulawesi), nikel (Sulawesi). Kekayaan SDA ini perlu dijaga agar tidak habis dan tidak merusak alam.',
    metadata: { topic_id: 'sains_sda', pekan: 11, subject: 'sains', subtopic: 'sda_indonesia', difficulty: 'menengah', source: 'ipas_kemendikbud_kelas4' }
  },
  {
    id: 'sains_p11_03_pelestarian',
    document: 'Cara melestarikan SDA: Untuk TERBARUKAN — reboisasi (tanam pohon baru ganti yang ditebang), hemat air dan listrik, tangkap ikan tidak berlebihan, gunakan energi surya/angin gantikan bahan bakar fosil. Untuk TIDAK TERBARUKAN — hemat pemakaian (matikan lampu, kurangi kendaraan bermotor), daur ulang logam dan elektronik, kembangkan energi alternatif. Prinsip 3R: Reduce (kurangi konsumsi dari awal), Reuse (pakai ulang), Recycle (daur ulang). Tugas kinerja: buat infografis tentang 1 SDA pilihan dengan penjelasan manfaat, dampak, dan cara melestarikan.',
    metadata: { topic_id: 'sains_sda', pekan: 11, subject: 'sains', subtopic: 'pelestarian', difficulty: 'menengah', source: 'ipas_kemendikbud_kelas4' }
  },

  // ─── PANCASILA: HAK & KEWAJIBAN ──────────────────────────────────
  {
    id: 'pan_p11_01_hak_kewajiban',
    document: 'Hak adalah sesuatu yang kita TERIMA atau PEROLEH — yang harus dipenuhi oleh orang lain atau lingkungan. Kewajiban adalah sesuatu yang HARUS kita LAKUKAN sebagai tanggung jawab kepada orang lain. Contoh terhadap SDA: HAK — mendapat air bersih, bernafas udara sehat, menikmati keindahan alam, manfaat SDA secara adil. KEWAJIBAN — tidak mencemari air, hemat listrik dan air, tidak buang sampah sembarangan, tidak tebang pohon liar. KUNCI: Hak dan kewajiban tidak bisa dipisahkan — seperti dua sisi koin yang sama!',
    metadata: { topic_id: 'pancasila_sda', pekan: 11, subject: 'pancasila', subtopic: 'definisi_hak_kewajiban', difficulty: 'dasar', source: 'pancasila_kemendikbud_kelas4' }
  },
  {
    id: 'pan_p11_02_pancasila_koneksi',
    document: 'Kaitan Hak dan Kewajiban SDA dengan Pancasila: SILA 1 (Ketuhanan) — alam adalah ciptaan Tuhan, wajib dijaga sebagai amanah. SILA 5 (Keadilan Sosial) — semua warga berhak lingkungan sehat dan manfaat SDA yang adil. Tidak boleh satu kelompok kaya dengan cara merusak alam dan merugikan yang lain. GOTONG ROYONG — melestarikan SDA bukan pekerjaan satu orang. Individu, keluarga, sekolah, masyarakat, pemerintah, perusahaan — semua punya tanggung jawab bersama. Kesalahan umum: "Hanya pemerintah yang bertanggung jawab." — SEMUA punya peran!',
    metadata: { topic_id: 'pancasila_sda', pekan: 11, subject: 'pancasila', subtopic: 'koneksi_pancasila', difficulty: 'menengah', source: 'pancasila_kemendikbud_kelas4' }
  },

  // ─── AGAMA ISLAM: KISAH ASAL MULA SALAT ─────────────────────────
  {
    id: 'agama_p11_01_isra_miraj',
    document: 'Isra Mi\'raj adalah perjalanan luar biasa Nabi Muhammad SAW yang terjadi dalam satu malam. ISRA: perjalanan dari Masjidil Haram di Makkah ke Masjidil Aqsha di Palestina (sangat jauh untuk zaman itu). MI\'RAJ: naik ke Sidratul Muntaha (langit ketujuh) untuk bertemu langsung dengan Allah SWT. Di sinilah Allah memberikan perintah SALAT kepada umat Islam sebagai ibadah wajib. Peristiwa ini menjadi bukti keistimewaan Nabi Muhammad dan bukti kasih sayang Allah kepada umat-Nya.',
    metadata: { topic_id: 'agama_islam_salat', pekan: 11, subject: 'agama_islam', subtopic: 'isra_miraj', difficulty: 'dasar', source: 'pai_kemendikbud_kelas4' }
  },
  {
    id: 'agama_p11_02_linimasa_salat',
    document: 'Linimasa penetapan salat: (1) Allah memerintahkan 50 waktu salat per hari. (2) Nabi Muhammad menerimanya dan hendak kembali ke bumi. (3) Nabi Musa AS menyarankan memohon keringanan karena berat untuk umat manusia. (4) Nabi Muhammad naik-turun berulang kali memohon pengurangan kepada Allah. (5) Akhirnya Allah menetapkan 5 WAKTU salat per hari. (6) Allah memberi kabar gembira: pahalanya tetap setara 50 waktu karena kemurahan-Nya. Ini menunjukkan kasih sayang Allah yang luar biasa kepada umat Islam.',
    metadata: { topic_id: 'agama_islam_salat', pekan: 11, subject: 'agama_islam', subtopic: 'linimasa_perintah_salat', difficulty: 'dasar', source: 'pai_kemendikbud_kelas4' }
  },
  {
    id: 'agama_p11_03_5_waktu_salat',
    document: '5 waktu salat yang diwajibkan beserta waktunya: (1) SUBUH — setelah fajar (cahaya pertama) sampai sebelum matahari terbit. (2) DZUHUR — setelah matahari melewati puncak (condong ke barat) sampai bayangan seukuran benda. (3) ASHAR — setelah Dzuhur sampai sebelum matahari terbenam (waktu keemasan sore). (4) MAGHRIB — setelah matahari terbenam sampai cahaya merah di langit hilang. (5) ISYA — setelah Maghrib sampai tengah malam (atau menjelang Subuh). Salat adalah komunikasi langsung manusia dengan Allah, bukan beban melainkan anugerah.',
    metadata: { topic_id: 'agama_islam_salat', pekan: 11, subject: 'agama_islam', subtopic: '5_waktu_salat', difficulty: 'dasar', source: 'pai_kemendikbud_kelas4' }
  },
  {
    id: 'agama_p11_04_pesan_moral',
    document: 'Pesan moral dari kisah asal mula salat lima waktu: (1) KASIH SAYANG ALLAH — dari 50 waktu menjadi 5, tapi pahala tetap 50 × lipat. Allah tidak ingin memberatkan hamba-Nya. (2) TIDAK MALU MEMOHON — Nabi Muhammad tidak malu bolak-balik memohon keringanan untuk umatnya. Ini mengajarkan kita untuk terus berdoa dan memohon kepada Allah. (3) SALAT SEBAGAI ANUGERAH — bukan hukuman atau beban, melainkan kesempatan berbicara langsung dengan Tuhan. (4) PENGHARGAAN TERHADAP SALAT — mengetahui sejarahnya membuat salat terasa lebih bermakna dan berharga.',
    metadata: { topic_id: 'agama_islam_salat', pekan: 11, subject: 'agama_islam', subtopic: 'pesan_moral', difficulty: 'menengah', source: 'pai_kemendikbud_kelas4' }
  },

  // ─── BAHASA INGGRIS: ACROSTIC + JOBS ─────────────────────────────
  {
    id: 'bing_p11_01_jobs_vocabulary',
    document: 'Core jobs vocabulary Grade 4 (Pekan 11): Teacher=mengajar anak, Doctor=menolong yang sakit, Nurse=merawat pasien, Farmer=menanam padi/sayur, Chef=memasak di restoran, Police Officer=jaga keamanan, Firefighter=padamkan api, Artist=membuat karya seni, Engineer=merancang mesin/alat, Architect=desain bangunan, Pilot=terbang pesawat, Astronaut=pergi ke luar angkasa, Scientist=penelitian eksperimen, Writer=menulis buku, Singer=bernyanyi. Kalimat: "A [job] [verb] [object]." Contoh: "A doctor helps sick people." "A pilot flies airplanes."',
    metadata: { topic_id: 'bahasa_inggris_jobs', pekan: 11, subject: 'bahasa_inggris', subtopic: 'jobs_vocabulary', difficulty: 'dasar', source: 'my_next_words_kemendikbud_kelas4' }
  },
  {
    id: 'bing_p11_02_acrostic_format',
    document: 'Acrostic poem: puisi di mana huruf PERTAMA setiap baris dibaca dari atas ke bawah membentuk kata tema. Format untuk Grade 4: pilih nama pekerjaan (5-8 huruf), tulis huruf vertikal di kiri, buat kalimat Bahasa Inggris per huruf yang mendeskripsikan pekerjaan. ACROSTIC TIDAK HARUS BERIMA — aturan satu-satunya: huruf pertama setiap baris! Contoh "PILOT": P-Protecting passengers every flight, I-In the sky, they guide the way, L-Landing safely is their skill, O-Opening paths to distant lands, T-Taking us on amazing journeys. Latihan: mulai dengan kata pendek (CAT, SUN, DAD) sebelum nama pekerjaan.',
    metadata: { topic_id: 'bahasa_inggris_jobs', pekan: 11, subject: 'bahasa_inggris', subtopic: 'acrostic_format', difficulty: 'menengah', source: 'my_next_words_kemendikbud_kelas4' }
  },
  {
    id: 'bing_p11_03_dream_job',
    document: 'My Dream Job expressions for Grade 4: "What job do you want?" → "I want to be a [job]." / "My dream job is to be a [job]." / "I want to be a [job] because I like [reason]." Contoh: "I want to be a scientist because I like experiments." "My dream job is to be an artist because I love drawing." Dream job boleh apa saja — astronaut, game developer, superhero — tidak harus realistis! Tugas Pekan 11: (1) Pilih 1 dream job, (2) Buat acrostic poem tentang pekerjaan itu, (3) Tulis 1-2 kalimat alasan, (4) Gambar ilustrasi, (5) Presentasikan dengan pelafalan Inggris yang benar.',
    metadata: { topic_id: 'bahasa_inggris_jobs', pekan: 11, subject: 'bahasa_inggris', subtopic: 'dream_job_expressions', difficulty: 'dasar', source: 'my_next_words_kemendikbud_kelas4' }
  },

  // ─── SBDP: DIORAMA ───────────────────────────────────────────────
  {
    id: 'sbdp_p11_01_diorama_panduan',
    document: 'Diorama adalah karya seni tiga dimensi (3D) yang menggambarkan suatu pemandangan atau ekosistem secara miniatur. Tema Pekan 11: pemanfaatan SDA (hutan, sawah, pantai, sungai, kebun, gunung). Rubrik penilaian 5 kriteria (masing-masing 1-4): (1) PERENCANAAN: alat & bahan lengkap sebelum mulai; (2) KERAPIAN: objek sesuai tema, tertata rapi; (3) MENGGUNTING: potongan presisi, rapi; (4) MEREKAT: lem kuat, tidak berlebihan; (5) MEWARNAI: penuh, minimal 2 warna, konsisten. Skor 4=terbaik: lengkap, detail, penuh usaha. Cara Draco menilai: tanya Dru ceritakan dioramanya, lalu nilai bersama per kriteria.',
    metadata: { topic_id: 'sbdp_diorama', pekan: 11, subject: 'sbdp', subtopic: 'diorama_rubrik', difficulty: 'dasar', source: 'sbdp_kemendikbud_kelas4' }
  }
];

async function main() {
  console.log('=== Druygon Curriculum Seeder — Pekan 11 ===\n');
  
  const collectionId = await getCollectionId();
  console.log(`Collection ID: ${collectionId}`);
  console.log(`Total documents to seed: ${CURRICULUM_DOCS.length}\n`);

  // Group by topic
  const byTopic = {};
  CURRICULUM_DOCS.forEach(d => {
    const t = d.metadata.topic_id;
    if (!byTopic[t]) byTopic[t] = [];
    byTopic[t].push(d);
  });

  for (const [topic, docs] of Object.entries(byTopic)) {
    console.log(`\n[${topic}] — ${docs.length} documents`);
    try {
      await addDocs(collectionId, docs);
      console.log(`  ✓ ${topic} seeded`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`  ~ ${topic} already exists, skipping`);
      } else {
        console.error(`  ✗ ${topic} FAILED:`, err.message);
      }
    }
  }

  console.log('\n=== Seeding complete! ===');
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
