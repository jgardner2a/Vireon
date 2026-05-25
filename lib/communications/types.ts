export type Communication = {
  id: string;
  user_id: string;
  home_id: string;
  title: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateCommunicationInput = {
  userId: string;
  homeId: string;
  title: string;
  category: string;
  message: string;
  status: string;
};

export type UpdateCommunicationInput = {
  id: string;
  userId: string;
  title: string;
  category: string;
  message: string;
  status: string;
};
