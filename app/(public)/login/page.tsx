"use client";

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { useAuthRuntime } from "@/components/auth/auth-runtime";

export default function LoginPage() {
  const auth = useAuthRuntime();
  const { instance, accounts } = useMsal();

  const isAuthed = (accounts?.length ?? 0) > 0;

  return (
    <main className="relative min-h-screen">
      {/* Background image (place file under public/brand/ and reference it here) */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/tpm-hero.jpg')" }}
      />
      {/* Overlay for readability (dim bright images) */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/22" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/55 to-emerald-50/70" />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-2xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Trade Promotion Management Tool
          </h1>
          <div className="mt-7 flex justify-center">
            <Button
              className="min-w-[180px]"
              onClick={async () => {
                if (auth.status === "ready" && !isAuthed) {
                  await instance.loginPopup(loginRequest);
                }
                window.location.href = "/";
              }}
            >
              {isAuthed ? "Continue" : "Sign in"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
