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
| `npm run bot:dev` | Telegram botni kompyuterda ishga tushirish (polling) |
| `npm run bot:webhook` | Vercel'dagi saytga bot webhook'ini ulash |
| `npm run gen:secret` | Yangi maxfiy kalit yaratish |
| `npm run check-env` | `.env.local` va ulanishlarni tekshirish (`-- --prod` — Vercel uchun) |
| `npm run lint` / `npm run typecheck` | Kod tekshiruvi |

## Telegram bot

1. Telegram'da **@BotFather** → `/newbot` → bot nomini bering va tokenni `.env.local` dagi `TELEGRAM_BOT_TOKEN` ga yozing.
2. **@userinfobot** ga yozib, o'z ID'ingizni bilib oling va `TELEGRAM_ALLOWED_USER_ID` ga yozing. Bot faqat shu ID'ga javob beradi.
3. Kompyuterda sinash (webhook kerak emas):

   ```bash
   npm run bot:dev
   ```

4. Sayt Vercel'ga joylangandan keyin (`APP_URL` — https manzil) webhook'ni bir marta o'rnating:

   ```bash
   npm run bot:webhook
   ```

Botda: login → parol (xabar darhol o'chiriladi) → Google Authenticator kodi. Seans 12 soat, bir vaqtda bitta.
Tez yozish: `45000 taksi` (chiqim), `+12000000 oylik` (kirim), `1.5 mln ijara`, `45k kofe`.
Botdan kiritilgan yozuvlar saytda **Telegram** belgisi bilan ko'rinadi.

Bot o'zi xabar beradi: saytga yangi kirish bo'lganda, takroriy to'lov yozilganda; qarz va kredit eslatmalari — har kuni ertalab soat 9 atrofida (Vercel Cron).

`npm run bot:dev` ishga tushirilsa, webhook o'chadi — Vercel'dagi bot yana ishlashi uchun keyin `npm run bot:webhook` ni qayta bajaring.

## AI yordamchi

1. [console.anthropic.com](https://console.anthropic.com) → **API Keys** → yangi kalit yarating va `.env.local` dagi `ANTHROPIC_API_KEY` ga yozing.
2. Ixtiyoriy: `ANTHROPIC_MODEL` — standart `claude-opus-5-5`; arzonroq variant — `claude-sonnet-5-5`.
3. Saytni qayta ishga tushiring. Kalit bo'lmasa, sayt ishlayveradi — faqat AI bloklari "ulanmagan" deb ko'rsatiladi.

- Har sahifaning pastki o'ng burchagidagi tugma suhbat panelini ochadi. AI savolga javob berish uchun bazadan kerakli ma'lumotlarni o'zi o'qiydi (oylik hisobot, oylar taqqoslash, yozuvlar qidiruvi, budjet, qarzlar, takroriy to'lovlar).
- AI ma'lumotlarni **faqat o'qiydi**: yozuv qo'shish, o'zgartirish yoki o'chirish imkoni yo'q.
- Suhbatlar bazada saqlanadi (`aichats`), tarixdan qayta ochish yoki o'chirish mumkin.
- Dashboard'dagi **AI tahlil** — tanlangan oy bo'yicha xulosa, keraksiz xarajatlar va tejash maslahatlari. Faqat "Tahlil qilish / Yangilash" bosilganda tayyorlanadi va oy uchun saqlanadi (`aiinsights`), shuning uchun sahifani ochish pulli emas.
- AI faqat saytda; Telegram botda yo'q.

## Vercel'ga joylash

### 1. MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → **Create** → bepul **M0** klaster. Mintaqa — **Frankfurt (eu-central-1)**: Vercel funksiyalari ham shu yerda (`vercel.json` → `fra1`), sayt tezroq ishlaydi.
2. **Database Access** → foydalanuvchi va kuchli parol yarating.
3. **Network Access** → `0.0.0.0/0` (Vercel'ning IP manzillari doimiy emas; himoya — login, parol va 2FA).
4. **Connect** → **Drivers** → manzilni nusxalang, `<password>` o'rniga parolni qo'ying va `.env.local` dagi `MONGODB_URI` ga yozing.
5. Akkaunt, kategoriya va hamyonlarni Atlas'da yarating va tekshiring:

   ```bash
   npm run setup
   ```

   ```bash
   npm run check-env
   ```

### 2. GitHub

Vercel kodni GitHub'dan oladi. GitHub'da **private** repozitoriya yarating va kodni yuklang (`.env.local` yuklanmaydi — `.gitignore` da bor).

### 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub repozitoriyasini tanlang. Framework — Next.js (o'zi aniqlaydi).
2. **Environment Variables** — `.env.local` dagi qatorlarni ko'chiring:

   | O'zgaruvchi | Izoh |
   |---|---|
   | `MONGODB_URI`, `MONGODB_DB` | Atlas manzili |
   | `AUTH_SECRET`, `ENCRYPTION_KEY` | **Aynan** `.env.local` dagidek (boshqasi bo'lsa — kirib bo'lmaydi, 2FA buziladi) |
   | `CRON_SECRET` | Har kungi cron uchun; Vercel uni so'rovga o'zi qo'shadi |
   | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_ID`, `TELEGRAM_WEBHOOK_SECRET` | Bot uchun |
   | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | AI uchun |
   | `APP_URL` | Vercel manzili, masalan `https://hisob-nazorat.vercel.app` |

3. **Deploy**. Tekshirish: `https://<manzil>/api/health` → `{"ok":true,"db":"ok"}`.

### 4. Deploy'dan keyin

1. `.env.local` dagi `APP_URL` ni ham Vercel manziliga o'zgartiring va botni saytga ulang:

   ```bash
   npm run bot:webhook
   ```

2. Hammasini tekshiring:

   ```bash
   npm run check-env -- --prod
   ```

3. Saytga kiring — birinchi kirishda Google Authenticator ulanadi.

### Avtomatik ishlar

- **Har kuni 09:00 atrofida** (Toshkent; `vercel.json` da `0 4 * * *` UTC) `/api/cron/daily` vaqti kelgan takroriy to'lovlarni yozadi va qarz/kredit eslatmalarini Telegram'ga yuboradi. Bepul (Hobby) tarifda cron kuniga bir marta va belgilangan soat ichida ishlaydi.
- Takroriy to'lovlar sayt yoki bot ochilganda ham tekshiriladi — cron kechiksa ham hech narsa tushib qolmaydi va ikki marta yozilmaydi.
- Yangi o'zgarishlar: GitHub'ga `git push` — Vercel o'zi qayta joylaydi.

## Kirish va xavfsizlik

- Kirish ikki bosqichli: login + parol, keyin Google Authenticator kodi. Birinchi kirishda QR kod va 8 ta zaxira kod beriladi.
- Saytda bir vaqtda faqat bitta seans: yangi kirishda oldingisi yopiladi, ochiq sahifa ~20 soniyada o'zi login sahifasiga chiqadi.
- Seans 12 soat amal qiladi. 5 ta noto'g'ri urinishdan keyin (parol yoki kod) akkaunt 15 daqiqaga bloklanadi.
- Barcha javoblarda xavfsizlik sarlavhalari: sayt boshqa sayt ichida ochilmaydi (iframe), faqat https, qidiruv tizimlarida ko'rinmaydi.
- Parol bcrypt bilan, Google Authenticator kaliti AES-256-GCM bilan shifrlab saqlanadi. Seans tokenining o'zi bazaga yozilmaydi — faqat HMAC xeshi.
- `ENCRYPTION_KEY` o'zgarsa, 2FA kaliti o'qilmay qoladi — `npm run reset-2fa` bilan qayta ulanadi.

## Tuzilma

- `src/app/(app)/` — ilova sahifalari (kompyuterda yuqori menyu, telefonda pastki panel): Dashboard (`/`), Kirim-chiqim, Budjet, Qarzlar, Xaq, Sozlamalar
- `src/lib/models/` — MongoDB modellari
- `src/lib/data/` — sahifalar uchun bazadan o'qish (faqat serverda)
- `src/lib/ai/` — AI yordamchi: vositalar (faqat o'qish), prompt, suhbat sikli, oylik tahlil
- `src/lib/dates.ts`, `src/lib/money.ts` — Toshkent vaqti va so'm formatlash
- `scripts/` — terminal buyruqlari
- `vercel.json` — Vercel mintaqasi (Frankfurt) va har kungi cron
