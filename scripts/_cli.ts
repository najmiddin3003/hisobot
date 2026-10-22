// Terminal skriptlari uchun umumiy yordamchilar
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { connectDB } from "@/lib/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { User } from "@/lib/models";

export function loadEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}

export async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Parolni yulduzchalar bilan so'raydi (terminal qo'llamasa — oddiy kiritish) */
export function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(question);

  process.stdout.write(question);
  return new Promise((resolve) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        value += char;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

/** Yangi parolni ikki marta so'raydi; SETUP_PASSWORD berilgan bo'lsa — shuni oladi */
export async function promptNewPassword() {
  if (process.env.SETUP_PASSWORD) return process.env.SETUP_PASSWORD;
  if (!process.stdin.isTTY) console.log("  ! Bu terminalda parol yashirilmaydi — atrofingizga e'tibor bering.");

  while (true) {
    const password = await askHidden(`Parol (kamida ${MIN_PASSWORD_LENGTH} belgi): `);
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.log(`  ✗ Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.`);
      continue;
    }
    if (password !== (await askHidden("Parolni takrorlang: "))) {
      console.log("  ✗ Parollar mos kelmadi, qaytadan kiriting.");
      continue;
    }
    return password;
  }
}

export async function connectOrExit() {
  try {
    await connectDB();
  } catch (error) {
    console.error(`  ✗ MongoDB'ga ulanib bo'lmadi: ${error instanceof Error ? error.message : error}`);
    console.error("    .env.local faylidagi MONGODB_URI ni tekshiring.\n");
    process.exit(1);
  }
}

/** Tizimdagi yagona akkaunt (bo'lmasa — xabar berib chiqadi) */
export async function findAccountOrExit() {
  const user = await User.findOne();
  if (!user) {
    console.error("  ✗ Akkaunt topilmadi. Avval: npm run setup\n");
    process.exit(1);
  }
  return user;
}
