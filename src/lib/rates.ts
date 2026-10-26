import "server-only";
import { after } from "next/server";
import { CURRENCIES, minorToUzs, type Currency, type Rates } from "@/lib/currency";
import { dayKey } from "@/lib/dates";
import { Rate } from "@/lib/models";

// Kurslar manbasi:
//   dollar, yevro — O'zbekiston Markaziy banki (kuniga bir marta yangilanadi);
//   USDT, bitkoin — CoinGecko (dollardagi narx × Markaziy bank dollar kursi), zaxira — Binance.

const FIAT_TTL_MS = 6 * 60 * 60 * 1000;
const CRYPTO_TTL_MS = 15 * 60 * 1000;
const MEMORY_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

const FOREIGN = CURRENCIES.filter((c) => c !== "UZS") as Exclude<Currency, "UZS">[];
const CRYPTO = new Set<Currency>(["USDT", "BTC"]);

export type RateInfo = { rate: number; source: string; fetchedAt: string };
export type RatesSnapshot = {
  rates: Rates;
  info: Partial<Record<Currency, RateInfo>>;
  /** Hech qachon olinmagan kurslar — bu valyutalarda summa so'mga aylantirilmaydi */
  missing: Currency[];
};

type Fetched = Partial<Record<Currency, { rate: number; source: string }>>;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return (await response.json()) as T;
}

