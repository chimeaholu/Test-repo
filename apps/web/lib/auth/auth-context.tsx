"use client";

import type { IdentitySession } from "@agrodomain/contracts";
import { createContext, useContext } from "react";

export type PreviewRole =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "transporter"
  | "investor"
  | "extension_agent";

export interface SignInInput {
  method: "preview";
  displayName: string;
  email: string;
  role: PreviewRole;
  countryCode: string;
}

export interface SignInOptions {
  redirectTo?: string | null;
}

export interface PasswordSignInInput {
  identifier: string;
  password: string;
  countryCode: string;
}

export interface MagicLinkInput {
  identifier: string;
  countryCode: string;
}

export interface MagicLinkChallenge {
  challengeId: string;
  deliveryChannel: "sms" | "email";
  provider: string;
  fallbackProvider: string | null;
  maskedTarget: string;
  expiresAt: string;
  previewCode: string | null;
}

export interface MagicLinkVerifyInput {
  challengeId: string;
  verificationCode: string;
}

export interface AuthContextValue {
  /** True once the initial session restore attempt has completed. */
  isHydrated: boolean;
  /** True while an auth API call is in flight. */
  isSigningIn: boolean;
  /** Non-null error message if the last auth attempt failed. */
  signInError: string | null;
  /** The current identity session, or null if unauthenticated. */
  session: IdentitySession | null;
  /** Preview-only bootstrap until the dedicated demo tenant ships. */
  signIn: (input: SignInInput, options?: SignInOptions) => Promise<void>;
  /** Authenticate with the password flow and navigate to consent. */
  signInWithPassword: (input: PasswordSignInInput, options?: SignInOptions) => Promise<void>;
  /** Request a production magic-link challenge without creating a session yet. */
  requestMagicLink: (input: MagicLinkInput) => Promise<MagicLinkChallenge>;
  /** Verify the production magic-link challenge and create a real session. */
  verifyMagicLink: (input: MagicLinkVerifyInput, options?: SignInOptions) => Promise<void>;
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
