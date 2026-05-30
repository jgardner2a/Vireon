import type { EvidenceModuleId } from "@/lib/export/types";

export const PACKAGE_BRAND = "Vireon";

export const PACKAGE_PDF_FILENAME = "Property_Evidence_Report.pdf";

export const PACKAGE_COVER = {
  documentTitle: "PROPERTY EVIDENCE PACKAGE",
  documentSubtitle: "Structured Residential Property Documentation",
  exportDateLabel: "Export Date",
  preparedForLabel: "Prepared for",
  documentationSummaryLabel: "Documentation Summary",
  footerParagraphs: [
    "This package contains a structured compilation of property-related records, communications, observations, and photographic documentation associated with the residence identified in this report.",
    "Records are presented in chronological and categorical order based on information available at the time of export.",
    "This package was generated from records maintained within Vireon and reflects the contents of the account as of the export date shown above.",
  ],
} as const;

export const PACKAGE_ABOUT = {
  heading: "About This Package",
  paragraphs: [
    "This document constitutes a point-in-time compilation of property-related records associated with the residence identified on the cover page.",
    "The materials are organized for documentation and recordkeeping purposes. Included categories may comprise maintenance records, landlord and property communications, resident observations, move-in and move-out inspection records, and supporting photographic documentation, as selected for inclusion at the time of export.",
    "Individual sections follow a fixed categorical order. Within each section, entries are arranged by record date unless otherwise noted. Photographic files referenced in this report are also provided separately within the accompanying archive.",
  ],
  noticeHeading: "Notice",
  noticeParagraphs: [
    "Vireon provides recordkeeping and export tools only. Vireon does not verify the accuracy, completeness, or authenticity of user-submitted information.",
    "Vireon does not provide legal advice. Nothing in this package should be construed as legal guidance or as a determination of habitability, liability, or compliance with applicable law.",
    "Recipients should independently review all records, photographs, and supporting documentation and consult qualified professionals as appropriate to their role and jurisdiction.",
  ],
  contentsHeading: "Index of Included Records",
  integrityHeading: "Record Integrity",
  integrityLabels: {
    exportDateTime: "Export Date & Time",
    totalRecords: "Total Records",
    totalImages: "Total Images",
    manifestIncluded: "Manifest Included",
  },
  manifestIncludedValue: "Yes",
} as const;

export const PACKAGE_PAGE_FOOTER_PREFIX = "Property Evidence Package";

export const PACKAGE_README = `Property Evidence Package
============================

This archive contains a structured compilation of property-related records and supporting photographic documentation.

Contents
--------
- Property_Evidence_Report.pdf   Primary documentation report
- manifest.json                  Index of included records and files
- images/                        Photographic documentation by category and record

Use
---
1. Review Property_Evidence_Report.pdf for the complete documentation record.
2. Refer to images/ for photographic files corresponding to entries in the report.
3. Refer to manifest.json to verify record identifiers, file names, and export metadata.

Records reflect information available at the time of export.
`;

export const MODULE_SECTION_COPY: Record<
  EvidenceModuleId,
  { title: string; introduction: string }
> = {
  maintenance: {
    title: "Maintenance & Repairs",
    introduction:
      "This section presents maintenance and repair-related records associated with the residence, including reported concerns, repair requests, documented defects, status entries, and supporting photographic documentation where attached.",
  },
  complex: {
    title: "Complex & Shared-Area Issues",
    introduction:
      "This section presents records relating to building-wide conditions, common areas, and shared facilities, including matters affecting safety, access, cleanliness, habitability, and related building operations.",
  },
  communications: {
    title: "Landlord & Property Communications",
    introduction:
      "This section presents documented correspondence and communications with landlords, property managers, maintenance personnel, and other related parties, including message content, categorization, status, and supporting photographic documentation where attached.",
  },
  notes: {
    title: "Notes & Observations",
    introduction:
      "This section presents resident-recorded observations and ancillary documentation relating to the property, including dated entries and supporting photographic documentation where attached.",
  },
  snapshots: {
    title: "Move-In / Move-Out Snapshots",
    introduction:
      "This section presents move-in and move-out inspection records, including inspection type, date of record, observed conditions, documented issues, and room-organized photographic documentation.",
  },
};

export const RECORD_FIELD_LABELS = {
  created: "Date of record",
  updated: "Last updated",
  status: "Status",
  category: "Category",
  type: "Type",
  issueType: "Issue type",
  snapshotType: "Inspection type",
  attachments: "Photographic documentation",
  documentedIssues: "Documented issues",
  noAttachments: "No photographic documentation is attached to this record.",
  noBody: "No additional narrative text is included in this record.",
  noIssues: "No separate issues are documented for this inspection record.",
} as const;

export function formatDocumentationSummary(
  recordCount: number,
  imageCount: number
): string {
  const records = recordCount === 1 ? "1 record" : `${recordCount} records`;
  const images = imageCount === 1 ? "1 image" : `${imageCount} images`;
  return `${records} · ${images}`;
}
