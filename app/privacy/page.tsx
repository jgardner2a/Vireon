import { LegalDocumentPage } from "@/app/components/legal/LegalDocumentPage";
import { privacyPolicy } from "@/lib/legal/content/privacy";

export const metadata = {
  title: "Privacy Policy · Vireon",
  description: privacyPolicy.description,
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyPolicy} />;
}
