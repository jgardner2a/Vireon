export type Note = {
  id: string;
  user_id: string;
  home_id: string;
  title: string | null;
  category: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CreateNoteInput = {
  userId: string;
  homeId: string;
  title: string;
  category: string;
  content: string;
};

export type UpdateNoteInput = {
  id: string;
  userId: string;
  title: string;
  category: string;
  content: string;
};
