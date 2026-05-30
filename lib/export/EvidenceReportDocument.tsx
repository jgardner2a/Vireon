import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  formatExportDate,
  formatExportDateTime,
} from "@/lib/export/formatExportDate";
import {
  formatDocumentationSummary,
  MODULE_SECTION_COPY,
  PACKAGE_ABOUT,
  PACKAGE_BRAND,
  PACKAGE_COVER,
  PACKAGE_PAGE_FOOTER_PREFIX,
  RECORD_FIELD_LABELS,
} from "@/lib/export/packageCopy";
import {
  EVIDENCE_MODULE_IDS,
  EVIDENCE_MODULE_LABELS,
  type EvidencePackageContent,
  type EvidencePackageRecord,
} from "@/lib/export/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#111111",
  },
  coverPage: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: "#111111",
    justifyContent: "space-between",
    minHeight: "100%",
  },
  brand: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#666666",
    textTransform: "uppercase",
  },
  coverTitle: {
    marginTop: 96,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  coverSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#444444",
  },
  coverPropertyName: {
    marginTop: 36,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  coverPropertyAddress: {
    marginTop: 6,
    fontSize: 11,
    color: "#444444",
    maxWidth: 360,
  },
  coverMetaBlock: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
  },
  coverMetaLabel: {
    fontSize: 9,
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 11,
  },
  coverFooter: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.55,
    maxWidth: 460,
  },
  coverFooterParagraph: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.55,
    maxWidth: 460,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 24,
    fontSize: 8,
    color: "#888888",
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  h1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  h3: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 10,
    color: "#222222",
  },
  disclaimer: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 9,
    color: "#444444",
    lineHeight: 1.55,
  },
  noticeHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 8,
  },
  integrityBox: {
    marginTop: 8,
    marginBottom: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: "#fafafa",
    borderRadius: 4,
  },
  integrityHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#444444",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  sectionIntro: {
    fontSize: 10,
    color: "#444444",
    lineHeight: 1.5,
    marginBottom: 14,
  },
  sectionDivider: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
  },
  recordDivider: {
    marginTop: 4,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  tocSection: {
    marginBottom: 10,
  },
  tocSectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  tocRecord: {
    fontSize: 10,
    color: "#444444",
    marginBottom: 2,
    paddingLeft: 10,
  },
  tocMeta: {
    fontSize: 9,
    color: "#888888",
    marginBottom: 6,
    paddingLeft: 10,
  },
  metaGrid: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    width: 118,
    fontSize: 9,
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    flex: 1,
    fontSize: 10,
  },
  bodyText: {
    fontSize: 10,
    color: "#222222",
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  },
  attachmentsHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 4,
  },
  imageBlock: {
    marginBottom: 12,
  },
  image: {
    width: 240,
    height: 180,
    objectFit: "contain",
    backgroundColor: "#f3f3f3",
    marginBottom: 4,
  },
  imageCaption: {
    fontSize: 8,
    color: "#666666",
  },
  issueItem: {
    marginBottom: 6,
  },
  muted: {
    fontSize: 10,
    color: "#666666",
    fontStyle: "italic",
  },
});

type EvidenceReportDocumentProps = {
  content: EvidencePackageContent;
  imageDataByPath: Record<string, string | null>;
};

type SectionGroup = {
  moduleId: EvidencePackageRecord["moduleId"];
  label: string;
  records: EvidencePackageRecord[];
};

function PageFooter({ propertyName }: { propertyName: string }) {
  return (
    <Text
      style={styles.footer}
      render={({ pageNumber, totalPages }) =>
        `${PACKAGE_PAGE_FOOTER_PREFIX} · ${propertyName} · Page ${pageNumber} of ${totalPages}`
      }
      fixed
    />
  );
}

