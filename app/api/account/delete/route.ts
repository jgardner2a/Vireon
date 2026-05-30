import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { deleteAllUserData } from "@/lib/account/deleteAllUserData";
import { getSupabaseAdmin } from "@/lib/supabase/adminClient";

type DeleteAccountBody = {
  password?: string;
  confirmation?: string;
};

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, message: "Sign in to delete your account." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Sign in to delete your account." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as DeleteAccountBody;
    const password = body.password ?? "";
    const confirmation = body.confirmation?.trim() ?? "";

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { ok: false, message: 'Type DELETE to confirm account deletion.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, message: "Current password is required." },
        { status: 400 }
      );
    }

    const anon = getSupabaseAnon();
    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser(accessToken);

    if (userError || !user?.id || !user.email) {
      return NextResponse.json(
        { ok: false, message: "Session expired. Sign in and try again." },
        { status: 401 }
      );
    }

    const { error: passwordError } = await anon.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (passwordError) {
      return NextResponse.json(
        { ok: false, message: "Current password is incorrect." },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    const dataResult = await deleteAllUserData(user.id, admin);
    if (!dataResult.ok) {
      return NextResponse.json(
        { ok: false, message: dataResult.message },
        { status: 500 }
      );
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      console.error("[account] delete auth user", deleteUserError);
      return NextResponse.json(
        {
          ok: false,
          message:
            deleteUserError.message ||
            "Your data was removed but the account could not be deleted. Contact support.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account] delete route", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not delete your account.",
      },
      { status: 500 }
    );
  }
}
