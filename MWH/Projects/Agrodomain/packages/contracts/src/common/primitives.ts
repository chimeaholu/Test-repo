import { z } from "zod";

import { schemaVersion } from "./contract.js";

export const schemaVersionLiteral = z.literal(schemaVersion);

export const isoTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO-8601 timestamp with timezone offset");

export const channelSchema = z
  .enum(["pwa", "ussd", "whatsapp", "sms", "push", "api"])
  .describe("Transport channel that originated or carried the request");

export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/u, "country_code must be ISO alpha-2")
  .describe("ISO alpha-2 country code");

export const localeSchema = z
  .string()
  .min(2)
  .max(16)
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/u, "locale must be BCP-47 like en or en-GH");

export const requestIdSchema = z.string().min(1);
export const correlationIdSchema = z.string().min(1);
export const causationIdSchema = z.string().min(1);
export const actorIdSchema = z.string().min(1);
export const idempotencyKeySchema = z.string().min(1);
export const reasonCodeSchema = z.string().min(1);

export const traceabilityMetadataSchema = z
  .object({
    journey_ids: z.array(z.string().min(1)).min(1),
    data_check_ids: z.array(z.string().min(1)).default([]),
  })
  .strict();
