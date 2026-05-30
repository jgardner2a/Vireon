import { LEGAL_CONTACT_EMAIL, LEGAL_PRODUCT_NAME } from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/types";

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  description: `Terms governing your use of ${LEGAL_PRODUCT_NAME}.`,
  sections: [
    {
      id: "agreement",
      title: "Agreement to Terms",
      paragraphs: [
        `These Terms of Service ("Terms") govern your access to and use of ${LEGAL_PRODUCT_NAME} (the "Service") operated by Vireon ("we," "us," or "our").`,
        "By creating an account or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.",
      ],
    },
    {
      id: "service",
      title: "The Service",
      paragraphs: [
        "Vireon provides tools for organizing property-related documentation, including records, notes, communications, photographs, snapshots, document storage, summaries, and export features.",
        "The Service is a recordkeeping and organization tool only. Vireon does not provide legal advice, legal services, property management services, inspection services, or dispute resolution.",
        "Vireon does not certify, verify, authenticate, or endorse User Content or exported materials. Evidence Packages and other exports are compiled from information you provide and are not legally validated by Vireon.",
        "We may modify, suspend, or discontinue the Service or any feature at any time. To the extent permitted by law, Vireon is not liable for any loss resulting from such changes or from temporary or permanent unavailability of the Service.",
      ],
    },
    {
      id: "eligibility",
      title: "Eligibility and Account",
      paragraphs: [
        "You must be able to form a binding contract to use the Service.",
        "You are responsible for the accuracy of information you provide and for maintaining the security of your account credentials.",
        "You must promptly notify us if you believe your account has been compromised.",
      ],
    },
    {
      id: "your-content",
      title: "Your Content",
      paragraphs: [
        "You retain ownership of the content you upload or enter into the Service, including text, images, and documents ('User Content').",
        "You grant us a limited license to host, store, process, and display User Content solely to operate and provide the Service to you.",
        "You represent that you have the rights necessary to upload and use your User Content in the Service.",
        "You are solely responsible for all User Content you upload, store, create, generate, and export through the Service.",
        "Vireon does not verify the accuracy, completeness, legality, or truthfulness of User Content. Vireon is not responsible for any consequences arising from your use, sharing, or reliance on User Content outside the Service.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use",
      paragraphs: ["You agree not to:"],
      listItems: [
        "Use the Service for unlawful, fraudulent, or harmful purposes.",
        "Upload content that infringes another person's rights or violates applicable law.",
        "Attempt to access another user's account or data without authorization.",
        "Interfere with or disrupt the Service or its security measures.",
        "Reverse engineer or scrape the Service except as permitted by law.",
      ],
    },
    {
      id: "exports",
      title: "Exports and Shared Materials",
      paragraphs: [
        "The Service may allow you to generate downloadable packages containing records and files you select ('Exports'). Exports are generated from user-selected, user-generated data at the time of export.",
        "Vireon does not review or validate Export content before or after generation. You are fully responsible for how Exports are used, shared, distributed, or interpreted by others.",
        "Vireon does not guarantee that exported materials will be accepted by any third party.",
        "Vireon is not liable for disputes, claims, or outcomes arising from Exports or from any reliance on exported materials by you or any third party.",
      ],
    },
    {
      id: "disclaimer",
      title: "Disclaimer of Warranties",
      paragraphs: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        "We do not warrant that the Service will be uninterrupted, error-free, or secure, or that data will never be lost.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      paragraphs: [
        "To the maximum extent permitted by applicable law, Vireon will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill, arising from your use of the Service.",
        "To the maximum extent permitted by applicable law, Vireon's total liability for any claim relating to the Service will not exceed the greater of (a) the amount you paid us for the Service in the twelve (12) months before the claim or (b) one hundred U.S. dollars (US$100). Some jurisdictions do not allow certain limitations; in those cases, our liability will be limited to the minimum extent required by applicable law.",
      ],
    },
    {
      id: "termination",
      title: "Termination",
      paragraphs: [
        "You may stop using the Service at any time and may delete your account or request deletion as described in our Account Deletion Policy.",
        "We may suspend or terminate access to the Service if you violate these Terms or if necessary to protect the Service, users, or third parties.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing Law",
      paragraphs: [
        "These Terms are governed by the laws applicable in the jurisdiction where Vireon operates, without regard to conflict-of-law principles, except where mandatory consumer protections in your jurisdiction apply.",
      ],
    },
    {
      id: "changes",
      title: "Changes to These Terms",
      paragraphs: [
        "We may update these Terms from time to time. The effective date at the top of this page indicates when they were last revised. Continued use after changes become effective constitutes acceptance of the updated Terms.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Questions about these Terms may be sent to ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
