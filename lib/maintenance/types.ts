export type MaintenanceLog = {
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

export type CreateMaintenanceLogInput = {
  userId: string;
  homeId: string;
  category: string;
  issueType: string;
  description: string;
  status: string;
};

export type UpdateMaintenanceLogInput = {
  id: string;
  userId: string;
  category: string;
  issueType: string;
  description: string;
  status: string;
};
