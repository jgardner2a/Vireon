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
        "If you use the Service, you may delete your account and associated personal data through the Service or by contacting support, subject to the exceptions described below.",
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
      title: "How to Delete Your Account",
      paragraphs: [
        "Signed-in users may delete their account in the Service without contacting support.",
        "Go to Settings (linked from the site footer), scroll to Delete account, and follow the confirmation steps. You must enter your current password and type DELETE to confirm.",
        "Account deletion takes effect when you complete that confirmation. You will be signed out and your login will no longer work.",
        `If you cannot access your account or need help, email ${LEGAL_CONTACT_EMAIL} from the email address associated with your account. Include the subject line: Account Deletion Request. We may ask you to verify account ownership before processing email requests.`,
      ],
    },
    {
      id: "processing-time",
      title: "Processing Time",
      paragraphs: [
        "In-app account deletion is processed when you complete the confirmation steps in Settings.",
        "Email deletion requests are handled separately. We aim to confirm receipt within a reasonable period and to complete those requests within thirty (30) days, unless a longer period is required by law or technical constraints.",
        "Deletion from backups or archival systems may take additional time to fully propagate.",
      ],
    },
    {
      id: "before-you-delete",
      title: "Before You Delete",
      paragraphs: [
        "Account deletion is permanent and cannot be undone.",
        "If you may need your records later—for example, for a landlord dispute, insurance claim, or move-out documentation—export an evidence package from Settings or download important files before deleting your account.",
        "To remove a single property without closing your account, use the property deletion option in Settings under Data & privacy.",
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