async function fetchCbu(): Promise<Fetched> {
  const rows = await getJson<{ Ccy: string; Rate: string; Nominal: string }[]>("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
  const out: Fetched = {};
  for (const ccy of ["USD", "EUR"] as const) {
    const row = rows.find((r) => r.Ccy === ccy);
    const rate = row ? Number(row.Rate) / Number(row.Nominal || 1) : NaN;
    if (Number.isFinite(rate) && rate > 0) out[ccy] = { rate, source: "cbu" };
  }
  return out;
}

/** Kriptovalyutalarning dollardagi narxi */
async function fetchCryptoUsd(): Promise<{ BTC?: number; USDT?: number; source: string }> {
  try {
    const data = await getJson<{ bitcoin?: { usd?: number }; tether?: { usd?: number } }>(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd",
    );
    if (data.bitcoin?.usd) return { BTC: data.bitcoin.usd, USDT: data.tether?.usd ?? 1, source: "coingecko" };
  } catch {
    // zaxira manbaga o'tamiz
  }
  const data = await getJson<{ price: string }>("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
  return { BTC: Number(data.price), USDT: 1, source: "binance" };
}

let memory: { at: number; snapshot: RatesSnapshot } | null = null;
let inflight: Promise<RatesSnapshot> | null = null;
let refreshing = false;

type Latest = Map<Currency, { rate: number; source: string; fetchedAt: Date }>;

async function loadLatest(): Promise<Latest> {
  const rows = await Rate.aggregate<{ _id: Currency; rate: number; source: string; fetchedAt: Date }>([
    { $sort: { fetchedAt: -1 } },
    { $group: { _id: "$currency", rate: { $first: "$rate" }, source: { $first: "$source" }, fetchedAt: { $first: "$fetchedAt" } } },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

function isStale(latest: Latest, currency: Currency, now: number, force: boolean) {
  const row = latest.get(currency);
  return force || !row || now - row.fetchedAt.getTime() > (CRYPTO.has(currency) ? CRYPTO_TTL_MS : FIAT_TTL_MS);
}

function snapshotOf(latest: Latest): RatesSnapshot {
  const rates = { UZS: 1 } as Rates;
  const info: RatesSnapshot["info"] = {};
  const missing: Currency[] = [];
  for (const c of FOREIGN) {
    const value = latest.get(c);
    if (value) {
      rates[c] = value.rate;
      info[c] = { rate: value.rate, source: value.source, fetchedAt: value.fetchedAt.toISOString() };
    } else {
      rates[c] = 0;
      missing.push(c);
    }
  }
  return { rates, info, missing };
}

/** Eskirgan kurslarni manbadan oladi va bazaga yozadi */
async function refreshFromSources(latest: Latest, force: boolean): Promise<RatesSnapshot> {
  const now = Date.now();
  const stale = (c: Currency) => isStale(latest, c, now, force);

  const fetched: Fetched = {};
  if (stale("USD") || stale("EUR")) {
    try {
      Object.assign(fetched, await fetchCbu());
    } catch (error) {
      console.error("CBU kurslari olinmadi:", error);
    }
  }
  if (stale("BTC") || stale("USDT")) {
    const usd = fetched.USD?.rate ?? latest.get("USD")?.rate;
    if (usd) {
      try {
        const crypto = await fetchCryptoUsd();
        if (crypto.BTC) fetched.BTC = { rate: crypto.BTC * usd, source: crypto.source };
        if (crypto.USDT) fetched.USDT = { rate: crypto.USDT * usd, source: crypto.source };
      } catch (error) {
        console.error("Kripto narxlari olinmadi:", error);
      }
    }
  }

  const fetchedAt = new Date(now);
  const day = dayKey(fetchedAt);
  await Promise.all(
    FOREIGN.filter((c) => fetched[c]).map((currency) =>
      Rate.updateOne(
        { currency, day },
        { $set: { rate: fetched[currency]!.rate, source: fetched[currency]!.source, fetchedAt } },
        { upsert: true },
      ),
    ),
  );

  const merged: Latest = new Map(latest);
  for (const c of FOREIGN) {
    const fresh = fetched[c];
    if (fresh) merged.set(c, { ...fresh, fetchedAt });
  }
  return snapshotOf(merged);
}

/** Javob yuborilgandan keyin bajariladi (Next so'rovi bo'lmasa — shunchaki fonda) */
function inBackground(task: () => Promise<unknown>) {
  const run = () => task().catch((error) => console.error("Kurslarni fonda yangilab bo'lmadi:", error));
  try {
    after(run);
  } catch {
    void run();
  }
}

async function load(force: boolean): Promise<RatesSnapshot> {
  const latest = await loadLatest();
  const now = Date.now();
  const snapshot = snapshotOf(latest);
  if (!FOREIGN.some((c) => isStale(latest, c, now, force))) return snapshot;

  // Hamma kurs ma'lum, faqat eskirgan — sahifa tashqi manbani kutmaydi, yangilash fonda
  if (!force && snapshot.missing.length === 0) {
    if (!refreshing) {
      refreshing = true;
      inBackground(async () => {
        try {
          memory = { at: Date.now(), snapshot: await refreshFromSources(latest, false) };
        } finally {
          refreshing = false;
        }
      });
    }
    return snapshot;
  }
  return refreshFromSources(latest, force);
}

/**
 * Joriy kurslar (1 birlik necha so'm). Bazadagi oxirgi qiymat darhol ishlatiladi; eskirgan bo'lsa
 * manbadan fonda yangilanadi (kurs umuman yo'q bo'lsa yoki force — kutib olinadi).
 * Manba ishlamasa — oxirgi ma'lum kurs bilan davom etadi. connectDB() chaqiruvchi tomonda bo'lishi kerak.
 */
export async function getRates(options: { force?: boolean } = {}): Promise<RatesSnapshot> {
  if (!options.force && memory && Date.now() - memory.at < MEMORY_TTL_MS) return memory.snapshot;
  inflight ??= load(Boolean(options.force)).finally(() => {
    inflight = null;
  });
  const snapshot = await inflight;
  memory = { at: Date.now(), snapshot };
  return snapshot;
}

/** Yangi yozuv uchun kurs: kurs hali olinmagan bo'lsa xato matni */
export async function rateFor(currency: Currency): Promise<{ ok: true; rate: number } | { ok: false; error: string }> {
  if (currency === "UZS") return { ok: true, rate: 1 };
  const { rates } = await getRates();
  return rates[currency] > 0
    ? { ok: true, rate: rates[currency] }
    : { ok: false, error: "Valyuta kursini olib bo'lmadi. Internetni tekshirib, birozdan keyin qayta urinib ko'ring." };
}

/**
 * Kirim/chiqim yozuvining summa maydonlari. amount — hisobotlar uchun so'mdagi qiymat
 * (kiritilgan paytdagi kurs bilan), originalAmount — hamyon valyutasidagi asl summa.
 */
export function transactionAmounts(minor: number, currency: Currency, rate: number) {
  if (currency === "UZS") return { amount: minor, currency, originalAmount: null, rate: null };
  return { amount: Math.max(1, minorToUzs(minor, currency, rate)), currency, originalAmount: minor, rate };
}
