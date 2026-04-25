import { z } from "zod";

import { ContractDefinition } from "./common/contract.js";
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
  notificationAttemptContract,
  notificationResultContract,
} from "./notifications/index.js";
import {
  createListingResultContract,
  listingCollectionContract,
  listingCreateInputContract,
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
  climateAlertAcknowledgementContract,
  climateAlertContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
} from "./climate/index.js";
import {
  fundingOpportunityCollectionContract,
  fundingOpportunityCreateInputContract,
  fundingOpportunityReadContract,
  investmentCollectionContract,
  investmentCreateInputContract,
  investmentReadContract,
  investmentWithdrawInputContract,
} from "./finance/index.js";

export const contractCatalog = [
  requestEnvelopeContract,
  responseEnvelopeContract,
  eventEnvelopeContract,
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
  ussdSessionContract,
  whatsappCommandContract,
  offlineQueueCommandContract,
  offlineQueueResultContract,
  translatorCommandContract,
  notificationAttemptContract,
  notificationResultContract,
  settlementNotificationPayloadContract,
  listingCreateInputContract,
  listingUpdateInputContract,
  listingPublishInputContract,
  listingUnpublishInputContract,
  listingRecordContract,
  listingRevisionSummaryContract,
  listingCollectionContract,
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
  climateAlertContract,
  climateAlertAcknowledgementContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
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
