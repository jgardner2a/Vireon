import {
  formatEvidenceAttachmentLabel,
  type EvidenceAttachmentCounts,
} from "@/lib/evidence";

type IssueEvidenceAttachmentCountProps = {
  counts: EvidenceAttachmentCounts;
  className?: string;
};

export function IssueEvidenceAttachmentCount({
  counts,
  className = "",
}: IssueEvidenceAttachmentCountProps) {
  const label = formatEvidenceAttachmentLabel(counts);
  if (!label) return null;

  return (
    <span
      className={`my-home-issue-evidence-attachment-count ${className}`.trim()}
      title={`${counts.totalAttachments} linked attachment${counts.totalAttachments === 1 ? "" : "s"}`}
    >
      {label}
    </span>
  );
}
