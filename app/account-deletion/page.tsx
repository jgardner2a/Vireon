import { LegalDocumentPage } from "@/app/components/legal/LegalDocumentPage";
import { accountDeletionPolicy } from "@/lib/legal/content/accountDeletion";

export const metadata = {
  title: "Account Deletion Policy · Vireon",
  description: accountDeletionPolicy.description,
};

export default function AccountDeletionPage() {
  return <LegalDocumentPage document={accountDeletionPolicy} />;
}
