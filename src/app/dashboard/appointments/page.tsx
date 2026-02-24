// src/app/dashboard/appointments/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

type StoreRow = { id: string; name: string };
type StaffRow = { id: string; name: string };
type ServiceRow = { id: string; name: string; duration_minutes: number; price_cents: number };

type AppointmentRow = {
  id: string;
  store_id: string;
  staff_id: string;
  service_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  start_at: string;
  end_at: string;
  status: "confirmed" | "cancelled";
  cancelled_at: string | null;
  cancelled_reason: string | null;
};

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoneyEUR(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + "€";
}

function formatDateTimePT(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [store, setStore] = useState<StoreRow | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  // filtros
  const [date, setDate] = useState<string>(toYYYYMMDD(new Date())); // default hoje
  const [staffId, setStaffId] = useState<string>(""); // "" => todos
  const [showCancelled, setShowCancelled] = useState(false);

  // modal cancel
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const staffNameById = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

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
      .select("id,name")
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

    setStaff((staffRows ?? []) as StaffRow[]);
    setServices((serviceRows ?? []) as ServiceRow[]);

    setLoading(false);
  }, [router]);

  // ✅ recebe storeId por parâmetro (evita warning do React Compiler)
  const loadAppointments = useCallback(
    async (storeId: string) => {
      setMsg(null);

      if (!storeId) {
        setAppointments([]);
        return;
      }

      // range do dia (local do browser; ok MVP)
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59`);

      let q = supabase
        .from("appointments")
        .select(
          "id,store_id,staff_id,service_id,customer_name,customer_phone,start_at,end_at,status,cancelled_at,cancelled_reason"
        )
        .eq("store_id", storeId)
        .gte("start_at", dayStart.toISOString())
        .lte("start_at", dayEnd.toISOString())
        .order("start_at", { ascending: true });

      if (staffId) q = q.eq("staff_id", staffId);
      if (!showCancelled) q = q.eq("status", "confirmed");

      const { data, error } = await q;

      if (error) {
        setMsg(error.message);
        setAppointments([]);
        return;
      }

      setAppointments((data ?? []) as AppointmentRow[]);
    },
    [date, staffId, showCancelled]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    const storeId = store?.id ?? "";
    if (!storeId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAppointments(storeId);
  }, [store?.id, date, staffId, showCancelled, loadAppointments]);

  function openCancel(apptId: string) {
    setCancelMsg(null);
    setCancelId(apptId);
    setCancelReason("");
    setCancelOpen(true);
  }

  async function confirmCancel() {
    setCancelMsg(null);
    if (!cancelId) return;

    const reason = cancelReason.trim() || null;

    setCancelling(true);

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason,
      })
      .eq("id", cancelId);

    setCancelling(false);

    if (error) {
      setCancelMsg(error.message);
      return;
    }

    setCancelOpen(false);

    const storeId = store?.id ?? "";
    if (storeId) await loadAppointments(storeId);
  }

  return (
    <AppShell title="Marcações">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Marcações</div>
            <div className="text-sm text-gray-600">
              Ver e cancelar marcações (sem apagar histórico).
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              onClick={() => {
                const storeId = store?.id ?? "";
                if (!storeId) return;
                void loadAppointments(storeId);
              }}
              disabled={!store?.id}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            A carregar...
          </div>
        ) : msg ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {msg}
          </div>
        ) : !store ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Loja não encontrada.
          </div>
        ) : (
          <>
            {/* filtros */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Data</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Profissional</span>
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                  >
                    <option value="">(Todos)</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-end gap-2">
                  <input
                    type="checkbox"
                    checked={showCancelled}
                    onChange={(e) => setShowCancelled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Mostrar canceladas</span>
                </label>
              </div>
            </div>

            {/* lista */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-900">Resultados</div>

              {appointments.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                  Sem marcações para estes filtros.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {appointments.map((a) => {
                    const staffName = staffNameById.get(a.staff_id) ?? "Profissional";
                    const service = a.service_id ? serviceById.get(a.service_id) : null;

                    return (
                      <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDateTimePT(a.start_at)} → {formatDateTimePT(a.end_at)}
                            </div>

                            <div className="mt-1 text-sm text-gray-700">
                              <span className="font-semibold">{staffName}</span>
                              {service ? (
                                <>
                                  {" "}
                                  · {service.name} ({service.duration_minutes} min) ·{" "}
                                  {formatMoneyEUR(service.price_cents)}
                                </>
                              ) : null}
                            </div>

                            <div className="mt-1 text-xs text-gray-600">
                              Cliente:{" "}
                              <span className="font-semibold">{a.customer_name ?? "—"}</span> ·{" "}
                              {a.customer_phone ?? "—"}
                            </div>

                            {a.status === "cancelled" ? (
                              <div className="mt-2 text-xs text-red-700">
                                Cancelada
                                {a.cancelled_at ? ` em ${formatDateTimePT(a.cancelled_at)}` : ""}{" "}
                                {a.cancelled_reason ? `· ${a.cancelled_reason}` : ""}
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-green-700">Confirmada</div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {a.status === "confirmed" ? (
                              <button
                                onClick={() => openCancel(a.id)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* modal cancelar */}
            {cancelOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                  <div className="text-lg font-semibold text-gray-900">Cancelar marcação</div>
                  <div className="mt-1 text-sm text-gray-600">
                    A marcação ficará com status <span className="font-semibold">cancelled</span>.
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-medium text-gray-700">Motivo (opcional)</span>
                    <input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="ex: Cliente pediu alteração"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>

                  {cancelMsg ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {cancelMsg}
                    </div>
                  ) : null}

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setCancelOpen(false)}
                      disabled={cancelling}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Fechar
                    </button>

                    <button
                      onClick={confirmCancel}
                      disabled={cancelling}
                      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {cancelling ? "A cancelar..." : "Confirmar cancelamento"}
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