"use server";

import { redirect } from "next/navigation";
import { endWebSession } from "./session";

export async function logoutAction() {
  await endWebSession("logout");
  redirect("/login?sabab=chiqildi");
}
