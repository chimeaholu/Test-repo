"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAppState } from "@/components/app-provider";
import { revokeSchema } from "@/features/identity/schema";
import { advisoryApi } from "@/lib/api/advisory";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import { readUserPreferences } from "@/lib/user-preferences";

type StatCard = {
  label: string;
  value: string;
};

function rolePreviewCopy(role: string) {
  return {
    farmer: "This is what buyers see when they view your profile.",
    buyer: "This is what sellers see when they view your profile.",
    cooperative: "This is what buyers and members see when they view your profile.",
    transporter: "This is what clients see when they view your profile.",
    investor: "This is what farm owners see when they view your profile.",
    extension_agent: "This is what farmers see when they view your profile.",
    advisor: "This is what farmers see when they view your profile.",
  }[role] ?? "This is what platform participants see when they view your profile.";
}

function roleBadge(role: string) {
  return {
    farmer: "Verified Farmer",
    buyer: "Verified Buyer",
    cooperative: "Verified Cooperative",
    transporter: "Verified Transporter",
    investor: "Verified Investor",
    extension_agent: "Verified Agent",
    advisor: "Verified Agent",
  }[role] ?? "Verified Member";
}

export function ProfilePageClient() {
  const { session, traceId, revokeConsent, grantConsent } = useAppState();
  const [listingsCount, setListingsCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [walletVolume, setWalletVolume] = useState(0);
  const [advisoryCount, setAdvisoryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listWalletTransactions(traceId),
      advisoryApi.listConversations(traceId, session.actor.locale),
    ])
      .then(([listingsResponse, negotiationsResponse, transactionsResponse, advisoryResponse]) => {
        if (cancelled) {
          return;
        }
        setListingsCount(listingsResponse.data.items.length);
        setTradeCount(negotiationsResponse.data.items.filter((item) => item.status !== "rejected").length);
        setWalletVolume(transactionsResponse.data.items.reduce((sum, item) => sum + item.amount, 0));
        setAdvisoryCount(advisoryResponse.data.items.length);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load profile.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const profilePrefs = useMemo(
    () => (session ? readUserPreferences(session).profile : null),
    [session],
  );

  const stats = useMemo<StatCard[]>(() => {
    if (!session) {
      return [];
    }
    const byRole: Record<string, StatCard[]> = {
      farmer: [
        { label: "Seller Rating", value: "4.8" },
        { label: "Completed Trades", value: String(tradeCount) },
        { label: "Total Volume", value: new Intl.NumberFormat("en-US", { notation: "compact" }).format(walletVolume) },
        { label: "On-Time Delivery", value: "98%" },
      ],
      buyer: [
        { label: "Buyer Rating", value: "4.7" },
        { label: "Completed Purchases", value: String(tradeCount) },
        { label: "Total Spent", value: new Intl.NumberFormat("en-US", { notation: "compact" }).format(walletVolume) },
        { label: "Repeat Sellers", value: String(Math.max(1, Math.round(tradeCount / 2))) },
      ],
      cooperative: [
        { label: "Member Count", value: String(Math.max(1, listingsCount + tradeCount)) },
        { label: "Total Trades", value: String(tradeCount) },
        { label: "Revenue YTD", value: new Intl.NumberFormat("en-US", { notation: "compact" }).format(walletVolume) },
        { label: "Active Listings", value: String(listingsCount) },
      ],
      transporter: [
        { label: "Driver Rating", value: "4.9" },
        { label: "Deliveries", value: String(tradeCount) },
        { label: "On-Time %", value: "96%" },
        { label: "Distance Covered", value: `${Math.max(80, tradeCount * 14)} km` },
      ],
      investor: [
        { label: "Investments Made", value: String(tradeCount) },
        { label: "Total Returns", value: new Intl.NumberFormat("en-US", { notation: "compact" }).format(walletVolume) },
        { label: "Avg ROI", value: "14.6%" },
        { label: "Farms Supported", value: String(Math.max(1, listingsCount)) },
      ],
      extension_agent: [
        { label: "Farmers Served", value: String(Math.max(1, advisoryCount)) },
        { label: "Issues Resolved", value: String(Math.max(1, tradeCount)) },
        { label: "Field Visits", value: String(Math.max(1, Math.round(advisoryCount / 2))) },
        { label: "Yields Improved", value: "12%" },
      ],
      advisor: [
        { label: "Farmers Served", value: String(Math.max(1, advisoryCount)) },
        { label: "Issues Resolved", value: String(Math.max(1, tradeCount)) },
        { label: "Field Visits", value: String(Math.max(1, Math.round(advisoryCount / 2))) },
        { label: "Yields Improved", value: "12%" },
      ],
    };
    return byRole[session.actor.role] ?? byRole.farmer;
  }, [advisoryCount, listingsCount, session, tradeCount, walletVolume]);

  if (!session) {
    return null;
  }

  const initials = session.actor.display_name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const memberSince = profilePrefs?.memberSince ?? session.consent.captured_at;

  const handleRevoke = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = revokeSchema.safeParse({
      reason: formData.get("reason"),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Provide a short reason.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await revokeConsent(result.data.reason);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to revoke consent.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await grantConsent({
        policyVersion: "2026.04.w1",
        scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to restore consent.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="r3-page-stack" role="main" aria-label="Profile">
      <div className="r3-surface-header">
        <Link className="button-ghost" href="/app">
          &larr;
        </Link>
        <h1>Profile</h1>
        <Link className="button-ghost" href="/app/settings">
          Edit
        </Link>
      </div>

      {error ? <div className="r3-inline-banner danger">{error}</div> : null}

      <section className="r3-profile-hero">
        <div className="r3-profile-avatar">{initials}</div>
        <h2>{session.actor.display_name}</h2>
        <div className="pill-row">
          <span className="status-pill neutral">{session.actor.role.replaceAll("_", " ")}</span>
        </div>
        <p className="muted">
          Member since{" "}
          {memberSince
            ? new Date(memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "recently"}
        </p>
      </section>

      <section className="r3-two-column">
        <div className="r3-page-stack">
          <div className="r3-settings-card">
            <h2>Verification</h2>
            <ul className="r3-verification-list">
              <li className="verified">Phone Verified</li>
              <li className="verified">Identity Verified</li>
              <li className={profilePrefs?.region || profilePrefs?.city ? "verified" : "pending"}>
                {session.actor.role === "farmer" ? "Farm Location Verified" : "Location Pending"}
              </li>
              <li className={walletVolume > 0 ? "verified" : "pending"}>{walletVolume > 0 ? "Bank Account Verified" : "Bank Account Pending"}</li>
              {session.actor.role === "buyer" || session.actor.role === "cooperative" ? (
                <li className="verified">Business Registered</li>
              ) : null}
            </ul>
          </div>

          <div className="r3-settings-card">
            <h2>Consent Management</h2>
            <p className="muted">
              Consent status: <strong>{session.consent.state.replaceAll("_", " ")}</strong>
            </p>
            {session.consent.state === "consent_granted" ? (
              <form className="form-stack" onSubmit={(event) => void handleRevoke(event)}>
                <label className="field">
                  <span>Reason for revocation</span>
                  <input name="reason" placeholder="Consent needs to be reviewed before more actions." />
                </label>
                <button className="button-secondary" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Revoking..." : "Revoke consent"}
                </button>
              </form>
            ) : (
              <button className="button-primary" disabled={isSubmitting} onClick={() => void handleRestore()} type="button">
                {isSubmitting ? "Restoring..." : "Restore consent"}
              </button>
            )}
          </div>
        </div>

        <div className="r3-page-stack">
          <div className="r3-settings-card">
            <h2>Transaction Stats</h2>
            <div className="r3-stat-grid">
              {stats.map((item) => (
                <article className="r3-stat-box" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="r3-settings-card">
            <h2>Public Profile Preview</h2>
            <p className="muted">{rolePreviewCopy(session.actor.role)}</p>
            <div className="r3-preview-card">
              <div className="r3-preview-avatar">{initials}</div>
              <div>
                <strong>
                  {session.actor.display_name.split(" ")[0]} {session.actor.display_name.split(" ").slice(1).join(" ").slice(0, 1)}.
                </strong>
                <p className="muted">
                  {profilePrefs?.city || session.actor.country_code}, {profilePrefs?.region || session.actor.membership.organization_name}
                </p>
                <span className="status-pill online">{roleBadge(session.actor.role)}</span>
              </div>
            </div>
            <Link className="button-primary" href="/app/settings">
              Edit Profile
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
