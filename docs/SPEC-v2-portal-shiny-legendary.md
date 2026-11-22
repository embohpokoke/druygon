# SPEC v2 — Portal Dru: Shiny, Legendary, Trainer Rank, Animasi & Suara

**Status:** disetujui arah oleh Erik (22 Nov 2026). Dasar implementasi build ini.
**Sumber konteks:** vault Obsidian `02. DRUYGON-SUITE-CANONICAL.md` (21 Nov 2026), `redesign-2026/GAME-RULES.md`, `docs/SPEC-animation-gamification.md` (v1), screenshot live Study 22 Nov 2026.
**Runtime target:** `/opt/druygon` di VPS Hostinger (`vps-host`, 72.60.78.181), Study `https://study.druygon.my.id`.
**Build log:** `docs/BUILD-LOG-v2.md` (append-only, untuk lanjut sesi kalau laptop ditutup).

---

## 1. Masalah & tujuan

Dru (10–12 th) sudah punya Study dengan XP, koin, koleksi, zona Matematika/Sains/MATPEL. Masalahnya: hadiahnya rata (koin/XP kecil tiap soal), tidak ada kejutan yang dinanti, dan tidak ada tingkatan trainer yang terlihat. Feedback Dru:

> ingin ada **shiny Pokémon** dan **Pokémon legendary**; setelah terkumpul, **tingkat trainer naik** dan ada lanjutannya.

Tujuan build v2:

1. Kejutan langka yang layak dikejar: shiny (di mana saja) dan legendary (gerbang per region).
2. Progresi identitas: Trainer Rank 7 tingkat dengan gelar, emblem, dan hadiah.
3. Rasa game: animasi tangkap, sparkle shiny, aura legendary, fanfare rank-up.
4. Portal: Home & Profile yang menunjukkan identitas trainer, trofi, dan "next goal".
5. Tetap aman & ringan: `prefers-reduced-motion`, suara hanya setelah sentuhan, tanpa BGM autoplay, tanpa library baru.

---

## 2. Prinsip yang tidak boleh dilanggar (dari spec v1)

- Umpan balik benar/salah 100–300 ms; jangan menahan soal berikutnya > 400 ms.
- Animasi hanya `transform` + `opacity`; target 60 fps; partikel maksimal ~14 node lalu dibersihkan.
- `@media (prefers-reduced-motion: reduce)` wajib: tanpa loop/partikel/lempar bola; teks tetap.
- Suara: WebAudio (tanpa file), default mengikuti preferensi `druygon-sfx`, tombol mute terlihat. Tidak ada autoplay; AudioContext dibuat saat sentuhan pertama.
- Tanpa Lottie/GSAP/Rive. Tanpa aset raster baru > 40 KB (sprite Pokémon dari CDN yang sudah dipakai).
- Tanpa hukuman streak. Tanpa leaderboard nama asli di area publik (sudah ada gate login).
- API baru wajib `requireDruAuth` (sudah dipasang global di `/api/player`).

---

## 3. Fitur

### 3.1 Shiny Pokémon

- Roll dilakukan **di klien saat encounter** (wild muncul), supaya Dru melihat sparkle sebelum memilih bola.
- Peluang dasar per rarity:

| Rarity | Shiny chance |
|---|---|
| common | 1/16 (6.25%) |
| uncommon | 1/20 (5%) |
| rare | 1/24 (4.2%) |
| legendary | 1/64 (1.6%) |

- **Shiny Charm**: kalau rank ≥ Ace Trainer dan hadiah rank sudah diklaim, peluang ×2 (server mengirim `rank.charm`).
- Tampilan wild shiny: sprite official-artwork shiny (`.../official-artwork/shiny/{dex}.png`, fallback ke normal), sparkle 8 partikel, chip `✨ SHINY`, suara `shiny`.
- Saat bola masuk: reveal layar penuh `✨ SHINY!` + burst, lalu Celebration memakai frame shiny.
- Persistensi: tabel `caught_shiny` (satu baris per slot+dex). Shiny mon yang base-nya belum tertangkap juga dicatat ke `caught_v2` agar progres zona tetap jalan.
- Koleksi: tab `✨ Shiny`, bintang shiny di kartu, hitungan shiny di Home/Profile.

