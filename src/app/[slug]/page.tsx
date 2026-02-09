"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Staff = { id: string; name: string };
type Service = { id: string; name: string; duration_minutes: number };

function todayLisbonYYYYMMDD() {
  // simples: usa a data local do browser
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug = String(params.slug || "");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(todayLisbonYYYYMMDD());

  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const serviceMinutes = useMemo(() => {
    const s = services.find((x) => x.id === serviceId);
    return s?.duration_minutes ?? 30;
  }, [services, serviceId]);

  async function loadBase() {
    setMsg(null);
    setLoading(true);

    try {
      // Vamos buscar staff + services via Supabase REST? (para já simples usando uma API route)
      // Para não abrires keys no browser, fazemos via 2 endpoints internos:
      const r1 = await fetch(`/api/public/staff?slug=${encodeURIComponent(slug)}`);
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || "Erro a carregar staff");

      const r2 = await fetch(`/api/public/services?slug=${encodeURIComponent(slug)}`);
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || "Erro a carregar serviços");

      setStaff(j1.staff ?? []);
      setServices(j2.services ?? []);

      const firstStaff = (j1.staff?.[0]?.id ?? "") as string;
      const firstService = (j2.services?.[0]?.id ?? "") as string;

      setStaffId(firstStaff);
      setServiceId(firstService);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function loadSlots() {
    setSlots([]);
    setMsg(null);

    if (!slug || !staffId) return;

    setLoadingSlots(true);
    try {
      const qs = new URLSearchParams({
        slug,
        staffId,
        date,
        serviceMinutes: String(serviceMinutes),
        stepMinutes: "15",
        leadMinutes: "120",
        bufferAfter: "0",
      });

      const r = await fetch(`/api/availability?${qs.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro a carregar horários");

      setSlots(j.slots ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!loading && staffId) void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, staffId, serviceId, date]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="text-2xl font-semibold">Marcar</div>
      <div className="text-sm text-gray-600">Loja: <span className="font-medium text-gray-900">{slug}</span></div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-gray-200 p-4 text-sm">A carregar...</div>
      ) : msg ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{msg}</div>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Serviço</span>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes} min)
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
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Horários disponíveis</div>

            {loadingSlots ? (
              <div className="mt-3 text-sm text-gray-600">A carregar horários...</div>
            ) : slots.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Sem horários disponíveis para este dia.</div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {slots.map((h) => (
                  <button
                    key={h}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    onClick={() => alert(`Selecionado: ${date} ${h}`)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
