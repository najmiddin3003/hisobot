# Hisob — shaxsiy moliya

Kirim-chiqim, budjet, qarzlar va kreditlarni nazorat qilish tizimi. Next.js (App Router) + MongoDB, Telegram bot va AI yordamchi bilan.

## Ishga tushirish

1. Bog'liqliklarni o'rnating:

   ```bash
   npm install
   ```

2. `.env.local` faylida bo'sh qatorlarni to'ldiring (namuna — `.env.example`). Birinchi bosqich uchun `MONGODB_URI` yetarli.

3. Akkaunt, standart kategoriyalar va hamyonlarni yarating:

   ```bash
   npm run setup
   ```

4. Saytni ishga tushiring va http://localhost:3000 ni oching:

   ```bash
   npm run dev
   ```

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` | Production build |
| `npm run setup` | Birinchi sozlash (qayta ishga tushirish xavfsiz) |
| `npm run gen:secret` | Yangi maxfiy kalit yaratish |
| `npm run lint` / `npm run typecheck` | Kod tekshiruvi |

## Tuzilma

- `src/app/(app)/` — sidebar ichidagi sahifalar: Dashboard (`/`), Kirim-chiqim, Budjet, Qarzlar, Xaq, Sozlamalar
- `src/lib/models/` — MongoDB modellari
- `src/lib/data/` — sahifalar uchun bazadan o'qish (faqat serverda)
- `src/lib/dates.ts`, `src/lib/money.ts` — Toshkent vaqti va so'm formatlash
- `scripts/` — terminal buyruqlari
