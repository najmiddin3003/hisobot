import type { DebtDirection } from "@/lib/domain";

/** Qarzlar (men olganlar) va Xaq (men berganlar) uchun matnlar */
export const DEBT_TEXT = {
  olingan: {
    personLabel: "Kimdan olindi",
    personPlaceholder: "Masalan: Akmal aka",
    walletLabel: "Pul qaysi hamyonga tushdi",
    recordLabel: "Kirim sifatida yozilsin",
    recordHint: "Pul hozir hamyonga tushgan bo'lsa yoqing. Eski qarz bo'lsa — o'chiring.",
    paidLabel: "To'langan",
    paidBeforeLabel: "Avval qaytarilgan summa",
    payAction: "To'lov qilish",
    paySaved: "To'lov yozildi",
    paymentsTitle: "To'lovlar",
    paymentWallet: "Qaysi hamyondan to'landi",
    principalLabel: "Qarz olindi",
    remainingLabel: "Qaytarishim kerak",
  },
  berilgan: {
    personLabel: "Kimga berildi",
    personPlaceholder: "Masalan: Sardor",
    walletLabel: "Qaysi hamyondan berildi",
    recordLabel: "Chiqim sifatida yozilsin",
    recordHint: "Pul hozir hamyondan chiqqan bo'lsa yoqing. Eski qarz bo'lsa — o'chiring.",
    paidLabel: "Qaytarilgan",
    paidBeforeLabel: "Avval qaytarilgan summa",
    payAction: "Qaytardi",
    paySaved: "Qaytarilgan summa yozildi",
    paymentsTitle: "Qaytarishlar",
    paymentWallet: "Qaysi hamyonga tushdi",
    principalLabel: "Qarz berildi",
    remainingLabel: "Qaytarishi kerak",
  },
} satisfies Record<DebtDirection, Record<string, string>>;
