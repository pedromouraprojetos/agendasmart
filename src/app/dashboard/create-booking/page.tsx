// src/app/dashboard/create-booking/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

type StoreRow = { id: string; name: string; slug: string };
type StaffRow = { id: string; name: string };
type ServiceRow = { id: string; name: string; duration_minutes: number; price_cents: number };

function formatMoneyEUR(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + "€";
}

function todayLisbonYYYYMMDD() {
  // MVP (suficiente)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateBookingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

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

  // ---------- load base (store + staff + services) ----------
  const loadBase = useCallback(async () => {
    setMsg(null);
    setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { data: storeRow, error: storeErr } = await supabase
      .from("stores")
      .select("id,name,slug")
      .eq("owner_id", user.id)
      .maybeSingle<StoreRow>();

    if (storeErr) {
      setLoading(false);
      setMsg(storeErr.message);
      return;
    }

    if (!storeRow) {
      setLoading(false);
      setMsg("Ainda não tens loja. Vai ao onboarding.");
      setStore(null);
      return;
    }

    setStore(storeRow);

    const { data: staffRows, error: staffErr } = await supabase
      .from("staff")
      .select("id,name")
      .eq("store_id", storeRow.id)
      .order("created_at", { ascending: true });

    if (staffErr) {
      setLoading(false);
      setMsg(staffErr.message);
      return;
    }

    const { data: serviceRows, error: serviceErr } = await supabase
      .from("services")
      .select("id,name,duration_minutes,price_cents")
      .eq("store_id", storeRow.id)
      .order("created_at", { ascending: true });

    if (serviceErr) {
      setLoading(false);
      setMsg(serviceErr.message);
      return;
    }

    const staffList = (staffRows ?? []) as StaffRow[];
    const servicesList = (serviceRows ?? []) as ServiceRow[];

    setStaff(staffList);
    setServices(servicesList);

    // defaults
    setStaffId((prev) => prev || staffList[0]?.id || "");
    setServiceId((prev) => prev || servicesList[0]?.id || "");

    setLoading(false);
  }, [router]);

  // ---------- load slots (param slug para evitar warning do React Compiler) ----------
  const loadSlots = useCallback(
    async (storeSlug: string) => {
      setSlots([]);
      setSuccessMsg(null);
      setBookMsg(null);
      setMsg(null);

      if (!storeSlug || !staffId || !date || !selectedService) return;

      setSlotsLoading(true);

      const qs = new URLSearchParams({
        slug: storeSlug,
        staffId,
        date,
        serviceMinutes: String(selectedService.duration_minutes),
        stepMinutes: "15",
        leadMinutes: "120",
        bufferAfter: "0",
        ts: String(Date.now()),
      });

      const res = await fetch(`/api/availability?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data: unknown = await res.json().catch(() => ({}));
      setSlotsLoading(false);

      if (!res.ok) {
        const err =
          typeof (data as { error?: unknown })?.error === "string"
            ? (data as { error: string }).error
            : "Erro ao carregar horários.";
        setMsg(err);
        return;
      }

      const list = Array.isArray((data as { slots?: unknown })?.slots)
        ? (((data as { slots: unknown }).slots as unknown[]) as string[])
        : [];

      setSlots(list);
    },
    [staffId, date, selectedService]
  );

  // ---------- effects ----------
  useEffect(() => {
    let mounted = true;

    setTimeout(() => {
      if (!mounted) return;
      void loadBase();
    }, 0);

    return () => {
      mounted = false;
    };
  }, [loadBase]);

  useEffect(() => {
    const storeSlug = store?.slug ?? "";
    if (!storeSlug || !staffId || !serviceId || !date || !selectedService) return;

    setTimeout(() => {
      void loadSlots(storeSlug);
    }, 0);

  }, [store?.slug, staffId, serviceId, date, selectedService, loadSlots]);

  // ---------- actions ----------
  function onPickSlot(hhmm: string) {
    setSelectedTime(hhmm);
    setCustomerName("");
    setCustomerPhone("");
    setBookMsg(null);
    setSuccessMsg(null);
    setBookOpen(true);
  }

  async function confirmBooking() {
    setBookMsg(null);

    if (!store) return setBookMsg("Loja inválida.");
    if (!serviceId) return setBookMsg("Seleciona um serviço.");
    if (!staffId) return setBookMsg("Seleciona um profissional.");
    if (!date) return setBookMsg("Seleciona uma data.");
    if (!selectedTime) return setBookMsg("Seleciona uma hora.");

    const name = customerName.trim();
    const phone = customerPhone.trim();

    if (!name) return setBookMsg("Indica o nome do cliente.");
    if (!phone) return setBookMsg("Indica o telemóvel do cliente.");

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
      const err =
        typeof (data as { error?: unknown })?.error === "string"
          ? (data as { error: string }).error
          : "Erro ao criar marcação.";
      setBookMsg(err);
      return;
    }

    setBookOpen(false);
    setSuccessMsg(`Marcação criada: ${date} às ${selectedTime}.`);

    // refresh slots
    await loadSlots(store.slug);
  }

  return (
    <AppShell title="Criar marcação (telefone)">
      <div className="p-6">
        <div className="mb-2 text-xl font-semibold">Criar marcação (telefone)</div>
        <div className="text-sm text-gray-600">
          Cria uma marcação em nome do cliente (sem login).
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            A carregar...
          </div>
        ) : !store ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {msg ?? "Loja não encontrada."}
          </div>
        ) : (
          <>
            {msg ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            ) : null}

            {successMsg ? (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {successMsg}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-2">
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

                <label className="block md:col-span-1">
                  <span className="text-sm font-medium text-gray-700">Data</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>

                <div className="flex items-end gap-2 md:col-span-1">
                  <button
                    onClick={() => {
                      if (!store?.slug) return;
                      void loadSlots(store.slug);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                  >
                    Recarregar horários
                  </button>

                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Voltar
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">Horários disponíveis</div>

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
                      <span className="text-sm font-medium text-gray-700">Nome do cliente</span>
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
          </>
        )}
      </div>
    </AppShell>
  );
}