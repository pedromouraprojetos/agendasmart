"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type StoreRow = { id: string; name: string; slug: string };
type StaffRow = { id: string; name: string };
type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

function formatMoneyEUR(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + "€";
}

function todayLisbonYYYYMMDD() {
  // MVP: assume timezone do browser (em PT normalmente ok)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug = String(params?.slug ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [store, setStore] = useState<StoreRow | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);

  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState<string>(todayLisbonYYYYMMDD());

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // modal booking
  const [bookOpen, setBookOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookMsg, setBookMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  /**
   * Carrega: store + staff + services
   * NOTA: não depende de serviceId/staffId para não recarregar quando o user muda selects.
   */
  const loadBase = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);

    if (!slug) {
      setLoading(false);
      setErrorMsg("Slug em falta.");
      return;
    }

    const { data: storeRow, error: storeErr } = await supabase
      .from("stores")
      .select("id,name,slug")
      .eq("slug", slug)
      .maybeSingle<StoreRow>();

    if (storeErr) {
      setLoading(false);
      setErrorMsg(storeErr.message);
      return;
    }
    if (!storeRow) {
      setLoading(false);
      setErrorMsg("Store not found");
      return;
    }

    const { data: staffRows, error: staffErr } = await supabase
      .from("staff")
      .select("id,name")
      .eq("store_id", storeRow.id)
      .order("created_at", { ascending: true });

    if (staffErr) {
      setLoading(false);
      setErrorMsg(staffErr.message);
      return;
    }

    const { data: serviceRows, error: serviceErr } = await supabase
      .from("services")
      .select("id,name,duration_minutes,price_cents")
      .eq("store_id", storeRow.id)
      .order("created_at", { ascending: true });

    if (serviceErr) {
      setLoading(false);
      setErrorMsg(serviceErr.message);
      return;
    }

    const staffList = (staffRows ?? []) as StaffRow[];
    const servicesList = (serviceRows ?? []) as ServiceRow[];

    setStore(storeRow);
    setStaff(staffList);
    setServices(servicesList);

    // defaults (só se ainda estiver vazio)
    setServiceId((prev) => prev || servicesList[0]?.id || "");
    setStaffId((prev) => prev || staffList[0]?.id || "");

    setLoading(false);
  }, [slug]);

  /**
   * Carrega slots via API
   * IMPORTANTE: cache: "no-store" + param ts => evita “ficar preso” depois de remover bloqueios.
   */
  const loadSlots = useCallback(async () => {
    setSuccessMsg(null);
    setBookMsg(null);
    setErrorMsg(null);
    setSlots([]);

    if (!slug || !staffId || !date || !selectedService) return;

    setSlotsLoading(true);

    const qs = new URLSearchParams({
      slug,
      staffId,
      date, // YYYY-MM-DD
      serviceMinutes: String(selectedService.duration_minutes),
      stepMinutes: "15",
      leadMinutes: "120",
      bufferAfter: "0",
      ts: String(Date.now()), // cache buster
    });

    const res = await fetch(`/api/availability?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const data: unknown = await res.json().catch(() => ({}));

    setSlotsLoading(false);

    if (!res.ok) {
      const msg =
        typeof (data as { error?: unknown })?.error === "string"
          ? (data as { error: string }).error
          : "Erro ao carregar horários.";
      setErrorMsg(msg);
      return;
    }

    const list =
      Array.isArray((data as { slots?: unknown })?.slots) ? ((data as { slots: string[] }).slots ?? []) : [];

    setSlots(list);
  }, [slug, staffId, date, selectedService]);

  useEffect(() => {
    // Este plugin de ESLint é demasiado agressivo para “fetch on mount”.
    // Aqui faz sentido desativar apenas esta linha.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (!slug || !staffId || !serviceId || !date) return;
    if (!selectedService) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSlots();
  }, [slug, staffId, serviceId, date, selectedService, loadSlots]);

  function onPickSlot(hhmm: string) {
    setSelectedTime(hhmm);
    setCustomerName("");
    setCustomerPhone("");
    setBookMsg(null);
    setBookOpen(true);
  }

  async function confirmBooking() {
    setBookMsg(null);

    const name = customerName.trim();
    const phone = customerPhone.trim();

    if (!store) return setBookMsg("Loja inválida.");
    if (!serviceId) return setBookMsg("Seleciona um serviço.");
    if (!staffId) return setBookMsg("Seleciona um profissional.");
    if (!date) return setBookMsg("Seleciona uma data.");
    if (!selectedTime) return setBookMsg("Seleciona uma hora.");

    if (!name) return setBookMsg("Indica o teu nome.");
    if (!phone) return setBookMsg("Indica o teu telemóvel.");

    setBooking(true);

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        slug: store.slug,
        staffId,
        serviceId,
        date,
        time: selectedTime,
        customerName: name,
        customerPhone: phone,
        bufferAfter: 0,
        leadMinutes: 120,
        stepMinutes: 15,
      }),
    });

    const data: unknown = await res.json().catch(() => ({}));
    setBooking(false);

    if (!res.ok) {
      const msg =
        typeof (data as { error?: unknown })?.error === "string"
          ? (data as { error: string }).error
          : "Erro ao criar marcação.";
      setBookMsg(msg);
      return;
    }

    setBookOpen(false);
    setSuccessMsg(`Marcação confirmada para ${date} às ${selectedTime}.`);

    // recarrega slots (para remover o slot ocupado)
    await loadSlots();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <div className="text-3xl font-semibold">Marcar</div>
        <div className="mt-1 text-sm text-gray-600">Loja: {store?.name ?? slug}</div>
      </div>

      {errorMsg ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          A carregar...
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Serviço</span>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} min) · {formatMoneyEUR(s.price_cents)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Profissional</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              {staff.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Horários disponíveis</div>
              <button
                type="button"
                onClick={() => void loadSlots()}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                Recarregar
              </button>
            </div>

            {slotsLoading ? (
              <div className="mt-3 text-sm text-gray-700">A carregar horários...</div>
            ) : slots.length === 0 ? (
              <div className="mt-3 text-sm text-gray-700">Sem horários disponíveis.</div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {slots.map((hhmm) => (
                  <button
                    key={hhmm}
                    onClick={() => onPickSlot(hhmm)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    {hhmm}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      {bookOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-lg font-semibold text-gray-900">Confirmar marcação</div>
            <div className="mt-1 text-sm text-gray-600">
              {date} às <span className="font-semibold">{selectedTime}</span>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Nome</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="ex: Ana Silva"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Telemóvel</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="ex: 912 345 678"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>

            {bookMsg ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bookMsg}
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setBookOpen(false)}
                disabled={booking}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBooking}
                disabled={booking}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {booking ? "A marcar..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}