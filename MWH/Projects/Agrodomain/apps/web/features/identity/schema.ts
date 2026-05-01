import { z } from "zod";

export const previewSignInSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum([
    "farmer",
    "buyer",
    "cooperative",
    "transporter",
    "investor",
    "extension_agent",
  ]),
  countryCode: z.enum(["GH", "NG", "JM"]),
});
export const signInSchema = previewSignInSchema;

export const passwordSignInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(5, "Enter your email address or phone number"),
  password: z.string().min(8, "Enter your password"),
  countryCode: z.enum(["GH", "NG", "JM"]),
});

export const magicLinkSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(5, "Enter your email address or phone number"),
  countryCode: z.enum(["GH", "NG", "JM"]),
});

export const magicLinkVerifySchema = z.object({
  verificationCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

export const consentSchema = z.object({
  policyVersion: z.string().trim().min(1),
  scopeIds: z
    .array(z.string().trim().min(1))
    .min(2, "Select at least two consent scopes"),
  accepted: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the consent statement" }),
  }),
});

export const revokeSchema = z.object({
  reason: z.string().trim().min(8, "Add a short reason for revocation"),
});

export type PreviewSignInValues = z.infer<typeof previewSignInSchema>;
export type PasswordSignInValues = z.infer<typeof passwordSignInSchema>;
export type MagicLinkValues = z.infer<typeof magicLinkSchema>;
export type MagicLinkVerifyValues = z.infer<typeof magicLinkVerifySchema>;
export type ConsentValues = z.infer<typeof consentSchema>;
export type RevokeValues = z.infer<typeof revokeSchema>;
