# StudentOS

StudentOS adalah aplikasi web untuk membantu mahasiswa mengelola kehidupan akademiknya di satu tempat: mata kuliah, jadwal kelas, dan tugas-tugas kuliah. Aplikasi ini menghitung prioritas setiap tugas secara otomatis berdasarkan deadline, progres, dan estimasi sisa pekerjaan, lalu menampilkannya dalam dashboard akademik. Selain itu, terdapat AI Academic Advisor yang bisa diajak tanya-jawab untuk mendapatkan rekomendasi "apa yang harus dikerjakan sekarang" berdasarkan data akademik pengguna sendiri.

## Fitur Utama

- **Manajemen Mata Kuliah & Jadwal** — mencatat mata kuliah dan jadwal kelas mingguan.
- **Manajemen Tugas** — mencatat tugas kuliah beserat deadline, progres, dan estimasi jam pengerjaan.
- **Priority Engine** — mesin penghitung skor prioritas tugas secara otomatis berbasis urgensi deadline dan tekanan sisa waktu kerja (lihat [lib/priority-engine/constants.ts](lib/priority-engine/constants.ts)), menghasilkan level prioritas `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`.
- **Dashboard Akademik** — ringkasan visual tugas-tugas yang paling butuh perhatian, dihitung dari data mata kuliah, jadwal, dan tugas pengguna.
- **AI Academic Advisor** — chat assistant yang menjawab pertanyaan seputar perencanaan akademik (misalnya "apa yang harus aku kerjakan dulu?" atau "aku punya 3 jam malam ini, sebaiknya ngerjain apa?") dengan merujuk ke data akademik asli pengguna dan hasil Priority Engine — bersifat read-only/advisory, tidak bisa mengubah data.
- **Autentikasi** — login & register dengan sesi berbasis JWT.

## AI yang Digunakan

Fitur AI Academic Advisor ditenagai oleh **Google Gemini** (model `gemini-3.8-flash`, dengan fallback otomatis ke `gemini-3.7-flash` dan `gemini-3.6-flash` jika model utama tidak tersedia/rate-limited — lihat [lib/ai/gemini-provider.ts](lib/ai/gemini-provider.ts)). Integrasi dilakukan langsung lewat REST API Gemini (tanpa SDK tambahan) agar project tetap ringan.

Beberapa prinsip desain AI advisor ini ([lib/ai/system-prompt.ts](lib/ai/system-prompt.ts)):
- Hanya menjawab berdasarkan data akademik nyata milik pengguna — tidak mengada-ada data.
- Tidak pernah menghitung ulang/override skor prioritas — hanya menjelaskan skor yang sudah dihasilkan Priority Engine.
- Bersifat read-only: tidak bisa membuat, mengubah, atau menghapus data apa pun.
- Jika `GEMINI_API_KEY` tidak diset, aplikasi tetap berjalan normal — fitur AI akan nonaktif secara graceful (lihat [lib/ai/provider.ts](lib/ai/provider.ts)).

## Tools & Framework

| Kategori | Teknologi |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Bahasa | TypeScript |
| Styling | Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com) di atas [Base UI](https://base-ui.com) |
| Database | PostgreSQL ([Neon](https://neon.tech) serverless) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Autentikasi | [Auth.js (NextAuth v5)](https://authjs.dev) dengan sesi JWT, password hashing via `bcryptjs` |
| Validasi | [Zod](https://zod.dev) |
| AI Provider | Google Gemini API (REST, lihat di atas) |
| Testing | [Vitest](https://vitest.dev) (unit & integration test terpisah) |
| Icon | [Lucide](https://lucide.dev) |

## Menjalankan Project

### 1. Prasyarat

- Node.js (versi yang mendukung Next.js 16)
- Database PostgreSQL (disarankan [Neon](https://neon.tech), gratis untuk pengembangan)
- (Opsional) API key Google Gemini jika ingin mengaktifkan AI Academic Advisor — buat di [Google AI Studio](https://aistudio.google.com)

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi environment variables

Copy `.env.example` menjadi `.env`, lalu isi:

```bash
# Connection string PostgreSQL (Neon)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Secret untuk menandatangani session JWT Auth.js
# generate dengan: openssl rand -base64 32
AUTH_SECRET=""

# API key Google Gemini (opsional — tanpa ini, aplikasi tetap jalan
# tapi fitur AI Academic Advisor akan nonaktif)
GEMINI_API_KEY=""
```

### 4. Migrasi database

```bash
npm run db:push
```

### 5. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Script lain yang tersedia

```bash
npm run build              # build untuk production
npm run start              # jalankan production build
npm run lint                # lint
npm run typecheck            # type-check tanpa emit
npm run test                # unit test (vitest)
npm run test:integration      # integration test (butuh DATABASE_URL aktif)
npm run db:generate          # generate migration dari schema Drizzle
npm run db:migrate           # jalankan migration
npm run db:studio            # buka Drizzle Studio (GUI database)
```

## Deploy

Cara paling mudah untuk deploy Next.js app adalah lewat [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). Pastikan environment variables (`DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`) sudah diset di dashboard deployment. Lihat juga [dokumentasi deployment Next.js](https://nextjs.org/docs/app/building-your-application/deploying).
