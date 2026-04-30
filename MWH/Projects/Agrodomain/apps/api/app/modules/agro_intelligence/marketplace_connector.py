from __future__ import annotations

from dataclasses import dataclass

from app.db.models.agro_intelligence import AgroIntelligenceEntity
from app.db.models.marketplace import Listing, NegotiationThread
from app.db.repositories.agro_intelligence import AgroIntelligenceRepository
from app.db.repositories.identity import IdentityRepository
from app.modules.agro_intelligence.runtime import AgroIntelligenceRuntime

BUYER_OPERATOR_TAGS = {"buyer", "processor", "offtaker"}
TRUST_BONUS = {"gold": 12, "silver": 8, "bronze": 4}
FRESHNESS_BONUS = {"fresh": 8, "watch": 4, "stale": 1, "expired": 0}


@dataclass(slots=True)
class EntityMatch:
    entity: AgroIntelligenceEntity
    reasons: list[str]
    score: int


def _normalize(value: str) -> str:
    lowered = value.lower()
    cleaned = "".join(char if char.isalnum() or char.isspace() else " " for char in lowered)
    return " ".join(token for token in cleaned.split() if token)


def _tokens(value: str) -> set[str]:
    return {token for token in _normalize(value).split() if token}


def _location_tokens(value: str) -> set[str]:
    stopwords = {"district", "region", "state", "metropolitan"}
    return {token for token in _tokens(value) if token not in stopwords}


def _is_buyer_like(entity: AgroIntelligenceEntity) -> bool:
    operator_tags = entity.attribute_payload.get("operator_tags")
    if not isinstance(operator_tags, list):
        return False
    operator_tags = {
        str(tag).lower()
        for tag in operator_tags
        if isinstance(tag, str)
    }
    return bool(operator_tags & BUYER_OPERATOR_TAGS)


def _commodity_tags(entity: AgroIntelligenceEntity) -> set[str]:
    commodity_tags = entity.attribute_payload.get("commodity_tags")
    if not isinstance(commodity_tags, list):
        return set()
    return {
        str(tag).lower()
        for tag in commodity_tags
        if isinstance(tag, str)
    }


def _location_signature(entity: AgroIntelligenceEntity) -> str:
    return str(entity.attribute_payload.get("location_signature") or "")


