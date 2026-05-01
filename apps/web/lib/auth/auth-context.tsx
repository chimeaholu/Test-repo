"use client";

import type { ActorRole, IdentitySession } from "@agrodomain/contracts";
import { createContext, useContext } from "react";

export interface SignInInput {
  displayName: string;
  email: string;
  role: ActorRole;
  countryCode: string;
}

export interface AuthContextValue {
  /** True once the initial session restore attempt has completed. */
  isHydrated: boolean;
  /** True while a signIn API call is in flight. */
  isSigningIn: boolean;
  /** Non-null error message if the last signIn attempt failed. */
  signInError: string | null;
  /** The current identity session, or null if unauthenticated. */
  session: IdentitySession | null;
  /** Authenticate with the real backend and navigate to consent. */
  signIn: (input: SignInInput) => Promise<void>;
  /** Clear local session state and navigate to /signin. */
  clearSession: () => void;
  /** Directly update the session (e.g. after consent changes). */
  updateSession: (session: IdentitySession | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
