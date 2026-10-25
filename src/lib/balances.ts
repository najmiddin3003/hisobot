import "server-only";
import type { Types } from "mongoose";
import { currencyOf, minorToUzs } from "@/lib/currency";
import { Transaction, Transfer, Wallet } from "@/lib/models";
import { getRates } from "@/lib/rates";

type Sums = { kirim: number; chiqim: number; transferIn: number; transferOut: number };
const emptySums = (): Sums => ({ kirim: 0, chiqim: 0, transferIn: 0, transferOut: 0 });

/**
 * Har bir hamyon bo'yicha kirim, chiqim va o'tkazmalar yig'indisi — hamyonning o'z valyutasida
 * (o'chirilganlarsiz). since berilsa — faqat shu vaqtdan keyingilar.
 */
export async function sumsByWallet(since?: Date) {
  const match: Record<string, unknown> = { deletedAt: null };
  if (since) match.occurredAt = { $gte: since };

  const [transactions, transfers] = await Promise.all([
    Transaction.aggregate<{ _id: { wallet: Types.ObjectId; type: "kirim" | "chiqim" }; total: number }>([
      { $match: match },
      // Chet valyutali yozuvda asl summa, so'mli yozuvda amount
      { $group: { _id: { wallet: "$walletId", type: "$type" }, total: { $sum: { $ifNull: ["$originalAmount", "$amount"] } } } },
    ]),
    Transfer.aggregate<{ out: { _id: Types.ObjectId; total: number }[]; in: { _id: Types.ObjectId; total: number }[] }>([
      { $match: match },
      {
        $facet: {
          out: [{ $group: { _id: "$fromWalletId", total: { $sum: "$amount" } } }],
          // Valyutalar har xil bo'lsa — tushgan hamyon valyutasidagi summa
          in: [{ $group: { _id: "$toWalletId", total: { $sum: { $ifNull: ["$toAmount", "$amount"] } } } }],
        },
      },
    ]),
  ]);

  const sums = new Map<string, Sums>();
  const get = (id: Types.ObjectId) => {
    const key = String(id);
    let entry = sums.get(key);
    if (!entry) sums.set(key, (entry = emptySums()));
    return entry;
  };
  for (const row of transactions) get(row._id.wallet)[row._id.type] += row.total;
  for (const row of transfers[0]?.out ?? []) get(row._id).transferOut += row.total;
  for (const row of transfers[0]?.in ?? []) get(row._id).transferIn += row.total;
  return { get: (id: Types.ObjectId | string) => sums.get(String(id)) ?? emptySums() };
}

/** Hamyon qoldig'i o'z valyutasida (eng kichik birlikda) */
export function balanceOf(initialBalance: number, sums: Sums) {
  return initialBalance + sums.kirim - sums.chiqim + sums.transferIn - sums.transferOut;
}

/** Barcha hamyonlardagi jami pul so'mda, bugungi kurs bilan (arxivlanganlari ham — pul yo'qolib qolmasligi uchun) */
export async function totalBalance() {
  const [wallets, sums, { rates }] = await Promise.all([
    Wallet.find({}, { initialBalance: 1, currency: 1 }).lean(),
    sumsByWallet(),
    getRates(),
  ]);
  return wallets.reduce((total, w) => {
    const currency = currencyOf(w);
    return total + minorToUzs(balanceOf(w.initialBalance, sums.get(w._id)), currency, rates[currency]);
  }, 0);
}
