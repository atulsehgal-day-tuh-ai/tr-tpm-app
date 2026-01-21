"use client";

import * as React from "react";

export type AuthRuntimeStatus = "loading" | "ready" | "disabled";

export type AuthRuntime = {
  status: AuthRuntimeStatus;
  message?: string;
};

const AuthRuntimeContext = React.createContext<AuthRuntime>({ status: "loading" });

export function AuthRuntimeProvider({
  value,
  children,
}: {
  value: AuthRuntime;
  children: React.ReactNode;
}) {
  return <AuthRuntimeContext.Provider value={value}>{children}</AuthRuntimeContext.Provider>;
}

export function useAuthRuntime() {
  return React.useContext(AuthRuntimeContext);
}

