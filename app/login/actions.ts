"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api-client";

export async function login(credentials: {
  username: string;
  password: string;
}) {
  try {
    const data = await api.post<{ access: string; refresh: string }>(
      "/auth/jwt/create/",
      { auth: "public", body: credentials },
    );

    const cookieStore = await cookies();

    cookieStore.set("access", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 270, // 4.5 minutes, 30 s before the token expires
    });

    cookieStore.set("refresh", data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { error: "Invalid username or password." };
    }
    return { error: "Something went wrong. Try again." };
  }

  redirect("/");
}

// No backend call: there's no logout or token blacklist endpoint
export async function logout() {
  const cookieStore = await cookies();

  // delete() sends path "/", the path login and proxy.ts set them with
  cookieStore.delete("access");
  cookieStore.delete("refresh");

  redirect("/");
}
