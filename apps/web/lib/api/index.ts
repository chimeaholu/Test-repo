/**
 * RB-002 — Barrel export for the API domain layer.
 *
 * Prefer importing from individual domain modules (e.g. "./identity",
 * "./marketplace") for tree-shaking. This barrel is for convenience.
 */

export { advisoryApi } from "./advisory";
export { auditApi } from "./audit";
export { climateApi } from "./climate";
export { copilotApi } from "./copilot";
export { farmApi } from "./farm";
export { fundApi } from "./fund";
export { identityApi } from "./identity";
export { insuranceApi } from "./insurance";
export type { ActorRole, ConnectivityState } from "./identity";
export { marketplaceApi } from "./marketplace";
export { systemApi } from "./system";
export { walletApi } from "./wallet";

// Backward compat
export { agroApiClient, mockApiClient } from "./api-client";
