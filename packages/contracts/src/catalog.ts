import { z } from "zod";

import { ContractDefinition } from "./common/contract.js";
import { marketplaceConversionMetricContract } from "./analytics/index.js";
import {
  eventEnvelopeContract,
  requestEnvelopeContract,
  responseEnvelopeContract,
} from "./envelope/index.js";
import { reasonCatalogContract } from "./errors/index.js";
import {
  consentCaptureContract,
  consentGateContract,
  consentRecordContract,
  countryPackContract,
  membershipContract,
} from "./identity/index.js";
import {
  offlineQueueCommandContract,
  offlineQueueResultContract,
  translatorCommandContract,
  ussdSessionContract,
  whatsappCommandContract,
} from "./channels/index.js";
import {
  notificationDispatchPlanContract,
  notificationFeedCollectionContract,
  notificationFeedItemContract,
  notificationAttemptContract,
  notificationResultContract,
} from "./notifications/index.js";
import {
  createListingResultContract,
  listingCollectionContract,
  listingCreateInputContract,
  marketplaceListingIntelligenceReadContract,
  marketplaceNegotiationIntelligenceReadContract,
  listingPublishInputContract,
  listingRecordContract,
  listingRevisionSummaryContract,
  listingUnpublishInputContract,
  listingUpdateInputContract,
  publishListingResultContract,
  unpublishListingResultContract,
  updateListingResultContract,
} from "./marketplace/index.js";
import {
  negotiationCounterInputContract,
  negotiationConfirmationApproveInputContract,
  negotiationConfirmationRejectInputContract,
  negotiationConfirmationRequestInputContract,
  negotiationCreateInputContract,
  negotiationThreadCollectionContract,
  negotiationThreadReadContract,
} from "./negotiation/index.js";
import {
  walletBalanceReadContract,
  walletFundingInputContract,
  walletLedgerEntryContract,
  walletReconciliationInputContract,
  walletReleaseInputContract,
  walletReverseInputContract,
  walletTransactionCollectionContract,
} from "./ledger/index.js";
import {
  escrowCollectionContract,
  escrowDisputeOpenInputContract,
  escrowFundInputContract,
  escrowInitiateInputContract,
  escrowMarkPartnerPendingInputContract,
  escrowReadContract,
  escrowReleaseInputContract,
  escrowReverseInputContract,
  settlementNotificationPayloadContract,
  settlementTimelineEntryContract,
} from "./escrow/index.js";
import {
  policyDecisionContract,
  workflowInstanceContract,
  workflowStepContract,
} from "./workflow/index.js";
import {
  advisoryConversationCollectionContract,
  advisoryCitationContract,
  advisoryRequestInputContract,
  advisoryResponseContract,
  reviewerDecisionContract,
  reviewerDecisionInputContract,
} from "./advisory/index.js";
import {
  copilotExecutionInputContract,
  copilotExecutionResultContract,
  copilotResolveInputContract,
  copilotResolutionContract,
} from "./copilot/index.js";
import {
  climateActionPackContract,
  climateAlertAcknowledgementContract,
  climateAlertContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
  weatherOutlookContract,
} from "./climate/index.js";
import {
  copilotEvaluationReportContract,
  copilotRecommendationCollectionContract,
  copilotRecommendationContract,
} from "./copilot/index.js";
import {
  eventSchemaCatalogContract,
  inboundIngestionRequestContract,
  inboundIngestionResultContract,
  outboundEventCollectionContract,
  reportingSummaryContract,
  webhookDeliveryRecordContract,
  webhookDeliveryRequestContract,
} from "./platform_boundary/index.js";
import {
  agroIntelligenceConsentArtifactContract,
  agroIntelligenceEntityContract,
  agroIntelligenceFreshnessSignalContract,
  agroIntelligenceRelationshipContract,
  agroIntelligenceSchemaReadinessPacketContract,
  agroIntelligenceSourceDocumentContract,
  agroIntelligenceVerificationClaimContract,
} from "./agro_intelligence/index.js";
import {
  fundingOpportunityCollectionContract,
  fundingOpportunityCreateInputContract,
  fundingOpportunityReadContract,
  investmentCollectionContract,
  investmentCreateInputContract,
  investmentReadContract,
  investmentWithdrawInputContract,
  paymentCollectionSessionContract,
} from "./finance/index.js";

