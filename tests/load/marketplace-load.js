const listingCreatePayload = (ctx, farmer, sequence) => ({
  title: `RB070 listing ${sequence}`,
  commodity: "Maize",
  quantity_tons: 4 + Math.round(ctx.random() * 50) / 10,
  price_amount: 320 + Math.round(ctx.random() * 900),
  price_currency: "GHS",
  location: `Tamale Cluster ${sequence % 9}`,
  summary: `Synthetic marketplace stock generated for RB-070 load lane by ${farmer.actor_id}.`,
});

function shortReference(ctx, prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(ctx.random() * 9999)}`;
}

export default {
  name: "marketplace-load",
  phases: [
    {
      name: "browse-marketplace-listings",
      concurrency: 100,
      durationSeconds: 18,
      execute: async (ctx) => {
        const buyer = ctx.pickOne(ctx.context.tokens.buyers);
        const listing = ctx.pickOne(ctx.context.ids.published_listings);
        const detailRoll = ctx.random();
        await ctx.request("marketplace.listings", {
          method: "GET",
          path: "/api/v1/marketplace/listings",
          token: buyer.token,
        });
        if (detailRoll > 0.35) {
          await ctx.request("marketplace.listing.detail", {
            method: "GET",
            path: `/api/v1/marketplace/listings/${listing.listing_id}`,
            token: buyer.token,
          });
        }
      },
    },
    {
      name: "create-marketplace-listings",
      concurrency: 50,
      durationSeconds: 18,
      execute: async (ctx) => {
        const farmer = ctx.pickOne(ctx.context.tokens.farmers);
        const requestId = ctx.randomId("listing-create");
        await ctx.request("workflow.market.listings.create", {
          method: "POST",
          path: "/api/v1/workflow/commands",
          token: farmer.token,
          idempotencyKey: `idem-${requestId}`,
          body: ctx.commandEnvelope({
            actorId: farmer.actor_id,
            countryCode: farmer.country_code,
            schemaVersion: ctx.context.schema_version,
            commandName: "market.listings.create",
            aggregateRef: "listing",
            mutationScope: "marketplace.listings",
            payload: listingCreatePayload(ctx, farmer, requestId),
            requestId,
            idempotencyKey: `idem-${requestId}`,
            correlationId: requestId,
            journeyIds: ["CJ-002", "RB-070"],
            dataCheckIds: ["DI-001"],
          }),
        });
      },
    },
    {
      name: "negotiation-workflows",
      concurrency: 20,
      durationSeconds: 18,
      execute: async (ctx) => {
        const listing = ctx.pickOne(ctx.context.ids.negotiation_targets);
        const buyer = ctx.pickOne(ctx.context.tokens.buyers);
        const seller = ctx.context.token_lookup[listing.actor_id];
        const createRequestId = ctx.randomId("negotiation-create");
        const createResponse = await ctx.request("workflow.market.negotiations.create", {
          method: "POST",
          path: "/api/v1/workflow/commands",
          token: buyer.token,
          idempotencyKey: `idem-${createRequestId}`,
          body: ctx.commandEnvelope({
            actorId: buyer.actor_id,
            countryCode: buyer.country_code,
            schemaVersion: ctx.context.schema_version,
            commandName: "market.negotiations.create",
            aggregateRef: listing.listing_id,
            mutationScope: "marketplace.negotiations",
            payload: {
              listing_id: listing.listing_id,
              offer_amount: listing.price_amount - 15,
              offer_currency: listing.price_currency,
              note: "RB-070 load offer",
            },
            requestId: createRequestId,
            idempotencyKey: `idem-${createRequestId}`,
            correlationId: createRequestId,
            journeyIds: ["CJ-003", "RB-070"],
            dataCheckIds: ["DI-002"],
          }),
          expectedStatus: (statusCode) => statusCode === 200 || statusCode === 409,
        });

        if (!createResponse.ok || !seller) {
          return;
        }

        const createdThreadId = createResponse.data?.result?.thread?.thread_id;
        if (!createdThreadId) {
          return;
        }

        const detailRequestId = ctx.randomId("negotiation-list");
        await ctx.request("marketplace.negotiations", {
          method: "GET",
          path: "/api/v1/marketplace/negotiations",
          token: buyer.token,
          headers: {
            "X-Phase-Request-ID": detailRequestId,
          },
        });

        const thread = ctx.pickOne(ctx.context.ids.seeded_threads);
        const counterRequestId = ctx.randomId("negotiation-counter");
        await ctx.request("workflow.market.negotiations.counter", {
          method: "POST",
          path: "/api/v1/workflow/commands",
          token: seller.token,
          idempotencyKey: `idem-${counterRequestId}`,
          body: ctx.commandEnvelope({
            actorId: seller.actor_id,
            countryCode: seller.country_code,
            schemaVersion: ctx.context.schema_version,
            commandName: "market.negotiations.counter",
            aggregateRef: createdThreadId,
            mutationScope: "marketplace.negotiations",
            payload: {
              thread_id: createdThreadId,
              offer_amount: listing.price_amount - 5,
              offer_currency: listing.price_currency,
              note: "RB-070 counter offer",
            },
            requestId: counterRequestId,
            idempotencyKey: `idem-${counterRequestId}`,
            correlationId: counterRequestId,
            journeyIds: ["CJ-003", "RB-070"],
            dataCheckIds: ["DI-002"],
          }),
          expectedStatus: (statusCode) => statusCode === 200 || statusCode === 409,
        });
      },
    },
    {
      name: "wallet-operations",
      concurrency: 10,
      durationSeconds: 18,
      execute: async (ctx) => {
        const sender = ctx.pickOne(ctx.context.tokens.wallet_senders);
        const recipient = ctx.pickOne(
          ctx.context.tokens.wallet_recipients.filter((item) => item.actor_id !== sender.actor_id),
        );
        await ctx.request("wallet.transfer", {
          method: "POST",
          path: "/api/v1/wallet/transfers",
          token: sender.token,
          idempotencyKey: `idem-${ctx.randomId("wallet-transfer")}`,
          body: {
            recipient_actor_id: recipient.actor_id,
            currency: "GHS",
            amount: 5,
            note: "RB-070 transfer",
            reference: shortReference(ctx, "wr"),
          },
          expectedStatus: (statusCode) => statusCode === 200 || statusCode === 409,
        });
        await ctx.request("wallet.summary", {
          method: "GET",
          path: "/api/v1/wallet/summary?currency=GHS",
          token: sender.token,
        });
      },
    },
  ],
};
