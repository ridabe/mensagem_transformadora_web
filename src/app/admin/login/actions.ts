"use server";

import { login as loginImpl, logout as logoutImpl } from "@/app/login/actions";

export async function login(formData: FormData) {
  return loginImpl(formData);
}

export async function logout() {
  return logoutImpl();
}
