# druygon
Druygon adalah portal game edukasi berbasis web untuk anak SD kelas 10-12 tahun, khususnya Dru. Dilengkapi karakter maskot **Draco** (naga kecil tutor AI) yang membantu belajar Matematika, Bahasa Inggris, dan mata pelajaran lainnya.

**URL:** https://druygon.my.id  
**Audience:** Anak SD kelas 4-6  
**Key feature:** AI tutor "Draco" (multi-provider: Ollama (cloud)

Tech Stack:

| Layer      | Technology                                                |
| ---------- | --------------------------------------------------------- |
| Frontend   | Static HTML/CSS/JS (zero framework, responsive)           |
| Backend    | Node.js + Express, port xxxx, PM2 `druygon-ai`            |
| AI         | Anthropic Claude Haiku 4.5 (primary) → Ollama             |
| Database   | PostgreSQL                                                |
| AI Runtime | Custom layered: profile → soul → memory → rules → model   |
| Deploy     | GitHub Actions (auto on push master)                      |

