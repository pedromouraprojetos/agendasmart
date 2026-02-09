// src/app/api/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  STORE_TZ,
  addMinutes,
  lisbonDayRangeUtc,
  lisbonLocalToUtc,
  overlaps,
} from "@/lib/tz";

type StoreRow = { id: string };

type WorkingHourRow = {
  day_of_week: number;
  slot: 1 | 2;
  is_open: boolean;
  start_time: string;
  end_time: string;
};

type AppointmentRow = {
  start_at: string;
  end_at: string;
  buffer_after_minutes_snapshot: number | null;
};

type BlockRow = {
  start_at: string;
  end_at: string;
  staff_id: string | null;
};

type Range = { start: Date; end: Date };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function toHHMM(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const slug = (searchParams.get("slug") ?? "").trim();
    const staffId = (searchParams.get("staffId") ?? "").trim();
    const date = (searchParams.get("date") ?? "").trim(); // YYYY-MM-DD

    const serviceMinutes = Number(searchParams.get("serviceMinutes") ?? "30");
    const stepMinutes = Number(searchParams.get("stepMinutes") ?? "15");
    const leadMinutes = Number(searchParams.get("leadMinutes") ?? "120");
    const bufferAfter = Number(searchParams.get("bufferAfter") ?? "0");

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    if (!staffId) return NextResponse.json({ error: "Missing staffId" }, { status: 400 });
    if (!date) return NextResponse.json({ error: "Missing date (YYYY-MM-DD)" }, { status: 400 });
    if (!Number.isFinite(serviceMinutes) || serviceMinutes <= 0) {
      return NextResponse.json({ error: "Invalid serviceMinutes" }, { status: 400 });
    }

    // 1) loja
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<StoreRow>();

    if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 });
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    // 2) intervalo do dia em UTC (Lisboa) — a tua função devolve {start,end}
    const { start: dayStartUtc, end: dayEndUtc } = lisbonDayRangeUtc(date);

    // dayOfWeek em Lisboa (0=Dom..6=Sáb)
    const midUtc = lisbonLocalToUtc(date, "12:00");
    const dayOfWeek = midUtc.getUTCDay();

    // 3) horários do staff nesse dia
    const { data: hours, error: hoursErr } = await supabase
      .from("staff_working_hours")
      .select("day_of_week,slot,is_open,start_time,end_time")
      .eq("store_id", store.id)
      .eq("staff_id", staffId)
      .eq("day_of_week", dayOfWeek);

    if (hoursErr) return NextResponse.json({ error: hoursErr.message }, { status: 500 });

    const openSlots = (hours ?? [])
      .filter((h: WorkingHourRow) => h.is_open)
      .map((h: WorkingHourRow) => ({
        start: toHHMM(h.start_time),
        end: toHHMM(h.end_time),
      }));

    if (openSlots.length === 0) return NextResponse.json({ slots: [] });

    // 4) marcações do dia
    const { data: appts, error: apptsErr } = await supabase
      .from("appointments")
      .select("start_at,end_at,buffer_after_minutes_snapshot")
      .eq("store_id", store.id)
      .eq("staff_id", staffId)
      .gte("start_at", dayStartUtc.toISOString())
      .lt("start_at", dayEndUtc.toISOString());

    if (apptsErr) return NextResponse.json({ error: apptsErr.message }, { status: 500 });

    const busy: Range[] = (appts ?? []).map((a: AppointmentRow) => {
      const s = new Date(a.start_at);
      const e = new Date(a.end_at);
      const buf = Number(a.buffer_after_minutes_snapshot ?? 0);
      return { start: s, end: addMinutes(e, buf) };
    });

    // 5) bloqueios (globais + staff)
    const { data: blocksDb, error: blocksErr } = await supabase
      .from("availability_blocks")
      .select("start_at,end_at,staff_id")
      .eq("store_id", store.id)
      .or(`staff_id.is.null,staff_id.eq.${staffId}`)
      .gte("end_at", dayStartUtc.toISOString())
      .lte("start_at", dayEndUtc.toISOString());

    if (blocksErr) return NextResponse.json({ error: blocksErr.message }, { status: 500 });

    const blocked: Range[] = (blocksDb ?? []).map((b: BlockRow) => ({
      start: new Date(b.start_at),
      end: new Date(b.end_at),
    }));

    // 6) gerar slots
    const occupyMinutes = serviceMinutes + bufferAfter;
    const minStartAllowed = addMinutes(new Date(), leadMinutes);

    const resultSlots: string[] = [];

    for (const w of openSlots) {
      const blockStartUtc = lisbonLocalToUtc(date, w.start);
      const blockEndUtc = lisbonLocalToUtc(date, w.end);

      let cursor = new Date(blockStartUtc);

      while (cursor < blockEndUtc) {
        const candidateStart = new Date(cursor);
        const candidateEnd = addMinutes(candidateStart, occupyMinutes);

        if (candidateEnd <= blockEndUtc && candidateStart >= minStartAllowed) {
          const hitBusy = busy.some((x) => overlaps(candidateStart, candidateEnd, x.start, x.end));
          if (!hitBusy) {
            const hitBlock = blocked.some((x) => overlaps(candidateStart, candidateEnd, x.start, x.end));
            if (!hitBlock) {
              const hhmmLocal = new Intl.DateTimeFormat("en-GB", {
                timeZone: STORE_TZ,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(candidateStart);

              resultSlots.push(hhmmLocal);
            }
          }
        }

        cursor = addMinutes(cursor, stepMinutes);
      }
    }

    const unique = Array.from(new Set(resultSlots)).sort();
    return NextResponse.json({ slots: unique });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