function RecordIntegrityBox({
  exportedAt,
  recordCount,
  imageCount,
}: {
  exportedAt: string;
  recordCount: number;
  imageCount: number;
}) {
  return (
    <View style={styles.integrityBox}>
      <Text style={styles.integrityHeading}>
        {PACKAGE_ABOUT.integrityHeading}
      </Text>
      <MetaRow
        label={PACKAGE_ABOUT.integrityLabels.exportDateTime}
        value={formatExportDateTime(exportedAt)}
      />
      <MetaRow
        label={PACKAGE_ABOUT.integrityLabels.totalRecords}
        value={String(recordCount)}
      />
      <MetaRow
        label={PACKAGE_ABOUT.integrityLabels.totalImages}
        value={String(imageCount)}
      />
      <MetaRow
        label={PACKAGE_ABOUT.integrityLabels.manifestIncluded}
        value={PACKAGE_ABOUT.manifestIncludedValue}
      />
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function RecordImagesInline({
  images,
  imageDataByPath,
  showHeading = true,
}: {
  images: EvidencePackageRecord["images"];
  imageDataByPath: Record<string, string | null>;
  showHeading?: boolean;
}) {
  return (
    <>
      {showHeading ? (
        <Text style={styles.attachmentsHeading}>{RECORD_FIELD_LABELS.attachments}</Text>
      ) : null}
      {images.map((image) => {
        const dataUrl = imageDataByPath[image.storagePath];
        const captionParts = [
          image.fileName,
          image.room ? `Room: ${image.room}` : null,
        ].filter(Boolean);

        return (
          <View key={image.id} style={styles.imageBlock}>
            {dataUrl ? (
              <Image src={dataUrl} style={styles.image} />
            ) : (
              <Text style={styles.muted}>
                Image unavailable in report: {image.fileName}
              </Text>
            )}
            <Text style={styles.imageCaption}>{captionParts.join(" · ")}</Text>
          </View>
        );
      })}
    </>
  );
}

function RecordTextSection({ record }: { record: EvidencePackageRecord }) {
  const body = record.body.trim() || RECORD_FIELD_LABELS.noBody;

  return (
    <>
      <Text style={styles.h3}>{record.title}</Text>
      <View style={styles.metaGrid}>
        <MetaRow
          label={RECORD_FIELD_LABELS.created}
          value={formatExportDate(record.createdAt)}
        />
        <MetaRow
          label={RECORD_FIELD_LABELS.updated}
          value={record.updatedAt ? formatExportDate(record.updatedAt) : null}
        />
        <MetaRow label={RECORD_FIELD_LABELS.status} value={record.status} />
        <MetaRow label={RECORD_FIELD_LABELS.category} value={record.category} />
        <MetaRow
          label={RECORD_FIELD_LABELS.issueType}
          value={record.detailLabel}
        />
        {record.snapshotType ? (
          <MetaRow
            label={RECORD_FIELD_LABELS.snapshotType}
            value={record.title}
          />
        ) : null}
      </View>

      {record.moduleId === "snapshots" &&
      record.snapshotIssues &&
      record.snapshotIssues.length > 0 ? (
        <>
          <Text style={styles.attachmentsHeading}>
            {RECORD_FIELD_LABELS.documentedIssues}
          </Text>
          {record.snapshotIssues.map((issue) => (
            <View key={`${issue.label}-${issue.room ?? "none"}`} style={styles.issueItem}>
              <Text style={styles.bodyText}>
                {issue.label}
                {issue.room ? ` (${issue.room})` : ""}
                {issue.severity ? ` — ${issue.severity} severity` : ""}
                {issue.notes ? `\n${issue.notes}` : ""}
              </Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.bodyText}>{body}</Text>
      )}
    </>
  );
}

function SectionHeader({ section }: { section: SectionGroup }) {
  const sectionImages = section.records.reduce(
    (sum, record) => sum + record.images.length,
    0
  );

  return (
    <>
      <Text style={styles.sectionTitle}>
        {MODULE_SECTION_COPY[section.moduleId].title}
      </Text>
      <Text style={styles.sectionIntro}>
        {MODULE_SECTION_COPY[section.moduleId].introduction}
      </Text>
      <Text style={styles.tocMeta}>
        {section.records.length}{" "}
        {section.records.length === 1 ? "record" : "records"} · {sectionImages}{" "}
        {sectionImages === 1 ? "image" : "images"}
      </Text>
      <View style={styles.sectionDivider} />
    </>
  );
}

function chunkImages<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function groupRecordsByModule(content: EvidencePackageContent): SectionGroup[] {
  return EVIDENCE_MODULE_IDS.map((moduleId) => ({
    moduleId,
    label: EVIDENCE_MODULE_LABELS[moduleId],
    records: content.records.filter((record) => record.moduleId === moduleId),
  })).filter((section) => section.records.length > 0);
}

function renderSectionPages(
  section: SectionGroup,
  propertyName: string,
  imageDataByPath: Record<string, string | null>
) {
  return section.records.flatMap((record, recordIndex) => {
    const isFirstInSection = recordIndex === 0;
    const inlineImages =
      record.images.length > 0 && record.images.length <= 2
        ? record.images
        : [];
    const remainingImages =
      record.images.length > 2 ? record.images.slice(2) : [];
    const imageChunks =
      remainingImages.length > 0 ? chunkImages(remainingImages, 2) : [];

    const pages = [
      <Page key={`${record.id}-text`} size="LETTER" style={styles.page}>
        {isFirstInSection ? <SectionHeader section={section} /> : null}
        {!isFirstInSection ? <View style={styles.recordDivider} /> : null}
        <RecordTextSection record={record} />
        {record.images.length === 0 ? (
          <Text style={styles.muted}>{RECORD_FIELD_LABELS.noAttachments}</Text>
        ) : null}
        {inlineImages.length > 0 ? (
          <RecordImagesInline
            images={inlineImages}
            imageDataByPath={imageDataByPath}
          />
        ) : null}
        <PageFooter propertyName={propertyName} />
      </Page>,
    ];

    imageChunks.forEach((chunk, chunkIndex) => {
      pages.push(
        <Page
          key={`${record.id}-images-${chunkIndex}`}
          size="LETTER"
          style={styles.page}
        >
          <Text style={styles.attachmentsHeading}>
            {record.title} · {RECORD_FIELD_LABELS.attachments} ·{" "}
            {chunkIndex + 1 + (inlineImages.length > 0 ? 1 : 0)} of{" "}
            {imageChunks.length + (inlineImages.length > 0 ? 1 : 0)}
          </Text>
          <RecordImagesInline
            images={chunk}
            imageDataByPath={imageDataByPath}
            showHeading={false}
          />
          <PageFooter propertyName={propertyName} />
        </Page>
      );
    });

    return pages;
  });
}

export function EvidenceReportDocument({
  content,
  imageDataByPath,
}: EvidenceReportDocumentProps) {
  const sections = groupRecordsByModule(content);
  const totalImages = content.records.reduce(
    (sum, record) => sum + record.images.length,
    0
  );

  return (
    <Document
      title={`${PACKAGE_COVER.documentTitle} — ${content.property.name}`}
      author={PACKAGE_BRAND}
      subject="Structured residential property documentation"
    >
      <Page size="LETTER" style={styles.coverPage}>
        <View>
          <Text style={styles.brand}>{PACKAGE_BRAND}</Text>
          <Text style={styles.coverTitle}>{PACKAGE_COVER.documentTitle}</Text>
          <Text style={styles.coverSubtitle}>{PACKAGE_COVER.documentSubtitle}</Text>
          <Text style={styles.coverPropertyName}>{content.property.name}</Text>
          <Text style={styles.coverPropertyAddress}>
            {content.property.address || "No address on file"}
          </Text>
          <View style={styles.coverMetaBlock}>
            <Text style={styles.coverMetaLabel}>{PACKAGE_COVER.exportDateLabel}</Text>
            <Text style={styles.coverMetaValue}>
              {formatExportDateTime(content.exportedAt)}
            </Text>
            {content.exporterEmail ? (
              <>
                <Text style={[styles.coverMetaLabel, { marginTop: 12 }]}>
                  {PACKAGE_COVER.preparedForLabel}
                </Text>
                <Text style={styles.coverMetaValue}>{content.exporterEmail}</Text>
              </>
            ) : null}
            <Text style={[styles.coverMetaLabel, { marginTop: 12 }]}>
              {PACKAGE_COVER.documentationSummaryLabel}
            </Text>
            <Text style={styles.coverMetaValue}>
              {formatDocumentationSummary(content.records.length, totalImages)}
            </Text>
          </View>
        </View>
        <View>
          {PACKAGE_COVER.footerParagraphs.map((paragraph) => (
            <Text key={paragraph.slice(0, 32)} style={styles.coverFooterParagraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{PACKAGE_ABOUT.heading}</Text>
        {PACKAGE_ABOUT.paragraphs.map((paragraph) => (
          <Text key={paragraph.slice(0, 32)} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        <RecordIntegrityBox
          exportedAt={content.exportedAt}
          recordCount={content.records.length}
          imageCount={totalImages}
        />

        <Text style={styles.noticeHeading}>{PACKAGE_ABOUT.noticeHeading}</Text>
        {PACKAGE_ABOUT.noticeParagraphs.map((paragraph) => (
          <Text key={paragraph.slice(0, 32)} style={styles.disclaimer}>
            {paragraph}
          </Text>
        ))}

        <Text style={styles.h2}>{PACKAGE_ABOUT.contentsHeading}</Text>
        {sections.map((section) => {
          const sectionImages = section.records.reduce(
            (sum, record) => sum + record.images.length,
            0
          );

          return (
            <View key={section.moduleId} style={styles.tocSection}>
              <Text style={styles.tocSectionTitle}>
                {MODULE_SECTION_COPY[section.moduleId].title}
              </Text>
              <Text style={styles.tocMeta}>
                {section.records.length}{" "}
                {section.records.length === 1 ? "record" : "records"} ·{" "}
                {sectionImages} {sectionImages === 1 ? "image" : "images"}
              </Text>
              {section.records.map((record) => (
                <Text key={record.id} style={styles.tocRecord}>
                  · {record.title}
                </Text>
              ))}
            </View>
          );
        })}
        <PageFooter propertyName={content.property.name} />
      </Page>

      {sections.flatMap((section) =>
        renderSectionPages(section, content.property.name, imageDataByPath)
      )}
    </Document>
  );
}
