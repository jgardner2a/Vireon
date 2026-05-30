import Link from "next/link";
import {
  ROUTE_ACCOUNT_DELETION,
  ROUTE_PRIVACY,
  ROUTE_TERMS,
} from "@/lib/appNavigation";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/config";
import type { LegalDocument } from "@/lib/legal/types";
import "./legal.css";

type LegalDocumentPageProps = {
  document: LegalDocument;
};

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <p className="legal-eyebrow">Vireon</p>
        <h1 className="legal-title">{document.title}</h1>
        <p className="legal-description">{document.description}</p>
        <p className="legal-meta">Effective date: {LEGAL_EFFECTIVE_DATE}</p>
      </header>

      <div className="legal-body">
        {document.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="legal-section"
            aria-labelledby={`${section.id}-heading`}
          >
            <h2 id={`${section.id}-heading`} className="legal-section-title">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={`${section.id}-paragraph-${index}`}
                className="legal-paragraph"
              >
                {paragraph}
              </p>
            ))}
            {section.listItems ? (
              <ul className="legal-list">
                {section.listItems.map((item, index) => (
                  <li key={`${section.id}-list-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.afterListParagraphs?.map((paragraph, index) => (
              <p
                key={`${section.id}-after-list-${index}`}
                className="legal-paragraph"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <footer className="legal-footer">
        <p className="legal-footer-links">
          <Link href={ROUTE_PRIVACY}>Privacy Policy</Link>
          <span aria-hidden> · </span>
          <Link href={ROUTE_TERMS}>Terms of Service</Link>
          <span aria-hidden> · </span>
          <Link href={ROUTE_ACCOUNT_DELETION}>Account Deletion</Link>
        </p>
      </footer>
    </div>
  );
}
