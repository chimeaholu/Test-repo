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
  countryPackRuntimeContract,
  environmentProfileContract,
  featureFlagContract,
  rolloutPolicyContract,
} from "./config/index.js";
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
  policyDecisionContract,
  workflowInstanceContract,
  workflowStepContract,
} from "./workflow/index.js";
import {
  adminAnalyticsProvenanceContract,
  adminAnalyticsSnapshotContract,
  adminServiceLevelSummaryContract,
} from "./analytics/index.js";
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
  evidenceAttachmentContract,
  financeApprovalActionContract,
  financeDecisionContract,
  financeDecisionInputContract,
  financePartnerRequestContract,
  financePartnerRequestInputContract,
  financeReviewDetailContract,
  financeReviewQueueItemContract,
  insurancePayoutEventContract,
  insuranceTriggerEvaluationContract,
  insuranceTriggerEvaluationInputContract,
  insuranceTriggerRegistryContract,
} from "./finance/index.js";
import {
  consignmentContract,
  consignmentCreateInputContract,
  traceabilityEventContract,
  traceabilityEventAppendInputContract,
  traceabilityTimelineReadContract,
} from "./traceability/index.js";
import {
  releaseReadinessStatusContract,
  rolloutControlInputContract,
  rolloutStatusCollectionContract,
  rolloutStatusContract,
  sloEvaluationCollectionContract,
  sloEvaluationContract,
  telemetryObservationInputContract,
  telemetryObservationRecordContract,
} from "./observability/index.js";

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
  countryPackRuntimeContract,
  featureFlagContract,
  rolloutPolicyContract,
  environmentProfileContract,
  workflowInstanceContract,
  workflowStepContract,
  policyDecisionContract,
  adminAnalyticsProvenanceContract,
  adminServiceLevelSummaryContract,
  adminAnalyticsSnapshotContract,
  advisoryRequestInputContract,
  advisoryCitationContract,
  reviewerDecisionContract,
  advisoryResponseContract,
  advisoryConversationCollectionContract,
  reviewerDecisionInputContract,
  financePartnerRequestInputContract,
  financeDecisionInputContract,
  insuranceTriggerEvaluationInputContract,
  financePartnerRequestContract,
  financeDecisionContract,
  financeReviewQueueItemContract,
  financeReviewDetailContract,
  financeApprovalActionContract,
  insuranceTriggerRegistryContract,
  insuranceTriggerEvaluationContract,
  insurancePayoutEventContract,
  consignmentCreateInputContract,
  consignmentContract,
  traceabilityEventAppendInputContract,
  traceabilityEventContract,
  traceabilityTimelineReadContract,
  evidenceAttachmentContract,
  ussdSessionContract,
  whatsappCommandContract,
  offlineQueueCommandContract,
  offlineQueueResultContract,
  translatorCommandContract,
  notificationAttemptContract,
  notificationResultContract,
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
  climateAlertContract,
  climateAlertAcknowledgementContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
  rolloutControlInputContract,
  rolloutStatusContract,
  rolloutStatusCollectionContract,
  telemetryObservationInputContract,
  telemetryObservationRecordContract,
  sloEvaluationContract,
  sloEvaluationCollectionContract,
  releaseReadinessStatusContract,
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
