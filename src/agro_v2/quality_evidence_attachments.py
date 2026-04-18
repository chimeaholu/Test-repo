"""B-024 quality evidence attachment capture and display model."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import string

from .traceability_event_chain import TraceabilityChainEvent, TraceabilityEventChainService


class EvidenceAttachmentKind(str, Enum):
    IMAGE = "image"
    DOCUMENT = "document"
    CERTIFICATE = "certificate"
    LAB_REPORT = "lab_report"


class EvidenceGalleryViewState(str, Enum):
    EMPTY = "empty"
    READY = "ready"
    FILTERED_EMPTY = "filtered_empty"


class QualityEvidenceAttachmentError(ValueError):
    """Raised when attachment metadata or display assembly is invalid."""


@dataclass(frozen=True)
class QualityEvidenceMetadata:
    captured_at: str
    captured_by: str
    source: str
    checksum_sha256: str
    tags: tuple[str, ...] = ()
    note: str | None = None

    def __post_init__(self) -> None:
        if not self.captured_at.strip():
            raise QualityEvidenceAttachmentError("captured_at is required")
        if not self.captured_by.strip():
            raise QualityEvidenceAttachmentError("captured_by is required")
        if not self.source.strip():
            raise QualityEvidenceAttachmentError("source is required")
        checksum = self.checksum_sha256.strip().lower()
        if len(checksum) != 64 or any(char not in string.hexdigits.lower() for char in checksum):
            raise QualityEvidenceAttachmentError("checksum_sha256 must be a 64-character hex digest")


@dataclass(frozen=True)
class QualityEvidenceAttachment:
    attachment_id: str
    consignment_id: str
    event_id: str
    listing_id: str
    sequence: int
    attachment_kind: EvidenceAttachmentKind
    mime_type: str
    file_name: str
    size_bytes: int
    preview_url: str
    metadata: QualityEvidenceMetadata
    data_check_id: str

    def __post_init__(self) -> None:
        if not self.attachment_id.strip():
            raise QualityEvidenceAttachmentError("attachment_id is required")
        if not self.consignment_id.strip():
            raise QualityEvidenceAttachmentError("consignment_id is required")
        if not self.event_id.strip():
            raise QualityEvidenceAttachmentError("event_id is required")
        if not self.listing_id.strip():
            raise QualityEvidenceAttachmentError("listing_id is required")
        if self.sequence <= 0:
            raise QualityEvidenceAttachmentError("sequence must be > 0")
        if not self.mime_type.strip():
            raise QualityEvidenceAttachmentError("mime_type is required")
        if not self.file_name.strip():
            raise QualityEvidenceAttachmentError("file_name is required")
        if self.size_bytes <= 0:
            raise QualityEvidenceAttachmentError("size_bytes must be > 0")
        if not self.preview_url.strip():
            raise QualityEvidenceAttachmentError("preview_url is required")
        if not self.data_check_id.strip():
            raise QualityEvidenceAttachmentError("data_check_id is required")


@dataclass(frozen=True)
class EvidenceEventDisplay:
    event_id: str
    sequence: int
    event_type: str
    location_code: str
    attachments: tuple[QualityEvidenceAttachment, ...]


@dataclass(frozen=True)
class EvidenceGallerySnapshot:
    view_state: EvidenceGalleryViewState
    total_attachments: int
    visible_events: tuple[EvidenceEventDisplay, ...]


class QualityEvidenceAttachmentService:
    """Binds operator-visible evidence records onto immutable traceability events."""

    _ALLOWED_MIME_TYPES = {
        EvidenceAttachmentKind.IMAGE: {"image/jpeg", "image/png"},
        EvidenceAttachmentKind.DOCUMENT: {"application/pdf"},
        EvidenceAttachmentKind.CERTIFICATE: {"application/pdf"},
        EvidenceAttachmentKind.LAB_REPORT: {"application/pdf", "image/png"},
    }

    _MAX_SIZE_BYTES = {
        EvidenceAttachmentKind.IMAGE: 10_000_000,
        EvidenceAttachmentKind.DOCUMENT: 15_000_000,
        EvidenceAttachmentKind.CERTIFICATE: 15_000_000,
        EvidenceAttachmentKind.LAB_REPORT: 15_000_000,
    }

    def __init__(self, *, chain_service: TraceabilityEventChainService) -> None:
        self._chain_service = chain_service
        self._attachments_by_event: dict[str, list[QualityEvidenceAttachment]] = {}
        self._attachments_by_id: dict[str, QualityEvidenceAttachment] = {}

    def capture_attachment(
        self,
        *,
        attachment_id: str,
        consignment_id: str,
        event_id: str,
        attachment_kind: EvidenceAttachmentKind,
        mime_type: str,
        file_name: str,
        size_bytes: int,
        preview_url: str,
        metadata: QualityEvidenceMetadata,
    ) -> QualityEvidenceAttachment:
        if attachment_id in self._attachments_by_id:
            raise QualityEvidenceAttachmentError("attachment_id already exists")
        event = self._find_event(consignment_id=consignment_id, event_id=event_id)
        self._validate_attachment_policy(
            attachment_kind=attachment_kind,
            mime_type=mime_type,
            size_bytes=size_bytes,
        )

        attachment = QualityEvidenceAttachment(
            attachment_id=attachment_id,
            consignment_id=consignment_id,
            event_id=event_id,
            listing_id=event.listing_id,
            sequence=event.sequence,
            attachment_kind=attachment_kind,
            mime_type=mime_type,
            file_name=file_name,
            size_bytes=size_bytes,
            preview_url=preview_url,
            metadata=metadata,
            data_check_id="DI-006",
        )
        self._attachments_by_id[attachment_id] = attachment
        self._attachments_by_event.setdefault(event_id, []).append(attachment)
        self._attachments_by_event[event_id].sort(key=lambda item: item.attachment_id)
        return attachment

    def build_gallery(
        self,
        *,
        consignment_id: str,
        event_type: str | None = None,
    ) -> EvidenceGallerySnapshot:
        chain = self._chain_service.read_chain(consignment_id)
        displays: list[EvidenceEventDisplay] = []
        total_attachments = 0

        for event in chain:
            if event_type is not None and event.event_type.value != event_type:
                continue
            attachments = tuple(self._attachments_by_event.get(event.event_id, ()))
            if attachments:
                total_attachments += len(attachments)
            displays.append(
                EvidenceEventDisplay(
                    event_id=event.event_id,
                    sequence=event.sequence,
                    event_type=event.event_type.value,
                    location_code=event.location_code,
                    attachments=attachments,
                )
            )

        if not chain or total_attachments == 0:
            return EvidenceGallerySnapshot(
                view_state=(
                    EvidenceGalleryViewState.EMPTY
                    if event_type is None
                    else EvidenceGalleryViewState.FILTERED_EMPTY
                ),
                total_attachments=0,
                visible_events=tuple(displays if event_type is not None else ()),
            )

        visible = tuple(display for display in displays if display.attachments)
        if not visible:
            return EvidenceGallerySnapshot(
                view_state=EvidenceGalleryViewState.FILTERED_EMPTY,
                total_attachments=0,
                visible_events=tuple(displays),
            )

        return EvidenceGallerySnapshot(
            view_state=EvidenceGalleryViewState.READY,
            total_attachments=total_attachments,
            visible_events=visible,
        )

    def _find_event(self, *, consignment_id: str, event_id: str) -> TraceabilityChainEvent:
        chain = self._chain_service.read_chain(consignment_id)
        for event in chain:
            if event.event_id == event_id:
                return event
        raise QualityEvidenceAttachmentError("event_id does not belong to consignment traceability chain")

    def _validate_attachment_policy(
        self,
        *,
        attachment_kind: EvidenceAttachmentKind,
        mime_type: str,
        size_bytes: int,
    ) -> None:
        normalized_mime_type = mime_type.strip().lower()
        if normalized_mime_type not in self._ALLOWED_MIME_TYPES[attachment_kind]:
            raise QualityEvidenceAttachmentError("mime_type is not allowed for attachment_kind")
        if size_bytes > self._MAX_SIZE_BYTES[attachment_kind]:
            raise QualityEvidenceAttachmentError("attachment exceeds maximum size for attachment_kind")
