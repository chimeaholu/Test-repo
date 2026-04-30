"use client";

import type {
  FundingOpportunityCollection,
  FundingOpportunityRead,
  InvestmentCollection,
  InvestmentCreateInput,
  InvestmentRead,
  ResponseEnvelope,
  WalletBalanceRead,
} from "@agrodomain/contracts";
import {
  fundingOpportunityCollectionSchema,
  fundingOpportunityReadSchema,
  investmentCollectionSchema,
  investmentCreateInputSchema,
  investmentReadSchema,
  walletBalanceReadSchema,
} from "@agrodomain/contracts";
import { z } from "zod";

import { requestJson, responseEnvelope, sendCommand } from "../api-client";

const ledgerEntryReceiptSchema = z
  .object({
    entry_id: z.string().min(1),
    wallet_id: z.string().min(1),
    entry_sequence: z.number().int().positive(),
    balance_version: z.number().int().positive(),
  })
  .strict();

const fundInvestmentCommandResultSchema = z
  .object({
    schema_version: z.string().min(1),
    investment: investmentReadSchema,
    opportunity: fundingOpportunityReadSchema,
    wallet: walletBalanceReadSchema,
    ledger_entry: ledgerEntryReceiptSchema,
  })
  .strict();

type FundInvestmentCommandResult = z.infer<typeof fundInvestmentCommandResultSchema>;

type FundInvestmentCommandResponse = ResponseEnvelope<
  FundInvestmentCommandResult & {
    idempotency_key: string;
    replayed: boolean;
    request_id: string;
  }
>;

export const fundApi = {
  async listOpportunities(
    traceId: string,
    options?: { mine?: boolean; q?: string; status?: string },
  ): Promise<ResponseEnvelope<FundingOpportunityCollection>> {
    const params = new URLSearchParams();
    if (options?.mine) {
      params.set("mine", "true");
    }
    if (options?.q) {
      params.set("q", options.q);
    }
    if (options?.status) {
      params.set("status", options.status);
    }
    const suffix = params.toString();
    const response = await requestJson<unknown>(
      `/api/v1/fund/opportunities${suffix ? `?${suffix}` : ""}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(fundingOpportunityCollectionSchema.parse(response.data), traceId);
  },

  async getOpportunity(
    opportunityId: string,
    traceId: string,
  ): Promise<ResponseEnvelope<FundingOpportunityRead>> {
    const response = await requestJson<unknown>(
      `/api/v1/fund/opportunities/${opportunityId}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(fundingOpportunityReadSchema.parse(response.data), traceId);
  },

  async listInvestments(
    traceId: string,
    options?: { status?: string },
  ): Promise<ResponseEnvelope<InvestmentCollection>> {
    const params = new URLSearchParams();
    if (options?.status) {
      params.set("status", options.status);
    }
    const suffix = params.toString();
    const response = await requestJson<unknown>(
      `/api/v1/fund/investments${suffix ? `?${suffix}` : ""}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(investmentCollectionSchema.parse(response.data), traceId);
  },

  async createInvestment(params: {
    actorId: string;
    countryCode: string;
    input: InvestmentCreateInput;
    traceId: string;
  }): Promise<FundInvestmentCommandResponse> {
    const input = investmentCreateInputSchema.parse(params.input);
    const response = await sendCommand<FundInvestmentCommandResult>(
      {
        actorId: params.actorId,
        aggregateRef: input.opportunity_id,
        commandName: "fund.investments.create",
        countryCode: params.countryCode,
        input: input as unknown as Record<string, unknown>,
        mutationScope: "fund.investments",
        journeyIds: ["EP-005"],
        dataCheckIds: ["QG-04"],
        traceId: params.traceId,
      },
      params.traceId,
    );

    const result = fundInvestmentCommandResultSchema.parse(response.data.result);
    return responseEnvelope(
      {
        ...result,
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
      },
      params.traceId,
    );
  },
};

export type FundInvestmentMutation = z.infer<typeof fundInvestmentCommandResultSchema>;
export type FundInvestmentRead = InvestmentRead;
export type FundWalletBalance = WalletBalanceRead;
