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
| `npm run reset-password` | Parolni unutganda: yangi parol, blokni olib tashlash, barcha seanslarni yopish |
| `npm run reset-2fa` | Telefon va zaxira kodlar yo'qolganda: Google Authenticator'ni qayta ulash |
| `npm run gen:secret` | Yangi maxfiy kalit yaratish |
| `npm run lint` / `npm run typecheck` | Kod tekshiruvi |

## Kirish va xavfsizlik

- Kirish ikki bosqichli: login + parol, keyin Google Authenticator kodi. Birinchi kirishda QR kod va 8 ta zaxira kod beriladi.
- Saytda bir vaqtda faqat bitta seans: yangi kirishda oldingisi yopiladi, ochiq sahifa ~20 soniyada o'zi login sahifasiga chiqadi.
- Seans 12 soat amal qiladi. 5 ta noto'g'ri urinishdan keyin (parol yoki kod) akkaunt 15 daqiqaga bloklanadi.
- Parol bcrypt bilan, Google Authenticator kaliti AES-256-GCM bilan shifrlab saqlanadi. Seans tokenining o'zi bazaga yozilmaydi — faqat HMAC xeshi.
- `ENCRYPTION_KEY` o'zgarsa, 2FA kaliti o'qilmay qoladi — `npm run reset-2fa` bilan qayta ulanadi.

## Tuzilma

- `src/app/(app)/` — sidebar ichidagi sahifalar: Dashboard (`/`), Kirim-chiqim, Budjet, Qarzlar, Xaq, Sozlamalar
- `src/lib/models/` — MongoDB modellari
- `src/lib/data/` — sahifalar uchun bazadan o'qish (faqat serverda)
- `src/lib/dates.ts`, `src/lib/money.ts` — Toshkent vaqti va so'm formatlash
- `scripts/` — terminal buyruqlari
