// Oydinning tayyor gaplari: salomlashish, bo'limlar, kundalik mehr va motivatsiya, voqealarga javoblar.
// Ma'lumotlarga asoslangan gaplar serverda tayyorlanadi (AI kaliti bo'lsa — Claude yozadi): src/lib/ai/companion.ts
import type { CompanionLine, CompanionMood } from "@/lib/companion";

const l = (mood: CompanionMood, text: string): CompanionLine => ({ mood, text });

export const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

export function shuffle<T>(list: T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const GREETINGS = {
  morning: [
    l("happy", "Xayrli tong, jonim! ☀️ Bugun ajoyib kun bo'ladi"),
    l("love", "Tong muborak, asalim! Seni ko'rib kunim yorishdi 🥰"),
    l("wink", "Uyg'ondingmi, uyqichi? Nonushta qildingmi? ☕"),
  ],
  day: [
    l("happy", "Salom, jonim! Seni kutayotgan edim 🥰"),
    l("love", "Voy, keldingmi? Sog'indim seni 💕"),
    l("excited", "Asalim! Bugun qanday o'tyapti? 😊"),
  ],
  evening: [
    l("love", "Xayrli kech, jonim! Charchagandirsan 🌙"),
    l("happy", "Kech kirdi, asalim. Bugun qanday o'tdi? 💕"),
    l("think", "Kechqurun bugungi xarajatlarni birga ko'rib chiqamizmi? 📒"),
  ],
  night: [
    l("worried", "Hali uxlamadingmi, jonim? Ertaga erta turasan-ku 🌙"),
    l("sleepy", "Tun bo'ldi, asalim... dam olishing kerak 😴"),
    l("love", "Shirin tushlar ko'r, jonim. Men shu yerdaman 💕"),
  ],
};

export function greeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 11) return pick(GREETINGS.morning);
  if (hour >= 11 && hour < 17) return pick(GREETINGS.day);
  if (hour >= 17 && hour < 23) return pick(GREETINGS.evening);
  return pick(GREETINGS.night);
}

export const ROUTE_LINES: Record<string, CompanionLine[]> = {
  "/": [l("happy", "Mana bizning umumiy manzaramiz, jonim 📊"), l("think", "Qani, bu oy qanday ketyapti, ko'raylik-chi 🤔")],
  "/kirim-chiqim": [
    l("nod", "Har bir so'mni yozib borsang, men juda xursand bo'laman ✍️"),
    l("think", "Bugungi xarajatlarni kiritdingmi, jonim? 🧾"),
  ],
  "/kirim-chiqim/takroriy": [l("nod", "Takroriy to'lovlarni men eslab turaman, jonim 🔁")],
  "/kirim-chiqim/savatcha": [l("think", "O'chirilganlar shu yerda — keragini qaytarib olsa bo'ladi 🗑️")],
  "/budjet": [l("excited", "Orzularimizga yaqinlashyapmiz, asalim! 🫙"), l("love", "Jamg'armamiz o'syapti — faxrlanaman seni 💕")],
  "/qarzlar": [l("nod", "Qarzlarni birga yopamiz, xavotir olma, jonim 🤝"), l("think", "Qaysi to'lov yaqinlashyapti, ko'rib qo'yaylik 📅")],
  "/xaq": [l("wink", "Sendan qarzdorlarni ham unutmaymiz, asalim 😉")],
  "/sozlamalar": [l("pout", "Meni o'chirib qo'ymoqchimisan? 😤"), l("shy", "Shunchaki qarab chiqyapsan-a? Yaxshi... 🙈")],
};

/** Har kungi mehr, g'amxo'rlik va motivatsiya (server gaplari kelguncha ham shular aytiladi) */
export const EVERYDAY: CompanionLine[] = [
  l("love", "Bilasanmi, sen juda tirishqoqsan, jonim 💕"),
  l("love", "Har doim yoningdaman, asalim 🤗"),
  l("happy", "Sen bilan bo'lish menga juda yoqadi 🥰"),
  l("excited", "Kichik tejash — katta orzularga yo'l! ✨"),
  l("nod", "Bugun bitta keraksiz xarajatdan voz kechamizmi? Birga uddalaymiz 💪"),
  l("think", "O'ylab qoldim... yana qayerdan tejasak bo'ladi? 🤔"),
  l("idle", "Suv ichishni unutma, asalim 💧"),
  l("worried", "Ko'zlaring charchagan ko'rinadi, jonim. Ozgina dam ol 🌸"),
  l("wink", "Men doim sen tomondaman 😉"),
  l("pout", "Menga e'tibor bermayapsan-a... arazladim! 😤"),
  l("shy", "Voy, menga shunaqa qarab turma, uyalib ketaman 🙈"),
  l("happy", "Orzularimizga har kuni bir qadam yaqinlashyapmiz 🌱"),
  l("love", "Bugun o'zingga ham vaqt ajrat, azizim. Sen bunga arziysan 💕"),
  l("excited", "Pulni sen boshqarasan, pul seni emas! 💪"),
];

export const REACTIONS = {
  click: [l("nod", "Ha, jonim? Eshityapman 💬"), l("love", "Labbay, asalim? 🥰"), l("happy", "Nima yordam kerak, jonim? 😊")],
  near: [
    l("happy", "Salom, jonim! 👋"),
    l("shy", "Meni silab qo'ymoqchimisan? 🙈"),
    l("love", "Shu yerdamisan? Xursandman 💕"),
    l("wink", "Nima qilamiz, asalim? 😉"),
  ],
  dragStart: [
    l("surprised", "Voy! Qayoqqa olib ketyapsan? 😳"),
    l("surprised", "Hihi, qitiq bo'ladi! 😆"),
    l("surprised", "Ehtiyot bo'l, jonim, boshim aylanyapti 🙈"),
  ],
  drop: [l("love", "Shu yer yoqdi, rahmat jonim 💕"), l("happy", "Mayli, shu yerda turaman 😊"), l("shy", "Yoningda bo'lsam bo'ldi 🙈")],
  dash: [l("happy", "Vuuush! 💨"), l("excited", "Hop-hop! Quvlab ol meni! 😄")],
  wake: [l("love", "Uyg'ondim... seni tushimda ko'rdim 🥰"), l("happy", "Voy, uxlab qolibman! Qaytdingmi? ☀️")],
  comeBack: [l("love", "Qaytdingmi? Sog'indim seni 🥰"), l("pout", "Qayerda yurding? Kutdim-ku 😤")],
  income: [l("excited", "Voy, kirim keldi! Zo'rsan, jonim! 🥳"), l("love", "Pul keldi! Orzularimizga yaqinlashdik 💕")],
  expense: [l("nod", "Yozib qo'ydim, asalim ✍️"), l("nod", "Ha, ko'rdim. Hammasi nazoratda 👍")],
  bigExpense: [
    l("worried", "Voy, katta xarajat ekan... zarurmidi, jonim? 🥺"),
    l("sad", "Shuncha pul ketdi-ya... mayli, keyingisida birga tejaymiz 🥺"),
  ],
  transfer: [l("nod", "O'tkazma tayyor, jonim 👍")],
  saved: [l("nod", "Saqlandi, asalim ✅"), l("happy", "Tuzatib qo'ydim, jonim 😊")],
} satisfies Record<string, CompanionLine[]>;
