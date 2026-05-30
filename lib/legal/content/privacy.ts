import { LEGAL_CONTACT_EMAIL, LEGAL_PRODUCT_NAME } from "@/lib/legal/config";import type { LegalDocument } from "@/lib/legal/types";

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  description: `How ${LEGAL_PRODUCT_NAME} collects, uses, stores, and protects your information.`,
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      paragraphs: [
        `This Privacy Policy describes how ${LEGAL_PRODUCT_NAME} ("Vireon," "we," "us," or "our") handles information when you use our website and related services (the "Service").`,
        "Vireon helps residents organize property-related documentation, including maintenance records, communications, notes, photographs, move-in/out snapshots, and selected personal documents such as lease files.",
        "By creating an account or using the Service, you agree to this Privacy Policy. If you do not agree, do not use the Service.",
      ],
    },
    {
      id: "information-we-collect",
      title: "Information We Collect",
      paragraphs: ["We collect the following categories of information:"],
      listItems: [
        "Account information: email address and authentication credentials managed through our authentication provider.",
        "Property information: property names, addresses, and related details you enter for each workspace.",
        "Documentation you submit: maintenance logs, complex issue records, communications, notes, and associated metadata such as dates, categories, and status.",
        "Photographs and files: images uploaded to your gallery, attached to records, included in move-in/out snapshots, and documents you store in My Home (for example, lease or insurance files).",
        "Export activity: when you generate an evidence package, export files are assembled in your browser from your existing records.",
        "Technical information: basic device and browser information, and service logs needed to operate and secure the Service.",
      ],
    },
    {
      id: "nature-of-user-content",
      title: "Nature of User Content",
      paragraphs: [
        "Vireon stores information submitted by users, including maintenance records, communications, notes, photographs, move-in and move-out snapshots, and uploaded documents.",
        "Vireon does not independently verify, review, certify, endorse, or guarantee the accuracy, completeness, authenticity, or legal significance of user-submitted content. Users are solely responsible for the information they choose to upload, record, store, export, or share through the Service.",
      ],
    },
    {
      id: "how-we-use",
      title: "How We Use Information",
      paragraphs: ["We use information to:"],
      listItems: [
        "Provide, maintain, and improve the Service.",
        "Authenticate you and keep your account secure.",
        "Store and display your property documentation within your account.",
        "Enable exports and summaries you request.",
        "Respond to support requests and legal or safety obligations.",
        "Detect, prevent, and address abuse, fraud, or technical issues.",
      ],
    },
    {
      id: "how-we-store",
      title: "How Information Is Stored",
      paragraphs: [
        "Your account data, records, and file metadata are stored in cloud infrastructure operated by our service providers. Files such as photographs and documents are stored in private storage associated with your account.",
        "Data transmitted between your device and the Service is protected using industry-standard encryption in transit.",
        "Access to your data is restricted through account authentication and access-control mechanisms configured for the Service. You access your data when signed in to your account.",
        "We do not sell your personal information.",
      ],
    },
    {
      id: "sharing",
      title: "When We Share Information",
      paragraphs: [
        "Vireon relies on third-party service providers for infrastructure, storage, authentication, analytics, and operational support.",
        "We do not share your property documentation with landlords, property managers, or other third parties unless you choose to share exported materials yourself.",
        "We may share information with service providers that help us operate the Service (for example, hosting, authentication, and storage providers), subject to appropriate confidentiality and security obligations.",
        "We may disclose information if required by law, regulation, legal process, or to protect the rights, safety, and security of users or others.",
      ],
    },
    {
      id: "retention",
      title: "Data Retention",
      paragraphs: [
        "We retain your information while your account is active and as needed to provide the Service.",
        "If you delete your account, we delete or de-identify associated account data in accordance with our Account Deletion Policy, subject to limited retention required for security, legal compliance, or backup recovery windows.",
      ],
    },
    {
      id: "account-deletion",
      title: "Account Deletion",
      paragraphs: [
        "Users may delete their account through the Service where available or by contacting support.",
        "Upon account deletion, Vireon will delete or de-identify account information, records, uploaded files, and associated data, subject to reasonable backup retention periods, legal obligations, fraud prevention requirements, and technical recovery processes.",
        "Some information may remain in secure backups for a limited period before permanent removal.",
      ],
    },
    {
      id: "your-choices",
      title: "Your Choices and Rights",
      paragraphs: ["Depending on where you live, you may have rights to:"],
      listItems: [
        "Access, correct, or delete information associated with your account.",
        "Export your documentation through features provided in the Service.",
        "Close your account and request deletion of associated data.",
        "Withdraw consent where processing is based on consent, subject to legal limits.",
      ],
      afterListParagraphs: [
        "The availability of certain rights may depend on your location and applicable law.",
      ],
    },
    {
      id: "children",
      title: "Children's Privacy",
      paragraphs: [
        "The Service is not intended for children under 13, and we do not knowingly collect personal information from children under 13.",
      ],
    },
    {
      id: "security",
      title: "Security",
      paragraphs: [
        "We use reasonable administrative, technical, and organizational measures designed to protect information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
        "You are responsible for maintaining the confidentiality of your account credentials.",
      ],
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. The effective date at the top of this page indicates when it was last revised. Continued use of the Service after changes become effective constitutes acceptance of the updated policy.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Questions about this Privacy Policy or our data practices may be sent to ${LEGAL_CONTACT_EMAIL}.`,
        "We will make reasonable efforts to respond to privacy-related inquiries in a timely manner.",
      ],
    },
  ],
};
