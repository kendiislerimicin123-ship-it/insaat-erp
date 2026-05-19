# 🏗️ İnşaat ERP

> Türkiye pazarına yönelik, modern ve ölçeklenebilir bir İnşaat Yönetim Sistemi (ERP).

[![Status](https://img.shields.io/badge/status-in--development-yellow)]()
[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20Next.js%20%2B%20PostgreSQL-blue)]()

---

## 📋 Proje Hakkında

İnşaat ERP, inşaat firmalarının proje yönetimi, taşeron takibi, hakediş işlemleri, satın alma, stok, personel ve finans süreçlerini tek bir platformda yönetmesini sağlayan kurumsal bir yazılımdır.

**Vizyon:** Logo Tiger ve Mikro gibi geleneksel ERP'lerin yerini alabilecek, modern, SaaS-ready bir Türkiye ürünü.

---

## 🎯 Modüller (Roadmap)

| Modül | Durum | Açıklama |
|---|---|---|
| 🔐 Authentication & RBAC | ⏳ Geliştiriliyor | JWT + Refresh Token + Rol Yönetimi |
| 🏘️ Proje & Şantiye Yönetimi | 📅 Planlandı | Proje kartları, bütçe, maliyet merkezi |
| 👷 Taşeron & Hakediş | 📅 Planlandı | Hakediş, stopaj, teminat, SGK takibi |
| 📦 Satın Alma & Stok | 📅 Planlandı | Depo, transfer, talep yönetimi |
| 👨‍💼 Personel Yönetimi | 📅 Planlandı | Puantaj, mesai, avans, bordro |
| 💰 Finans Yönetimi | 📅 Planlandı | Kasa, banka, cari, çek/senet |
| 📊 Raporlama | 📅 Planlandı | Dashboard, kar/zarar, proje maliyet |

---

## 🛠️ Teknoloji Yığını

### Backend
- **NestJS 10** — Modüler, ölçeklenebilir backend framework
- **TypeScript 5** — Tip güvenliği (strict mode)
- **Prisma 5** — Type-safe ORM
- **PostgreSQL 16** — İlişkisel veritabanı
- **Passport + JWT** — Authentication
- **Pino** — Structured logging

### Frontend
- **Next.js 14** — App Router, Server Components
- **TypeScript 5** — Tip güvenliği
- **TailwindCSS** — Utility-first CSS
- **shadcn/ui** — Modern UI bileşenleri
- **React Hook Form + Zod** — Form yönetimi & validasyon

### Geliştirme & DevOps
- **Turborepo** — Monorepo orchestration
- **Docker Compose** — Yerel PostgreSQL
- **ESLint + Prettier** — Kod kalitesi
- **Husky + lint-staged** — Pre-commit hooks
- **Jest + Playwright** — Test altyapısı

---

## 🏛️ Mimari

\`\`\`
insaat-erp/
├── apps/
│   ├── api/          → NestJS Backend
│   └── web/          → Next.js Frontend
├── packages/
│   ├── database/     → Prisma schema + migrations
│   ├── shared/       → Ortak tipler, DTO'lar, Zod şemaları
│   └── config/       → ESLint, TS, Prettier configleri
├── docker-compose.yml
└── turbo.json
\`\`\`

**Tasarım Prensipleri:**
- Clean Architecture (Controller → Service → Repository)
- SOLID prensipleri
- Multi-tenant ready (her tabloda \`tenantId\`)
- API-first yaklaşım
- Cloud-ready (ileride AWS/Azure'a taşınabilir)

---

## 🚀 Geliştirme Ortamı

### Gereksinimler
- Node.js 22 LTS
- npm 10+
- Docker Desktop
- Git
- PostgreSQL 16 (Docker üzerinden çalışır)

### Kurulum

\`\`\`bash
# Repo'yu klonla
git clone <repo-url>
cd insaat-erp

# Bağımlılıkları yükle
npm install

# PostgreSQL container'ını başlat
docker compose up -d

# Veritabanı şemasını oluştur
npm run db:migrate

# Geliştirme sunucularını başlat
npm run dev
\`\`\`

---

## 📅 Geliştirme Yol Haritası

- **Faz 0** ✅ Ortam kurulumu
- **Faz 1** 🟡 Monorepo + Database + Prisma kurulumu
- **Faz 2** ⏳ Authentication sistemi (JWT, RBAC)
- **Faz 3** ⏳ Multi-tenant altyapı + Audit log
- **Faz 4** ⏳ Frontend temel layout + Auth sayfaları
- **Faz 5+** ⏳ İş modülleri (Proje, Taşeron, Stok, ...)

---

## 📝 Lisans

Proprietary — Tüm hakları saklıdır.

---

## 👤 Geliştirici

**KRC** — Senior PM mindset ile geliştirilen kurumsal yazılım.

📧 kendiislerimicin@gmail.com