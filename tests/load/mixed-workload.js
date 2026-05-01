function chooseWeightedAction(actions, random) {
  const totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);
  const target = random() * totalWeight;
  let cursor = 0;
  for (const action of actions) {
    cursor += action.weight;
    if (target <= cursor) {
      return action;
    }
  }
  return actions[actions.length - 1];
}

function shortReference(ctx, prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(ctx.random() * 9999)}`;
}

const actionCatalog = [
  {
    label: "marketplace.read",
    weight: 22,
    run: async (ctx) => {
      const buyer = ctx.pickOne(ctx.context.tokens.buyers);
      const listing = ctx.pickOne(ctx.context.ids.published_listings);
      await ctx.request("marketplace.listings", {
        method: "GET",
        path: "/api/v1/marketplace/listings",
        token: buyer.token,
      });
      if (ctx.random() > 0.45) {
        await ctx.request("marketplace.listing.detail", {
          method: "GET",
          path: `/api/v1/marketplace/listings/${listing.listing_id}`,
          token: buyer.token,
        });
      }
    },
  },
  {
    label: "marketplace.negotiations.read",
    weight: 12,
    run: async (ctx) => {
      const buyer = ctx.context.tokens.primary_buyer;
      const buyerThreads = ctx.context.ids.threads_by_buyer_actor[buyer.actor_id] ?? [];
      await ctx.request("marketplace.negotiations", {
        method: "GET",
        path: "/api/v1/marketplace/negotiations",
        token: buyer.token,
      });
      if (buyerThreads.length === 0) {
        return;
      }
      const thread = ctx.pickOne(buyerThreads);
      await ctx.request("marketplace.negotiation.detail", {
        method: "GET",
        path: `/api/v1/marketplace/negotiations/${thread.thread_id}`,
        token: buyer.token,
      });
    },
  },
  {
    label: "farm.workspace",
    weight: 12,
    run: async (ctx) => {
      const farmer = ctx.context.tokens.primary_farmer;
      const farm = ctx.context.ids.primary_farm;
      await ctx.request("farms.list", {
        method: "GET",
        path: "/api/v1/farms",
        token: farmer.token,
      });
      await ctx.request("farms.fields", {
        method: "GET",
        path: `/api/v1/farms/${farm.farm_id}/fields`,
        token: farmer.token,
      });
      await ctx.request("farms.activities", {
        method: "GET",
        path: `/api/v1/farms/${farm.farm_id}/activities`,
        token: farmer.token,
      });
      await ctx.request("farms.inputs", {
        method: "GET",
        path: `/api/v1/farms/${farm.farm_id}/inputs`,
        token: farmer.token,
      });
      await ctx.request("farms.crop-cycles", {
        method: "GET",
        path: `/api/v1/farms/${farm.farm_id}/crop-cycles`,
        token: farmer.token,
      });
    },
  },
  {
    label: "climate.runtime",
    weight: 10,
    run: async (ctx) => {
      const farmer = ctx.context.tokens.primary_farmer;
      const farm = ctx.context.ids.primary_farm;
      await ctx.request("climate.alerts", {
        method: "GET",
        path: "/api/v1/climate/alerts",
        token: farmer.token,
      });
      await ctx.request("climate.degraded-modes", {
        method: "GET",
        path: "/api/v1/climate/degraded-modes",
        token: farmer.token,
      });
      await ctx.request("climate.observations", {
        method: "GET",
        path: `/api/v1/climate/observations?farm_id=${farm.farm_id}`,
        token: farmer.token,
      });
      await ctx.request("climate.evidence", {
        method: "GET",
        path: "/api/v1/climate/mrv-evidence",
        token: farmer.token,
      });
    },
  },
  {
    label: "wallet.read",
    weight: 10,
    run: async (ctx) => {
      const investor = ctx.context.tokens.primary_investor;
      await ctx.request("wallet.summary", {
        method: "GET",
        path: "/api/v1/wallet/summary?currency=GHS",
        token: investor.token,
      });
      await ctx.request("wallet.transactions", {
        method: "GET",
        path: "/api/v1/wallet/transactions?currency=GHS",
        token: investor.token,
      });
      await ctx.request("wallet.escrows", {
        method: "GET",
        path: "/api/v1/wallet/escrows",
        token: investor.token,
      });
    },
  },
  {
    label: "fund.read",
    weight: 10,
    run: async (ctx) => {
      const investor = ctx.context.tokens.primary_investor;
      const opportunity = ctx.pickOne(ctx.context.ids.opportunities);
      await ctx.request("fund.opportunities", {
        method: "GET",
        path: "/api/v1/fund/opportunities",
        token: investor.token,
      });
      await ctx.request("fund.opportunity.detail", {
        method: "GET",
        path: `/api/v1/fund/opportunities/${opportunity.opportunity_id}`,
        token: investor.token,
      });
      await ctx.request("fund.investments", {
        method: "GET",
        path: "/api/v1/fund/investments",
        token: investor.token,
      });
    },
  },
  {
    label: "transport.read",
    weight: 6,
    run: async (ctx) => {
      const transporter = ctx.context.tokens.primary_transporter;
      const shipment = ctx.pickOne(ctx.context.ids.shipments);
      await ctx.request("transport.loads", {
        method: "GET",
        path: "/api/v1/transport/loads",
        token: transporter.token,
      });
      await ctx.request("transport.shipments", {
        method: "GET",
        path: "/api/v1/transport/shipments",
        token: transporter.token,
      });
      await ctx.request("transport.shipment.detail", {
        method: "GET",
        path: `/api/v1/transport/shipments/${shipment.shipment_id}`,
        token: transporter.token,
      });
    },
  },
  {
    label: "marketplace.write",
    weight: 8,
    run: async (ctx) => {
      const farmer = ctx.pickOne(ctx.context.tokens.farmers);
      const requestId = ctx.randomId("mixed-listing-create");
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
          payload: {
            title: `Mixed workload listing ${requestId}`,
            commodity: "Soybean",
            quantity_tons: 2.5,
            price_amount: 460,
            price_currency: "GHS",
            location: "Kumasi, GH",
            summary: "RB-070 mixed workload listing create.",
          },
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
    label: "wallet.write",
    weight: 5,
    run: async (ctx) => {
      const sender = ctx.pickOne(ctx.context.tokens.wallet_senders);
      const recipient = ctx.pickOne(
        ctx.context.tokens.wallet_recipients.filter((item) => item.actor_id !== sender.actor_id),
      );
      await ctx.request("wallet.transfer", {
        method: "POST",
        path: "/api/v1/wallet/transfers",
        token: sender.token,
        idempotencyKey: `idem-${ctx.randomId("mixed-wallet-transfer")}`,
        body: {
          recipient_actor_id: recipient.actor_id,
          currency: "GHS",
          amount: 3,
          note: "RB-070 mixed transfer",
          reference: shortReference(ctx, "mw"),
        },
        expectedStatus: (statusCode) => statusCode === 200 || statusCode === 409,
      });
    },
  },
  {
    label: "system.health",
    weight: 5,
    run: async (ctx) => {
      await ctx.request("system.healthz", {
        method: "GET",
        path: "/healthz",
        expectedStatus: 200,
      });
      await ctx.request("system.readyz", {
        method: "GET",
        path: "/readyz",
        expectedStatus: 200,
      });
      await ctx.request("system.settings", {
        method: "GET",
        path: "/api/v1/system/settings",
        expectedStatus: 200,
      });
    },
  },
];

export default {
  name: "mixed-workload",
  phases: [
    {
      name: "mixed-200-concurrent",
      concurrency: 200,
      durationSeconds: 24,
      execute: async (ctx) => {
        const action = chooseWeightedAction(actionCatalog, ctx.random);
        await action.run(ctx);
      },
    },
  ],
};
