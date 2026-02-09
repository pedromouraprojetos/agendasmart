import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type StoreRow = { id: string };
type ServiceRow = { id: string; name: string; duration_minutes: number };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") ?? "").trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<StoreRow>();

  if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { data: services, error: svErr } = await supabase
    .from("services")
    .select("id,name,duration_minutes")
    .eq("store_id", store.id)
    .order("created_at", { ascending: true });

  if (svErr) return NextResponse.json({ error: svErr.message }, { status: 500 });

  return NextResponse.json({ services: (services ?? []) as ServiceRow[] });
}
