import { cleanupAttachmentsAfterLogDelete } from "@/lib/attachments/logDeleteAttachmentCleanup";
import {
  DEFAULT_NOTE_CATEGORY,
  normalizeCategory,
} from "@/lib/notes/noteConfig";
import type { CreateNoteInput, Note, UpdateNoteInput } from "@/lib/notes/types";
import { supabase } from "@/lib/supabaseClient";

type NoteRow = {
  id: string;
  user_id: string;
  home_id: string;
  title: string | null;
  category: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: NoteRow): Note {
  return {
    id: row.id,
    user_id: row.user_id,
    home_id: row.home_id,
    title: row.title,
    category: row.category,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeTitle(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function fetchNotes(
  userId: string,
  homeId: string
): Promise<{ ok: true; notes: Note[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notes] fetch", error);
    return {
      ok: false,
      message: error.message || "Could not load notes.",
    };
  }

  return {
    ok: true,
    notes: (data ?? []).map((row) => mapRow(row as NoteRow)),
  };
}

export async function createNote(
  input: CreateNoteInput
): Promise<{ ok: true; note: Note } | { ok: false; message: string }> {
  const content = input.content.trim();

  if (!content) {
    return { ok: false, message: "Please add note content." };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: input.userId,
      home_id: input.homeId,
      title: normalizeTitle(input.title),
      category: normalizeCategory(input.category || DEFAULT_NOTE_CATEGORY),
      content,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[notes] insert", error);
    return {
      ok: false,
      message: error?.message || "Could not create note.",
    };
  }

  return { ok: true, note: mapRow(data as NoteRow) };
}

export async function updateNote(
  input: UpdateNoteInput
): Promise<{ ok: true; note: Note } | { ok: false; message: string }> {
  const content = input.content.trim();

  if (!content) {
    return { ok: false, message: "Please add note content." };
  }

  const { data, error } = await supabase
    .from("notes")
    .update({
      title: normalizeTitle(input.title),
      category: normalizeCategory(input.category || DEFAULT_NOTE_CATEGORY),
      content,
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[notes] update", error);
    return {
      ok: false,
      message: error?.message || "Could not update note.",
    };
  }

  return { ok: true, note: mapRow(data as NoteRow) };
}

export async function deleteNote(
  noteId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: attachmentRows, error: fetchAttachmentsError } = await supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("owner_type", "note")
    .eq("owner_id", noteId)
    .eq("user_id", userId);

  if (fetchAttachmentsError) {
    console.error("[notes] delete fetch attachments", fetchAttachmentsError);
  }

  const attachments = (attachmentRows ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    storage_path: String((row as { storage_path: string }).storage_path ?? ""),
  }));

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);

  if (error) {
    console.error("[notes] delete", error);
    return {
      ok: false,
      message: error.message || "Could not delete note.",
    };
  }

  await cleanupAttachmentsAfterLogDelete("note", attachments);

  return { ok: true };
}
