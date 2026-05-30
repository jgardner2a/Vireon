import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_PRODUCT_NAME,
} from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/types";

export const accountDeletionPolicy: LegalDocument = {
  title: "Account Deletion Policy",
  description: `How to request deletion of your ${LEGAL_PRODUCT_NAME} account and associated data.`,
  sections: [
    {
      id: "overview",
      title: "Overview",
      paragraphs: [
        `This Account Deletion Policy explains how you can request deletion of your ${LEGAL_PRODUCT_NAME} account and the data associated with it.`,
        "If you use the Service, you may request that we delete your account and associated personal data, subject to the exceptions described below.",
      ],
    },
    {
      id: "what-is-deleted",
      title: "What Is Deleted",
      paragraphs: [
        "When your account is deleted, we intend to delete or deactivate the following associated data, where applicable:",
      ],
      listItems: [
        "Your account credentials and profile information.",
        "Property workspaces and property details you entered.",
        "Maintenance logs, complex issues, communications, notes, and related metadata.",
        "Gallery images, attachments, snapshot records, and associated stored files.",
        "Documents stored in My Home and associated stored files.",
        "Derived summaries and export packages stored locally on your devices are your responsibility; copies already downloaded remain under your control.",
      ],
    },
    {
      id: "what-may-be-retained",
      title: "What May Be Retained",
      paragraphs: [
        "We may retain limited information where necessary for legitimate purposes, including:",
      ],
      listItems: [
        "Compliance with legal obligations, law enforcement requests, or dispute resolution.",
        "Security, fraud prevention, and enforcement of our Terms of Service.",
        "Temporary backup or recovery copies for a limited period before automated purge.",
        "Aggregated or de-identified data that no longer identifies you.",
      ],
    },
    {
      id: "how-to-request",
      title: "How to Request Deletion",
      paragraphs: [
        `To request account deletion, email ${LEGAL_CONTACT_EMAIL} from the email address associated with your account.`,
        "Include the subject line: Account Deletion Request.",
        "We may ask you to verify account ownership before processing the request.",
        "An in-app account deletion option may be added in a future update. Until then, email is the supported deletion request method.",
      ],
    },
    {
      id: "processing-time",
      title: "Processing Time",
      paragraphs: [
        "We aim to confirm receipt of deletion requests within a reasonable period and to complete deletion within thirty (30) days, unless a longer period is required by law or technical constraints.",
        "Deletion from backups or archival systems may take additional time to fully propagate.",
      ],
    },
    {
      id: "before-you-delete",
      title: "Before You Delete",
      paragraphs: [
        "Account deletion is permanent and cannot be undone.",
        "If you may need your records later—for example, for a landlord dispute, insurance claim, or move-out documentation—export an evidence package or download important files before requesting deletion.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Questions about account deletion may be sent to ${LEGAL_CONTACT_EMAIL}.`,
        `Effective date: ${LEGAL_EFFECTIVE_DATE}.`,
      ],
    },
  ],
};
