"use server";

import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(credentials: {
  username: string;
  password: string;
}) {
  try {
    const { data } = await axios.post(
      "http://127.0.0.1:8000/auth/jwt/create/",
      credentials,
    );

    const cookieStore = await cookies();

    cookieStore.set("access", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5, // 5 minutes
    });

    cookieStore.set("refresh", data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { error: "Invalid username or password." };
    }
    return { error: "Something went wrong. Try again." };
  }

  redirect("/");
}
