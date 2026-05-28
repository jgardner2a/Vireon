export const DOCUMENTS_BUCKET = "documents";

export const DOCUMENT_TYPES = [
  "lease_agreement",
  "inspection_report",
  "insurance",
  "pet_profile",
  "security_deposit",
  "rental_application",
  "proof_of_income",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentSection = {
  type: DocumentType;
  title: string;
  subtitle: string;
};

export const DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    type: "lease_agreement",
    title: "Lease Agreement",
    subtitle: "Primary lease document used for residency verification.",
  },
  {
    type: "inspection_report",
    title: "Inspection Report",
    subtitle: "Move-in or move-out inspection records for this property.",
  },
  {
    type: "insurance",
    title: "Insurance",
    subtitle: "Proof of active renters or property insurance coverage.",
  },
  {
    type: "pet_profile",
    title: "Pet Profile",
    subtitle: "Pet registration, agreements, and related property records.",
  },
  {
    type: "security_deposit",
    title: "Security Deposit",
    subtitle: "Deposit receipts, statements, and return documentation.",
  },
  {
    type: "rental_application",
    title: "Rental Application",
    subtitle: "Submitted application materials for this property.",
  },
  {
    type: "proof_of_income",
    title: "Proof of Income",
    subtitle: "Pay stubs, employment letters, or income verification.",
  },
  {
    type: "other",
    title: "Other Documents",
    subtitle: "Additional records that do not fit predefined categories.",
  },
];

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}
