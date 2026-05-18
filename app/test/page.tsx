import { supabase } from "@/lib/supabaseClient";

export default async function TestPage() {
  const { data, error } = await supabase.from("test").select("*");

  return (
    <div style={{ padding: 20 }}>
      <h1>Supabase Test Page</h1>

      {error && <p style={{ color: "red" }}>{error.message}</p>}

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}