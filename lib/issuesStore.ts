import { getAuthEmail } from "./authSession";
import {
  DEFAULT_ISSUE_STATUS,
  normalizeIssueStatus,
  type IssueStatus,
} from "./issueStatus";
import { listProperties, type Property } from "./propertiesStore";
import { dataCache } from "./data/cache";
import { updateIssueStatusRow } from "./data/repos";

export type Issue = {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  createdAt: string;
  propertyId: string;
};

export type CreateIssueInput = {
  title: string;
  description: string;
  propertyId: string | number;
};

export type CreateIssueResult =
  | { ok: true; issue: Issue }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "PROPERTY_NOT_FOUND"
        | "NO_PROPERTIES"
        | "ISSUE_LIMIT_REACHED"
        | "NOT_AUTHENTICATED"
        | "PERSIST_FAILED";
      message: string;
      upgradeRequired?: boolean;
    };

export type UpdateIssueStatusResult =
  | { ok: true; issue: Issue }
  | { ok: false; code: "NOT_FOUND" | "PERSIST_FAILED"; message: string };

export function listIssues(): Issue[] {
  if (typeof window === "undefined") return [];
  return [...dataCache.issues];
}

export function listIssuesByPropertyId(
  propertyId: string | number
): Issue[] {
  const key = String(propertyId);
  return listIssues().filter((issue) => String(issue.propertyId) === key);
}

export function getIssueById(id: number | string): Issue | null {
  const key = String(id);
  return listIssues().find((issue) => String(issue.id) === key) ?? null;
}

export function getPropertyForIssue(issue: Issue): Property | undefined {
  return listProperties().find(
    (p) => String(p.id) === String(issue.propertyId)
  );
}

function findProperty(propertyId: string | number): Property | undefined {
  return listProperties().find((p) => String(p.id) === String(propertyId));
}

export async function createIssue(
  input: CreateIssueInput
): Promise<CreateIssueResult> {
  const title = input.title.trim();
  const description = input.description.trim();
  const propertyId = String(input.propertyId);

  if (!title || !description) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Title and description are required.",
    };
  }

  if (!propertyId) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Select a property for this issue.",
    };
  }

  const properties = listProperties();
  if (properties.length === 0) {
    return {
      ok: false,
      code: "NO_PROPERTIES",
      message: "Add a property before logging an issue.",
    };
  }

  const property = findProperty(propertyId);
  if (!property) {
    return {
      ok: false,
      code: "PROPERTY_NOT_FOUND",
      message: "The selected property does not exist.",
    };
  }

  const email = getAuthEmail();
  if (!email) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "You must be signed in to log an issue.",
    };
  }

  const response = await fetch("/api/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      propertyId: property.id,
      title,
      description,
      status: DEFAULT_ISSUE_STATUS,
    }),
  });

  if (response.status === 403) {
    let payload: { message?: string; upgradeRequired?: boolean } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // ignore
    }
    return {
      ok: false,
      code: "ISSUE_LIMIT_REACHED",
      message:
        payload.message ??
        "Free accounts can log up to 4 issues per property.",
      upgradeRequired: payload.upgradeRequired === true,
    };
  }

  if (!response.ok) {
    let payload: { message?: string } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // ignore
    }
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message:
        payload.message ??
        "Could not save the issue. Check your connection and try again.",
    };
  }

  const payload = (await response.json()) as { issue?: Issue };
  if (!payload.issue?.id) {
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message: "Could not save the issue. Check your connection and try again.",
    };
  }

  const issue = payload.issue;
  dataCache.issues.unshift(issue);
  return { ok: true, issue };
}

export async function updateIssueStatus(
  issueId: number | string,
  status: IssueStatus
): Promise<UpdateIssueStatusResult> {
  const existing = getIssueById(issueId);
  if (!existing) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Issue not found.",
    };
  }

  const updated = await updateIssueStatusRow(
    String(issueId),
    normalizeIssueStatus(status)
  );

  if (!updated) {
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message: "Could not update the issue status.",
    };
  }

  return { ok: true, issue: updated };
}
