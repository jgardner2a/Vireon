import { LegalDocumentPage } from "@/app/components/legal/LegalDocumentPage";
import { termsOfService } from "@/lib/legal/content/terms";

export const metadata = {
  title: "Terms of Service · Vireon",
  description: termsOfService.description,
};

export default function TermsPage() {
  return <LegalDocumentPage document={termsOfService} />;
}
