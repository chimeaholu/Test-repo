/**
 * RB-002 — Backward-compatible facade.
 *
 * Re-exports the unified `agroApiClient` object so that existing consumers
 * (e.g. components/role-home.tsx, tests) continue to work without import
 * changes. New code should import from the domain service modules directly.
 */

import { identityApi } from "./identity";
import { marketplaceApi } from "./marketplace";
import { walletApi } from "./wallet";
import { climateApi } from "./climate";
import { advisoryApi } from "./advisory";
import { auditApi } from "./audit";
import { systemApi } from "./system";
import { insuranceApi } from "./insurance";

// ---------------------------------------------------------------------------
// Unified client facade (backward compat)
// ---------------------------------------------------------------------------

export const agroApiClient = {
  // Identity
  signIn: identityApi.signIn,
  restoreSession: identityApi.restoreSession,
  getStoredSession: identityApi.getStoredSession,
  getStoredAccessToken: identityApi.getStoredAccessToken,
  markConsentPending: identityApi.markConsentPending,
  captureConsent: identityApi.captureConsent,
  revokeConsent: identityApi.revokeConsent,
  evaluateProtectedAction: identityApi.evaluateProtectedAction,
  getQueue: identityApi.getQueue,
  storeQueue: identityApi.storeQueue,
  clear: identityApi.clear,

  // Marketplace
  listListings: marketplaceApi.listListings,
  getListing: marketplaceApi.getListing,
  listListingRevisions: marketplaceApi.listListingRevisions,
  createListing: marketplaceApi.createListing,
  updateListing: marketplaceApi.updateListing,
  publishListing: marketplaceApi.publishListing,
  unpublishListing: marketplaceApi.unpublishListing,
  listNegotiations: marketplaceApi.listNegotiations,
  getNegotiationThread: marketplaceApi.getNegotiationThread,
  createNegotiation: marketplaceApi.createNegotiation,
  counterNegotiation: marketplaceApi.counterNegotiation,
  requestNegotiationConfirmation:
    marketplaceApi.requestNegotiationConfirmation,
  approveNegotiationConfirmation:
    marketplaceApi.approveNegotiationConfirmation,
  rejectNegotiationConfirmation:
    marketplaceApi.rejectNegotiationConfirmation,

  // Wallet & Escrow
  getWalletSummary: walletApi.getWalletSummary,
  listWalletTransactions: walletApi.listWalletTransactions,
  listEscrows: walletApi.listEscrows,
  getEscrow: walletApi.getEscrow,
  fundEscrow: walletApi.fundEscrow,
  releaseEscrow: walletApi.releaseEscrow,
  reverseEscrow: walletApi.reverseEscrow,
  disputeEscrow: walletApi.disputeEscrow,

  // Climate
  listClimateRuntime: climateApi.listRuntime,
  acknowledgeClimateAlert: climateApi.acknowledgeAlert,

  // Insurance
  getInsuranceDashboard: insuranceApi.getDashboard,
  purchaseInsuranceCoverage: insuranceApi.purchaseCoverage,
  getInsuranceClaimDetail: insuranceApi.getClaimDetail,

  // Advisory
  listAdvisoryConversations: advisoryApi.listConversations,

  // Audit
  getAuditEvents: auditApi.getEvents,

  // System
  getSystemSettings: systemApi.getSettings,
};

export const mockApiClient = agroApiClient;
