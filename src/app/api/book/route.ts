// src/app/api/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { STORE_TZ, addMinutes, lisbonLocalToUtc, lisbonDayRangeUtc, overlaps } from "@/lib/tz";

type StoreRow = { id: string; slug: string; name: string };
type StaffRow = { id: string; store_id: string; name: string };
type ServiceRow = {
  id: string;
  store_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

type WorkingHourRow = {
  day_of_week: number;
  slot: 1 | 2;
  is_open: boolean;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string; // "HH:MM" or "HH:MM:SS"
};

type AppointmentRow = {
  start_at: string; // ISO
  end_at: string; // ISO
  buffer_after_minutes_snapshot: number | null;
};

type BlockRow = {
  start_at: string; // ISO
  end_at: string; // ISO
  staff_id: string | null;
};

type Range = { start: Date; end: Date };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

function toHHMM(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidHHMM(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

// validação simples (MVP) para PT — aceita +351, espaços e hífens
function normalizePhone(input: string) {
  return input.replace(/\s+/g, " ").trim();
}
function isValidPhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 9 && cleaned.length <= 16;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      slug?: string;
      staffId?: string;
      serviceId?: string;
      date?: string; // "YYYY-MM-DD"
      time?: string; // "HH:MM" Lisboa
      customerName?: string;
      customerPhone?: string;

      bufferAfter?: number; // minutos (default 0)
      leadMinutes?: number; // default 120
      stepMinutes?: number; // default 15
    };

    const slug = (body.slug ?? "").trim();
    const staffId = (body.staffId ?? "").trim();
    const serviceId = (body.serviceId ?? "").trim();
    const date = (body.date ?? "").trim();
    const time = (body.time ?? "").trim();

    const customerName = (body.customerName ?? "").trim();
    const customerPhone = normalizePhone(body.customerPhone ?? "");

    const bufferAfter = Number.isFinite(body.bufferAfter) ? Number(body.bufferAfter) : 0;
    const leadMinutes = Number.isFinite(body.leadMinutes) ? Number(body.leadMinutes) : 120;
    const stepMinutes = Number.isFinite(body.stepMinutes) ? Number(body.stepMinutes) : 15;

    // ---- validações base ----
    if (!slug) return NextResponse.json({ error: "Falta o slug da loja." }, { status: 400 });
    if (!staffId) return NextResponse.json({ error: "Falta o profissional (staffId)." }, { status: 400 });
    if (!serviceId) return NextResponse.json({ error: "Falta o serviço (serviceId)." }, { status: 400 });

    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: "Data inválida. Use YYYY-MM-DD." }, { status: 400 });
    }
    if (!time || !isValidHHMM(time)) {
      return NextResponse.json({ error: "Hora inválida. Use HH:MM." }, { status: 400 });
    }

    if (!Number.isFinite(bufferAfter) || bufferAfter < 0) {
      return NextResponse.json({ error: "bufferAfter inválido." }, { status: 400 });
    }
    if (!Number.isFinite(leadMinutes) || leadMinutes < 0) {
      return NextResponse.json({ error: "leadMinutes inválido." }, { status: 400 });
    }
    if (!Number.isFinite(stepMinutes) || stepMinutes <= 0 || stepMinutes > 60) {
      return NextResponse.json({ error: "stepMinutes inválido." }, { status: 400 });
    }

    if (!customerName) return NextResponse.json({ error: "Indique o seu nome." }, { status: 400 });
    if (customerName.length > 80) return NextResponse.json({ error: "Nome demasiado longo." }, { status: 400 });

    if (!customerPhone) return NextResponse.json({ error: "Indique o seu contacto." }, { status: 400 });
    if (!isValidPhone(customerPhone)) return NextResponse.json({ error: "Contacto inválido." }, { status: 400 });

    // valida grelha (ex: 15 em 15)
    const minute = Number(time.slice(3, 5));
    if (minute % stepMinutes !== 0) {
      return NextResponse.json({ error: `Escolha um horário de ${stepMinutes} em ${stepMinutes} minutos.` }, { status: 400 });
    }

    // ---- 1) store por slug ----
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id,slug,name")
      .eq("slug", slug)
      .maybeSingle<StoreRow>();

    if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 });
    if (!store) return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });

    // ---- 2) validar staff pertence à loja ----
    const { data: staff, error: staffErr } = await supabase
      .from("staff")
      .select("id,store_id,name")
      .eq("id", staffId)
      .eq("store_id", store.id)
      .maybeSingle<StaffRow>();

    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
    if (!staff) return NextResponse.json({ error: "Profissional não encontrado nesta loja." }, { status: 404 });

    // ---- 3) validar service pertence à loja + duração ----
    const { data: service, error: serviceErr } = await supabase
      .from("services")
      .select("id,store_id,name,duration_minutes,price_cents")
      .eq("id", serviceId)
      .eq("store_id", store.id)
      .maybeSingle<ServiceRow>();

    if (serviceErr) return NextResponse.json({ error: serviceErr.message }, { status: 500 });
    if (!service) return NextResponse.json({ error: "Serviço não encontrado nesta loja." }, { status: 404 });

    if (!Number.isFinite(service.duration_minutes) || service.duration_minutes <= 0 || service.duration_minutes > 8 * 60) {
      return NextResponse.json({ error: "Duração do serviço inválida." }, { status: 500 });
    }

    // ---- 4) converter Lisboa -> UTC + lead time ----
    const startUtc = lisbonLocalToUtc(date, time);
    const occupyMinutes = service.duration_minutes + bufferAfter;
    const endUtcOccupied = addMinutes(startUtc, occupyMinutes);

    const nowUtc = new Date();
    const minStartAllowed = addMinutes(nowUtc, leadMinutes);
    if (startUtc < minStartAllowed) {
      return NextResponse.json({ error: `Antecedência mínima: ${leadMinutes} minutos.` }, { status: 400 });
    }

    // ---- 5) range do dia (Lisboa) + dia da semana ----
    const dayRange = lisbonDayRangeUtc(date);

    const dayStartUtc = dayRange.start;
    const dayEndUtc = dayRange.end;

    // calcular dia da semana manualmente (0=Domingo ... 6=Sábado)
    const dayOfWeek = new Date(date + "T00:00:00").getDay();

    // ---- 6) horários do staff (manhã/tarde) ----
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

    if (openSlots.length === 0) {
      return NextResponse.json({ error: "A loja está fechada nesse dia para esse profissional." }, { status: 400 });
    }

    // cabe em manhã ou tarde?
    const fitsInSomeSlot = openSlots.some((w) => {
      const blockStartUtc = lisbonLocalToUtc(date, w.start);
      const blockEndUtc = lisbonLocalToUtc(date, w.end);
      return startUtc >= blockStartUtc && endUtcOccupied <= blockEndUtc;
    });

    if (!fitsInSomeSlot) {
      return NextResponse.json({ error: "Horário fora do período de trabalho." }, { status: 400 });
    }

    // ---- 7) marcações do dia (ocupado) ----
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

    if (busy.some((x) => overlaps(startUtc, endUtcOccupied, x.start, x.end))) {
      return NextResponse.json({ error: "Esse horário já foi ocupado. Escolha outro." }, { status: 409 });
    }

    // ---- 8) bloqueios (globais + staff) ----
    const { data: blocksDb, error: blocksErr } = await supabase
      .from("availability_blocks")
      .select("start_at,end_at,staff_id")
      .eq("store_id", store.id)
      .or(`staff_id.is.null,staff_id.eq.${staffId}`)
      .gte("end_at", dayStartUtc.toISOString())
      .lt("start_at", dayEndUtc.toISOString());

    if (blocksErr) return NextResponse.json({ error: blocksErr.message }, { status: 500 });

    const blocked: Range[] = (blocksDb ?? []).map((b: BlockRow) => ({
      start: new Date(b.start_at),
      end: new Date(b.end_at),
    }));

    if (blocked.some((x) => overlaps(startUtc, endUtcOccupied, x.start, x.end))) {
      return NextResponse.json({ error: "Esse horário está bloqueado." }, { status: 409 });
    }

    // ---- 9) criar marcação ----
    // end_at = SEM buffer (buffer fica no snapshot)
    const endUtcNoBuffer = addMinutes(startUtc, service.duration_minutes);

    const { data: created, error: insErr } = await supabase
      .from("appointments")
      .insert({
        store_id: store.id,
        staff_id: staffId,
        service_id: serviceId,
        customer_name: customerName,
        customer_phone: customerPhone,
        start_at: startUtc.toISOString(),
        end_at: endUtcNoBuffer.toISOString(),
        buffer_after_minutes_snapshot: bufferAfter,
      })
      .select("id,start_at,end_at")
      .maybeSingle<{ id: string; start_at: string; end_at: string }>();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    if (!created) return NextResponse.json({ error: "Falha ao criar a marcação." }, { status: 500 });

    // HH:MM em Lisboa para UI
    const hhmmLocal = new Intl.DateTimeFormat("en-GB", {
      timeZone: STORE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(created.start_at));

    return NextResponse.json({
      ok: true,
      appointment: {
        id: created.id,
        store: { slug: store.slug, name: store.name },
        staff: { id: staff.id, name: staff.name },
        service: {
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price_cents: service.price_cents,
        },
        date,
        time: hhmmLocal,
        start_at: created.start_at,
        end_at: created.end_at,
        buffer_after_minutes: bufferAfter,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