### 3.2 Legendary Gate (per region)

- Tiap region punya satu **gerbang legendary** di ujung peta:
  - `curriculum` → Mewtwo (#150)
  - `science` → Rayquaza (#384)
  - `matpel` → Ho-Oh (#250)
- Terbuka hanya kalau **semua zona non-legendary region itu sudah cleared**.
- Encounter dijamin legendary (tanpa reroll), HP 200 (butuh ~5 jawaban benar), entrance: layar meredup + flash + aura emas + suara `legendary`.
- **Aturan bola:** Poké Ball & Great Ball ditolak ("Terlalu kuat! Pakai Ultra Ball") tanpa menghabiskan bola. Ultra Ball/Master Ball menangkap (dihabiskan 1).
- Legendary shiny 1/64, ditandai `★✨ MYTHIC!`.
- Persistensi memakai `caught_v2` + `caught_shiny`. Zona legendary dianggap cleared kalau dex legendary sudah tertangkap.
- Setelah tertangkap: banner "Legendary region tertangkap" dan rank points naik.

### 3.3 Trainer Rank (7 tingkat)

Poin dihitung server dari state nyata (bukan angka karangan):

```
points = level*10 + caught*3 + shiny*25 + legendary*40 + zonesCleared*15 + badges*2
```

| Tier | Rank | Poin | Gelar | Hadiah sekali klaim |
|---|---|---|---|---|
| 1 | Rookie | 0 | Rookie Trainer | — |
| 2 | Youngster | 120 | Youngster | +2 Great Ball |
| 3 | Ace Trainer | 300 | Ace Trainer | +1 Great Ball, **Shiny Charm** (peluang shiny ×2) |
| 4 | Gym Leader | 600 | Gym Leader | +5 Ultra Ball |
| 5 | Elite Four | 1000 | Elite Four | +1 Master Ball |
| 6 | Champion | 1500 | Champion | +3 Ultra Ball, +2 Great Ball |
| 7 | Dragon Master | 2200 | Dragon Master | +1 Master Ball, aura emas di kartu trainer |

- Rank selalu **derived** di GET (tidak disimpan). Hadiah diklaim lewat endpoint idempoten `rank/claim`, dicatat di `rank_awards`.
- Rank-up dideteksi klien dengan membandingkan rank sebelum & sesudah aksi (catch/answer/mission) lalu menampilkan overlay `RANK UP`.
- Home menampilkan kartu rank + progress ke rank berikut. Profile menampilkan tangga 7 rank (terkunci/terbuka/terklaim) + tombol klaim.

### 3.4 Animasi

| Momen | Animasi | Durasi |
|---|---|---|
| Wild muncul | `encounterIn` geser + scale, nama & HP fade | 300 ms |
| Legendary muncul | vignette gelap, flash emas, aura pulse (loop ≤ 5 s, ada pause di reduced motion) | 500 ms masuk |
| Shiny | 8 sparkle `sparkleTwinkle`, ring pulse emas | 1.2 s sekali |
| Jawab benar | kartu flash, damage float naik, combo pop | 180–300 ms |
| Lempar bola | `ballArc` parabola + 3 wobble + burst | total ~1.4 s (fase, bukan feedback soal) |
| Gagal (bola kurang) | bola mental kembali + shake + teks | 400 ms |
| Catch | confetti 26 (sekali), sprite pop, rays | ≤ 500 ms |
| Level up | badge pop + ring + teks hadiah bola | 500 ms |
| Rank up | overlay penuh: emblem, gelar, progress, confetti emas | 900 ms, tombol lanjut |
| XP bar | `scaleX` tween | 400 ms |

Semua loop > 5 s bisa dijeda (tombol "jeda animasi" di Home sudah/selalu tersedia). Tidak ada flash > 3×/detik.

### 3.5 Suara (WebAudio, tanpa file)

Tambah ke bank `SFX` di `components.jsx`:

| Nama | Dipakai | Karakter |
|---|---|---|
| `encounter` | wild muncul | blip pendek 2 nada |
| `legendary` | legendary muncul | gong rendah + gemuruh |
| `shiny` | shiny muncul / reveal | arpeggio 4 nada tinggi |
| `wobble` | tiap wobble bola | tick pendek (3×) |
| `burst` | bola terbuka | pop + noise pendek |
| `flee` | bola ditolak legendary | turun 2 nada |
| `rankup` | rank naik | fanfare 5 nada |
| `coin` | klaim hadiah | ding |

Tombol mute (speaker) tampil di header Catch dan di Profile (sudah ada `SoundRow`). Default ikut `druygon-sfx`.

### 3.6 Portal (desain layar)

**Home**
- Hero trainer: nama, gelar rank (bukan cuma "Trainer"), LVL, XP bar animasi, chip `✨ n` dan `★ n`.
- Kartu **Trainer Rank**: emblem besar, nama rank, progress ke rank berikut, "next: Gym Leader · 120 pts lagi".
- **Trophy Case**: 6 kartu terbaru shiny/legendary dengan frame emas/biru; empty state "Belum ada trofi — cari shiny pertama!".
- Sisanya (DruCode, Draco, region, misi, achievement, medal) tetap.

**Region Map**
- Gate legendary di bawah zona terakhir: kartu emas "Legendary Gate · Rayquaza", status terkunci/terbuka/tertangkap.

**Collection**
- Tab: All / ✨ Shiny / ★ Legendary. Stat bar: Caught / Pokédex / Shiny / Legendary. Kartu shiny = border emas + bintang; legendary = border emas + label.

**Profile**
- Kartu trainer dengan gelar rank + emblem.
- **Rank Ladder** 7 baris: status (✓ terklaim, ● sekarang, 🔒 berikutnya), poin, tombol Klaim hadiah jika rank tercapai & belum diklaim.
- Statistik: Shiny n, Legendary n, Shiny Charm aktif/tidak.
- Sisanya (slot, progres, tim, badge, medal, streak, ball, settings, parent) tetap.

**Celebration**
- Varian: biasa / `✨ SHINY` / `★ LEGENDARY` / `★✨ MYTHIC`; strip Level Up dan Rank Up.
- Tombol: "Add to team" & "Continue" (tidak menahan).

---

## 4. Data & API

### 4.1 Tabel baru (SQLite `druygon_players.db`)

```sql
CREATE TABLE IF NOT EXISTS caught_shiny (
  slot INTEGER NOT NULL,
  dex INTEGER NOT NULL,
  zone_id TEXT NOT NULL DEFAULT '',
  caught_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slot, dex)
);
CREATE TABLE IF NOT EXISTS rank_awards (
  slot INTEGER NOT NULL,
  rank_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slot, rank_id)
);
```

Dibuat idempoten di `player.js` (fungsi `ensureGameTables`) sehingga tidak perlu migrasi manual terpisah.

### 4.2 Content DB (`api/druygon_content.db`)

- `ALTER TABLE zone ADD COLUMN legendary INTEGER DEFAULT 0` (cek dulu).
- Seed idempoten 3 gerbang: `curriculum_legend` (Mewtwo), `science_legend` (Rayquaza), `matpel_legend` (Ho-Oh), `ord=99`, topic = topic zona terakhir region, `legendary=1`, + baris `zone_pokemon` rarity `legendary`.
- `GET /api/content/regions` menambah `legendary` per zona (boolean) dan `mons` tetap.

### 4.3 Kontrak API player

`GET /api/player/:slot` — tambah:

```json
{
  "shiny": [{ "dex": 25, "zoneId": "curriculum_1", "caughtAt": "..." }],
  "shinyCount": 1,
  "legendaryCount": 2,
  "rank": {
    "id": "ace", "name": "Ace Trainer", "tier": 3, "points": 342,
    "next": { "id": "gym", "name": "Gym Leader", "points": 600 },
    "progressPct": 20, "charm": true,
    "perks": ["Shiny Charm", "+1 Great Ball"]
  },
  "rankAwards": ["rookie", "youngster"]
}
```

`POST /api/player/:slot/catch` — body tambah `shiny: boolean` (opsional, default false); response tambah:

```json
{ "shiny": true, "shinyNew": true, "rank": {...}, "rankUp": false, "legendary": false }
```

`POST /api/player/:slot/rank/claim` — body `{ rankId, idempotencyKey }`:

- 400 kalau `rankId` tidak dikenal / `idempotencyKey` hilang.
- 409 kalau tier rank belum tercapai.
- Idempoten per `(slot, rankId)`.
- 200 `{ success, idempotent?, coinsNow, xpNow, levelNow, pokeballs, reward: {coins, pokeball, greatball, ultraball, masterball}, rank }`.

`POST /api/player/:slot/answer` tidak berubah kontrak; response sudah punya `levelNow` (dipakai klien untuk level-up).

---

## 5. Definisi "cleared" (tetap)

Zona non-legendary cleared = 2 dex berbeda tertangkap di zona itu ATAU row `zone_progress.status='cleared'`. Zona legendary cleared = dex legendary tertangkap. Zona legendary hanya terbuka kalau semua zona non-legendary region cleared.

---

## 6. Penerimaan (harus lulus sebelum live)

1. Wild shiny muncul dengan sparkle + label; setelah tangkap, reload masih shiny (GET mengembalikan `shiny`).
2. Tangkap shiny mon yang base-nya sudah dimiliki tetap menambah koleksi shiny (tidak error, tidak menghapus yang lama).
3. Legendary gate terkunci sampai region selesai; setelah terbuka, encounter legendary; Poké/Great ditolak tanpa memakai bola; Ultra menangkap; tercatat di koleksi.
4. Rank dihitung benar (uji hitung manual), naik saat poin melewati ambang, hadiah hanya bisa diklaim sekali, 409 jika belum tercapai, 401 tanpa sesi.
5. Semua animasi bisa dimatikan `prefers-reduced-motion` (uji emulasi), tidak ada partikel/lemparan.
6. Suara: tidak ada bunyi sebelum tap; mute persist; reload tetap; tidak ada BGM.
7. `bash redesign/build.sh` sukses; bundle hash berubah; halaman Study 200; tidak ada error console (cek Playwright).
8. iPhone viewport 390×844 tidak overflow horizontal; tombol tetap ≥ 44 px.
9. Tidak ada perubahan pada `/api/tutor`, `/api/weekly`, Cody, Draco.
10. `git status` VPS tetap tidak memuat file tak terkait; commit hanya path yang disentuh.

---

## 7. Rollout & rollback

- Backup sebelum deploy: salin `druygon_players.db` + `druygon_content.db` ke `/root/backups/druygon-v2/` (dan tar file yang disentuh).
- Build di VPS: `bash redesign/build.sh` (Linux, ada `sha256sum`).
- Restart hanya `druygon.service`; nginx tidak disentuh.
- Rollback: `git checkout <commit-sebelumnya> -- <path>` untuk file kode + kembalikan DB dari backup, lalu build ulang dan restart. Jangan `git reset --hard` pada tree kotor.

---

## 8. Pembagian kerja

| Bagian | File | Pelaksana |
|---|---|---|
| Backend shiny/rank | `api/src/routes/player.js` | subagent backend |
| Fondasi CSS + SFX | `redesign/app/app.css`, `redesign/app/components.jsx` | subagent fondasi |
| Data helper (rank, shiny sprite) | `redesign/app/data.jsx` | lead |
| Catch + Celebration | `redesign/app/app-screens1.jsx` | lead |
| Home + Map (rank card, trophy, gate) | `redesign/app/app-screens1.jsx` | lead |
| Collection + Profile (tab shiny, rank ladder) | `redesign/app/app-screens2.jsx` | lead |
| State & API wiring | `redesign/app/index-src.jsx` | lead |
| Content seed + route | `api/src/routes/content.js`, `tools/content-engine/seed-legendary-gates.mjs` | lead |
| Build, QA, git, docs | VPS + vault | lead |

---

## 9. Catatan IP

Spec v1 menandai risiko merek Pokémon. Build v2 tetap memakai nama/visual Pokémon karena itu permintaan langsung Erik untuk anaknya (aplikasi privat keluarga). Risiko tidak berubah dan tetap dicatat di vault; tidak menambah aset resmi baru selain sprite PokeAPI yang sudah dipakai.
