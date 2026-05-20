import { normalizeEvidenceLink, type GalleryEvidenceLink } from "./galleryEvidenceLink";
import { dataCache } from "./data/cache";

export type Document = {
  id: string;
  propertyId: string;
  name: string;
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  createdAt: string;
  evidenceLink?: GalleryEvidenceLink;
};

export function listDocuments(): Document[] {
  if (typeof window === "undefined") return [];
  return [...dataCache.documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function listDocumentsByPropertyId(
  propertyId: number | string
): Document[] {
  const key = String(propertyId);
  return listDocuments().filter((doc) => String(doc.propertyId) === key);
}

export function getDocumentById(documentId: string): Document | undefined {
  return listDocuments().find((doc) => doc.id === documentId);
}

/** Re-applies embedded evidence from hydrated links (read-only list today). */
export function withDocumentEvidence(doc: Document): Document {
  const link = normalizeEvidenceLink(doc.evidenceLink);
  if (!link) return doc;
  return { ...doc, evidenceLink: link };
}
