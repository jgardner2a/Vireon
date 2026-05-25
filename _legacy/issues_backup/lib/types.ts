// LEGACY ISSUES MODULE - REPLACED BY lib/maintenance/types.ts

export type Issue = {
  id: string;
  user_id: string;
  home_id: string;
  category: string;
  issue_type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

export type CreateIssueInput = {
  userId: string;
  homeId: string;
  category: string;
  issueType: string;
  description: string;
  status: string;
};