export const contractCatalog = [
  requestEnvelopeContract,
  responseEnvelopeContract,
  eventEnvelopeContract,
  marketplaceConversionMetricContract,
  reasonCatalogContract,
  countryPackContract,
  membershipContract,
  consentCaptureContract,
  consentRecordContract,
  consentGateContract,
  workflowInstanceContract,
  workflowStepContract,
  policyDecisionContract,
  advisoryRequestInputContract,
  advisoryCitationContract,
  reviewerDecisionContract,
  advisoryResponseContract,
  advisoryConversationCollectionContract,
  reviewerDecisionInputContract,
  copilotResolveInputContract,
  copilotResolutionContract,
  copilotExecutionInputContract,
  copilotExecutionResultContract,
  ussdSessionContract,
  whatsappCommandContract,
  offlineQueueCommandContract,
  offlineQueueResultContract,
  translatorCommandContract,
  notificationAttemptContract,
  notificationResultContract,
  notificationDispatchPlanContract,
  notificationFeedItemContract,
  notificationFeedCollectionContract,
  settlementNotificationPayloadContract,
  listingCreateInputContract,
  listingUpdateInputContract,
  listingPublishInputContract,
  listingUnpublishInputContract,
  listingRecordContract,
  listingRevisionSummaryContract,
  listingCollectionContract,
  marketplaceListingIntelligenceReadContract,
  marketplaceNegotiationIntelligenceReadContract,
  createListingResultContract,
  updateListingResultContract,
  publishListingResultContract,
  unpublishListingResultContract,
  negotiationCreateInputContract,
  negotiationCounterInputContract,
  negotiationConfirmationRequestInputContract,
  negotiationConfirmationApproveInputContract,
  negotiationConfirmationRejectInputContract,
  negotiationThreadReadContract,
  negotiationThreadCollectionContract,
  walletFundingInputContract,
  walletReleaseInputContract,
  walletReverseInputContract,
  walletReconciliationInputContract,
  walletLedgerEntryContract,
  walletBalanceReadContract,
  walletTransactionCollectionContract,
  escrowInitiateInputContract,
  escrowFundInputContract,
  escrowMarkPartnerPendingInputContract,
  escrowReleaseInputContract,
  escrowReverseInputContract,
  escrowDisputeOpenInputContract,
  settlementTimelineEntryContract,
  escrowReadContract,
  escrowCollectionContract,
  fundingOpportunityCreateInputContract,
  investmentCreateInputContract,
  investmentWithdrawInputContract,
  fundingOpportunityReadContract,
  investmentReadContract,
  fundingOpportunityCollectionContract,
  investmentCollectionContract,
  paymentCollectionSessionContract,
  climateAlertContract,
  climateAlertAcknowledgementContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
  weatherOutlookContract,
  climateActionPackContract,
  copilotRecommendationContract,
  copilotRecommendationCollectionContract,
  copilotEvaluationReportContract,
  eventSchemaCatalogContract,
  outboundEventCollectionContract,
  webhookDeliveryRequestContract,
  webhookDeliveryRecordContract,
  inboundIngestionRequestContract,
  inboundIngestionResultContract,
  reportingSummaryContract,
  agroIntelligenceConsentArtifactContract,
  agroIntelligenceSourceDocumentContract,
  agroIntelligenceEntityContract,
  agroIntelligenceRelationshipContract,
  agroIntelligenceVerificationClaimContract,
  agroIntelligenceFreshnessSignalContract,
  agroIntelligenceSchemaReadinessPacketContract,
] satisfies ContractDefinition[];

export const contractCatalogById = new Map(contractCatalog.map((contract) => [contract.id, contract]));

export type ContractCatalogId = (typeof contractCatalog)[number]["id"];

export function getContract(id: ContractCatalogId) {
  const contract = contractCatalogById.get(id);
  if (!contract) {
    throw new Error(`Unknown contract id: ${id}`);
  }
  return contract;
}
