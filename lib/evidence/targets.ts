import { isTransientEvidenceEntityId } from "./entityIds";
import { normalizeEvidenceSourceType } from "./sources";
import type { EvidenceLink, EvidenceTargetType } from "./types";

/** Canonical My Home records evidence may point to. */
export const ALLOWED_EVIDENCE_TARGET_TYPES = [
  "issue",
  "incident",
  "maintenance",
  "lease",
] as const satisfies readonly EvidenceTargetType[];

/** Entity kinds that are sources only — never valid link targets. */
const FORBIDDEN_TARGET_TYPE_KEYS = new Set([
  "media",
  "folder",
  "document",
  "gallery_media",
  "gallery_folder",
  "unsorted",
  "property",
  "vault",
  "container",
]);

const LEGACY_TARGET_TYPE_ALIASES: Record<string, EvidenceTargetType> = {
  maintenance_request: "maintenance",
  maintenance_requests: "maintenance",
  lease_record: "lease",
  lease_records: "lease",
  issues: "issue",
  incidents: "incident",
};

export type EvidenceTargetValidationCode =
  | "INVALID_TARGET_TYPE"
  | "MISSING_TARGET_ID"
  | "TRANSIENT_TARGET"
  | "FORBIDDEN_TARGET_TYPE"
  | "UNKNOWN_ISSUE"
  | "UNKNOWN_INCIDENT"
  | "UNKNOWN_MAINTENANCE"
  | "UNKNOWN_LEASE"
  | "TARGET_ENTITY_MISMATCH";

export type EvidenceTargetValidationResult =
  | { ok: true }
  | { ok: false; code: EvidenceTargetValidationCode; message: string };

export type IssueEvidenceTargetInput = { id: string };
export type IncidentEvidenceTargetInput = { id: string };
export type MaintenanceEvidenceTargetInput = { id: string };
export type LeaseEvidenceTargetInput = { id: string };

export type EvidenceTargetValidationContext = {
  issue?: IssueEvidenceTargetInput | null;
  incident?: IncidentEvidenceTargetInput | null;
  maintenance?: MaintenanceEvidenceTargetInput | null;
  lease?: LeaseEvidenceTargetInput | null;
};

function fail(
  code: EvidenceTargetValidationCode,
  message: string
): EvidenceTargetValidationResult {
  return { ok: false, code, message };
}

/** Maps legacy or plural targetType values to canonical types. */
export function normalizeEvidenceTargetType(
  raw: unknown
): EvidenceTargetType | undefined {
  if (typeof raw !== "string") return undefined;
  const key = raw.trim().toLowerCase();
  if ((ALLOWED_EVIDENCE_TARGET_TYPES as readonly string[]).includes(key)) {
    return key as EvidenceTargetType;
  }
  return LEGACY_TARGET_TYPE_ALIASES[key];
}

export function isAllowedEvidenceTargetType(
  value: unknown
): value is EvidenceTargetType {
  return normalizeEvidenceTargetType(value) != null;
}

/** Gallery folders and other source kinds cannot be used as link targets. */
export function isForbiddenEvidenceTargetType(raw: unknown): boolean {
  if (typeof raw !== "string") return true;
  const key = raw.trim().toLowerCase();
  if (FORBIDDEN_TARGET_TYPE_KEYS.has(key)) return true;
  if (normalizeEvidenceSourceType(key) != null) return true;
  return false;
}

export function validateEvidenceTargetIdentity(
  targetType: unknown,
  targetId: unknown
): EvidenceTargetValidationResult {
  if (isForbiddenEvidenceTargetType(targetType)) {
    return fail(
      "FORBIDDEN_TARGET_TYPE",
      "Folders and gallery entities cannot be used as evidence targets."
    );
  }

  const normalizedType = normalizeEvidenceTargetType(targetType);
  if (!normalizedType) {
    return fail(
      "INVALID_TARGET_TYPE",
      "Evidence target must be an issue, incident, maintenance request, or lease record."
    );
  }

  const id = String(targetId ?? "").trim();
  if (!id) {
    return fail("MISSING_TARGET_ID", "Evidence target id is required.");
  }

  if (isTransientEvidenceEntityId(id)) {
    return fail(
      "TRANSIENT_TARGET",
      "Transient or UI-only references cannot be evidence targets."
    );
  }

  return { ok: true };
}

export function validateEvidenceTarget(
  targetType: unknown,
  targetId: unknown,
  context: EvidenceTargetValidationContext = {}
): EvidenceTargetValidationResult {
  const identity = validateEvidenceTargetIdentity(targetType, targetId);
  if (!identity.ok) return identity;

  const normalizedType = normalizeEvidenceTargetType(targetType)!;
  const id = String(targetId ?? "").trim();

  switch (normalizedType) {
    case "issue": {
      if (!context.issue) {
        return fail("UNKNOWN_ISSUE", "Issue target was not found.");
      }
      if (context.issue.id.trim() !== id) {
        return fail("TARGET_ENTITY_MISMATCH", "Issue target id does not match.");
      }
      return { ok: true };
    }
    case "incident": {
      if (!context.incident) {
        return fail("UNKNOWN_INCIDENT", "Incident target was not found.");
      }
      if (context.incident.id.trim() !== id) {
        return fail(
          "TARGET_ENTITY_MISMATCH",
          "Incident target id does not match."
        );
      }
      return { ok: true };
    }
    case "maintenance": {
      if (!context.maintenance) {
        return fail(
          "UNKNOWN_MAINTENANCE",
          "Maintenance request target was not found."
        );
      }
      if (context.maintenance.id.trim() !== id) {
        return fail(
          "TARGET_ENTITY_MISMATCH",
          "Maintenance target id does not match."
        );
      }
      return { ok: true };
    }
    case "lease": {
      if (!context.lease) {
        return fail("UNKNOWN_LEASE", "Lease record target was not found.");
      }
      if (context.lease.id.trim() !== id) {
        return fail("TARGET_ENTITY_MISMATCH", "Lease target id does not match.");
      }
      return { ok: true };
    }
    default:
      return fail(
        "INVALID_TARGET_TYPE",
        "Evidence target must be an issue, incident, maintenance request, or lease record."
      );
  }
}

export function validateEvidenceTargetOnLink(
  link: Pick<EvidenceLink, "targetType" | "targetId">,
  context: EvidenceTargetValidationContext = {}
): EvidenceTargetValidationResult {
  const hasEntityContext =
    context.issue != null ||
    context.incident != null ||
    context.maintenance != null ||
    context.lease != null;

  if (hasEntityContext) {
    return validateEvidenceTarget(link.targetType, link.targetId, context);
  }

  return validateEvidenceTargetIdentity(link.targetType, link.targetId);
}

export function isIssueEvidenceTarget(link: EvidenceLink): boolean {
  return link.targetType === "issue";
}

export function isIncidentEvidenceTarget(link: EvidenceLink): boolean {
  return link.targetType === "incident";
}

export function isMaintenanceEvidenceTarget(link: EvidenceLink): boolean {
  return link.targetType === "maintenance";
}

export function isLeaseEvidenceTarget(link: EvidenceLink): boolean {
  return link.targetType === "lease";
}
