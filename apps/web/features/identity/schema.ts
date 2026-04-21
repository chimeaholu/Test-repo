import { z } from "zod";

import { APP_ROLES } from "@/features/shell/model";

export const signInSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(APP_ROLES),
  countryCode: z.enum(["GH", "NG", "JM"]),
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

export type SignInValues = z.infer<typeof signInSchema>;
export type ConsentValues = z.infer<typeof consentSchema>;
export type RevokeValues = z.infer<typeof revokeSchema>;
