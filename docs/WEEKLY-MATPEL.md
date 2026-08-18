# Weekly MATPEL Content Runbook

Alur menambah materi sekolah mingguan Dru (SD Tara Salvia kelas 5, Kurikulum Merdeka) ke region **MATPEL Sekolah** di Study. Materi sumber di-drop Erik per pekan ke `~/Downloads/dru/study-kelas5/Pekan N [...]/` di MacBook.

## Aturan konten (keras)

- **Exclude:** Olahraga (PJOK) dan musik tidak pernah dibuatkan konten.
- **Agama:** hanya materi Agama Islam (Arab + surat pendek sesuai materi pekan). Abaikan Agama Hindu/Kristen dari program mingguan.
- **Grounded:** soal hanya dari program mingguan sekolah, buku paket, atau Kurikulum Merdeka kelas 5. Jangan mengarang fakta di luar sumber. Kalau materi suatu mapel belum ada, catat dan lewati — jangan dipaksakan.
- Konten dibuat **offline + QA**, tidak pernah di-generate live untuk anak.
- Bahasa konten: Bahasa Indonesia; mapel Bahasa Inggris dalam English; PAI memakai istilah Arab yang baku.

## Struktur zone

- Satu zone per topik pekan, id format `matpel_<mapel>_<n>` (`bindo`, `ipas`, `ppkn`, `pai`, `eng`, `seni`).
- `<n>` berlanjut per mapel: zone baru suatu mapel = journey lanjutan (basic → advance) dan otomatis terkunci sampai zone sebelumnya **di mapel yang sama** selesai. Mapel berbeda tidak saling mengunci.
- Tiap zone: 10–15 soal, 3 Pokémon (2 common + 1 rare), `min_level: 1`.
- Label mapel di region map ada di `redesign/app/app-screens1.jsx` (`MAPEL_LABELS`) — tambahkan bila ada mapel baru.

## Langkah per pekan

1. Extract program mingguan:
   ```sh
   pdftotext -layout "Pekan N/A. Program Belajar/Program Mingguan*.pdf" out.txt
   ```
   Baca juga `B. Sumber Belajar/` bila ada.
2. Edit `tools/content-engine/out-matpel/`:
   - `regions.json` — tambah zone baru di subject `matpel` (lanjutkan `zone` ord terakhir).
   - `questions.json` — tambah array soal per `topic` baru.
3. QA lokal (wajib hijau): JSON valid, 4 opsi unik per soal, index jawaban valid, hint ada, fakta cocok dengan sumber.
4. Deploy + seed:
   ```sh
   scp regions.json questions.json vps-host:/opt/druygon/tools/content-engine/out-matpel/
   ssh vps-host 'cd /opt/druygon/tools/content-engine && node seed.mjs out-matpel/ && sudo systemctl restart druygon.service'
   ```
   `seed.mjs` idempotent per zone id — zone lama tidak terhapus selama id-nya masih ada di `regions.json`.
5. Reseed RAG Draco (wajib setelah konten berubah):
   ```sh
   ssh vps-host 'cd /opt/druygon && node tools/content-engine/seed-rag-matpel.mjs'
   ```
   Upsert idempotent ke koleksi ChromaDB `druygon_matpel` — aman diulang.
6. Verifikasi live:
   ```sh
   curl -s https://druygon.my.id/api/content/regions | grep -o 'matpel_[a-z]*_[0-9]*'
   ```
   Plus walkthrough browser (Chromium + WebKit dari Mac): region MATPEL → zone baru terbuka/terkunci sesuai aturan journey per mapel.
7. Draco: kalau ada topik baru, tambah entry `TOPIC_KNOWLEDGE` di `api/src/runtime/tutor_soul.js` dan update `learning_objectives` di Postgres (`druygon.parent_controls.overrides`, period pekan berjalan).
8. Commit scoped + push `master`; catat di AGENT-LOG (VPS `/opt/druygon-redesign/AGENT-LOG.md` + Obsidian `redesign-2026/AGENT-LOG.md`).

## Restore DB

Backup harian otomatis (cron 03:23) ke `/root/backups/druygon/`, retensi 14 hari. Restore:

```sh
systemctl stop druygon.service
sqlite3 /opt/druygon/api/druygon_content.db ".restore '/root/backups/druygon/druygon_content-<stamp>.db'"
systemctl start druygon.service
```

Selalu uji dulu ke file sementara: `sqlite3 /tmp/test.db ".restore '<file>'" && sqlite3 /tmp/test.db "PRAGMA integrity_check;"`.
