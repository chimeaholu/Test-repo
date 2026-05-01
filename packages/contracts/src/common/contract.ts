import { z } from "zod";

export type TraceabilityId =
  | `CJ-${number}`
  | `EP-${number}`
  | `RJ-${number}`
  | `DI-${number}`
  | `AIJ-${number}`
  | `IDI-${number}`
  | `QG-${number}`;

export type ContractDomain =
  | "envelope"
  | "errors"
  | "identity"
  | "workflow"
  | "advisory"
  | "channels"
  | "notifications"
  | "marketplace"
  | "negotiation"
  | "finance"
  | "ledger"
  | "escrow"
  | "climate";

export type ContractKind = "request" | "response" | "event" | "dto" | "catalog";

export const schemaVersion = "2026-04-18.wave1";

export type ContractDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  id: string;
  name: string;
  kind: ContractKind;
  domain: ContractDomain;
  schemaVersion: string;
  schema: TSchema;
  description: string;
  traceability: readonly TraceabilityId[];
  sourceArtifacts: readonly string[];
};

export function defineContract<TSchema extends z.ZodTypeAny>(
  definition: ContractDefinition<TSchema>,
): ContractDefinition<TSchema> {
  return definition;
}

export function parseContract<TSchema extends z.ZodTypeAny>(
  contract: ContractDefinition<TSchema>,
  input: unknown,
): z.infer<TSchema> {
  return contract.schema.parse(input);
}

export function safeParseContract<TSchema extends z.ZodTypeAny>(
  contract: ContractDefinition<TSchema>,
  input: unknown,
) {
  return contract.schema.safeParse(input);
}