class MarketplaceAgroIntelligenceConnector:
    def __init__(
        self,
        *,
        agro_repository: AgroIntelligenceRepository,
        identity_repository: IdentityRepository,
    ) -> None:
        self.agro_repository = agro_repository
        self.identity_repository = identity_repository
        self.runtime = AgroIntelligenceRuntime(agro_repository)

    def _serialize_matches(self, matches: list[EntityMatch]) -> list[dict[str, object]]:
        entity_ids = [match.entity.entity_id for match in matches]
        freshness_by_entity = self.agro_repository.list_freshness_signals(entity_ids=entity_ids)
        claims_by_entity = self.agro_repository.list_verification_claims(entity_ids=entity_ids)
        payloads: list[dict[str, object]] = []
        for match in matches:
            summary = self.runtime.serialize_entity_summary(
                entity=match.entity,
                freshness_signal=freshness_by_entity.get(match.entity.entity_id),
                verification_claims=claims_by_entity.get(match.entity.entity_id, []),
            )
            payloads.append(
                {
                    **summary,
                    "match_score": match.score,
                    "match_reasons": match.reasons,
                }
            )
        return payloads

    def _entity_match_from_name(
        self,
        *,
        country_code: str,
        name: str | None,
        listing_commodity: str | None,
        listing_location: str | None,
        only_buyers: bool,
    ) -> EntityMatch | None:
        if not name or not name.strip():
            return None

        name_tokens = _tokens(name)
        if not name_tokens:
            return None

        candidates = self.agro_repository.list_entities(
            country_code=country_code,
            entity_type="organization",
            limit=400,
        )
        freshness_by_entity = self.agro_repository.list_freshness_signals(
            entity_ids=[entity.entity_id for entity in candidates]
        )
        best_match: EntityMatch | None = None
        listing_commodity_normalized = _normalize(listing_commodity or "")
        listing_location_tokens = _location_tokens(listing_location or "")

        for entity in candidates:
            if only_buyers and not _is_buyer_like(entity):
                continue

            entity_name_tokens = _tokens(entity.canonical_name)
            if not entity_name_tokens:
                continue

            reasons: list[str] = []
            score = 0

            if _normalize(name) == _normalize(entity.canonical_name):
                score += 70
                reasons.append("normalized_name_exact")
            else:
                overlap = len(name_tokens & entity_name_tokens)
                union = len(name_tokens | entity_name_tokens)
                if union:
                    name_score = int((overlap / union) * 36)
                    if name_score:
                        score += name_score
                        reasons.append(f"name_token_overlap:{overlap}/{union}")

            commodity_tags = _commodity_tags(entity)
            if listing_commodity_normalized and listing_commodity_normalized in commodity_tags:
                score += 10
                reasons.append("commodity_overlap")

            entity_location_tokens = _location_tokens(_location_signature(entity))
            if listing_location_tokens and entity_location_tokens and listing_location_tokens & entity_location_tokens:
                score += 8
                reasons.append("location_overlap")

            if only_buyers and _is_buyer_like(entity):
                score += 6
                reasons.append("buyer_operator_tag")

            score += min(10, entity.confidence_score // 10)
            score += TRUST_BONUS.get(entity.trust_tier, 0)
            freshness = freshness_by_entity.get(entity.entity_id)
            score += FRESHNESS_BONUS.get(freshness.freshness_status if freshness else "fresh", 0)

            if score < 45:
                continue

            candidate = EntityMatch(entity=entity, reasons=reasons, score=score)
            if best_match is None or candidate.score > best_match.score:
                best_match = candidate

        return best_match

    def _buyer_matches_for_listing(self, *, listing: Listing) -> list[EntityMatch]:
        candidates = self.agro_repository.list_entities(
            country_code=listing.country_code,
            entity_type="organization",
            limit=400,
        )
        listing_commodity = _normalize(listing.commodity)
        listing_location_tokens = _location_tokens(listing.location)
        freshness_by_entity = self.agro_repository.list_freshness_signals(
            entity_ids=[entity.entity_id for entity in candidates]
        )

        matches: list[EntityMatch] = []
        for entity in candidates:
            if not _is_buyer_like(entity):
                continue

            commodity_tags = _commodity_tags(entity)
            commodity_score = 0
            reasons: list[str] = []
            if listing_commodity and listing_commodity in commodity_tags:
                commodity_score = 42
                reasons.append("commodity_exact")
            elif commodity_tags:
                continue
            else:
                commodity_score = 10
                reasons.append("commodity_tags_missing")

            location_score = 0
            entity_location_tokens = _location_tokens(_location_signature(entity))
            if listing_location_tokens and entity_location_tokens and listing_location_tokens & entity_location_tokens:
                location_score = 18
                reasons.append("location_overlap")

            freshness = freshness_by_entity.get(entity.entity_id)
            score = commodity_score + location_score
            score += TRUST_BONUS.get(entity.trust_tier, 0)
            score += FRESHNESS_BONUS.get(freshness.freshness_status if freshness else "fresh", 0)
            score += min(10, entity.confidence_score // 10)

            if score < 42:
                continue

            matches.append(EntityMatch(entity=entity, reasons=reasons, score=score))

        matches.sort(key=lambda item: (item.score, item.entity.confidence_score, item.entity.updated_at), reverse=True)
        return matches[:3]

    def build_listing_intelligence(self, *, listing: Listing) -> dict[str, object]:
        seller_session = self.identity_repository.get_session_by_actor(listing.actor_id)
        seller_match = self._entity_match_from_name(
            country_code=listing.country_code,
            name=seller_session.organization_name if seller_session else None,
            listing_commodity=listing.commodity,
            listing_location=listing.location,
            only_buyers=False,
        )
        buyer_matches = self._buyer_matches_for_listing(listing=listing)
        return {
            "listing_id": listing.listing_id,
            "country_code": listing.country_code,
            "matched_buyer_count": len(buyer_matches),
            "buyer_matches": self._serialize_matches(buyer_matches),
            "seller_entity_match": self._serialize_matches([seller_match])[0] if seller_match else None,
        }

    def build_negotiation_intelligence(
        self,
        *,
        listing: Listing | None,
        thread: NegotiationThread,
        viewer_actor_id: str,
    ) -> dict[str, object]:
        counterparty_actor_id = (
            thread.seller_actor_id if thread.buyer_actor_id == viewer_actor_id else thread.buyer_actor_id
        )
        counterparty_session = self.identity_repository.get_session_by_actor(counterparty_actor_id)
        counterparty_is_buyer = counterparty_actor_id == thread.buyer_actor_id
        counterparty_match = self._entity_match_from_name(
            country_code=thread.country_code,
            name=counterparty_session.organization_name if counterparty_session else None,
            listing_commodity=listing.commodity if listing else None,
            listing_location=listing.location if listing else None,
            only_buyers=counterparty_is_buyer,
        )
        return {
            "thread_id": thread.thread_id,
            "listing_id": thread.listing_id,
            "country_code": thread.country_code,
            "counterparty_actor_id": counterparty_actor_id,
            "counterparty_entity_match": self._serialize_matches([counterparty_match])[0]
            if counterparty_match
            else None,
        }
