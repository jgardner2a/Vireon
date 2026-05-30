export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  listItems?: string[];
  afterListParagraphs?: string[];
};

export type LegalDocument = {
  title: string;
  description: string;
  sections: LegalSection[];
};
