"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Staff = { id: string; name: string };
type Block = {
  id: string;
  staff_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
};

export default function BlocksPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);

  const [staffId, setStaffId] = useState<string>(""); // "" => global
  const [startAt, setStartAt] = useState(""); // datetime-local
  const [endAt, setEndAt] = useState(""); // datetime-local
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const staffNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staff) m.set(s.id, s.name);
    return m;
  }, [staff]);

  const loadAll = useCallback(async () => {
    setMsg(null);
    setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      if (!mountedRef.current) return;
      setLoading(false);
      setMsg("Sessão inválida. Faça login novamente.");
      return;
    }

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle<{ id: string }>();

    if (storeErr || !store?.id) {
      if (!mountedRef.current) return;
      setLoading(false);
      setMsg(storeErr?.message ?? "Loja não encontrada.");
      return;
    }

    if (!mountedRef.current) return;
    setStoreId(store.id);

    const { data: staffRows, error: stErr } = await supabase
      .from("staff")
      .select("id,name")
      .eq("store_id", store.id)
      .order("created_at", { ascending: true });

    if (stErr) {
      if (!mountedRef.current) return;
      setLoading(false);
      setMsg(stErr.message);
      return;
    }

    if (!mountedRef.current) return;
    setStaff((staffRows ?? []) as Staff[]);

    const { data: blockRows, error: bErr } = await supabase
      .from("availability_blocks")
      .select("id,staff_id,start_at,end_at,reason")
      .eq("store_id", store.id)
      .order("start_at", { ascending: true });

    if (bErr) {
      if (!mountedRef.current) return;
      setLoading(false);
      setMsg(bErr.message);
      return;
    }

    if (!mountedRef.current) return;
    setBlocks((blockRows ?? []) as Block[]);
    setLoading(false);
  }, []);

  async function addBlock() {
    setMsg(null);
    if (!storeId) return;

    if (!startAt || !endAt) {
      setMsg("Preenche início e fim.");
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setMsg("Datas inválidas.");
      return;
    }

    if (endDate <= startDate) {
      setMsg("O fim tem de ser depois do início.");
      return;
    }

    // datetime-local -> ISO (interpreta como local do browser; ok para MVP)
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const { error } = await supabase.from("availability_blocks").insert({
      store_id: storeId,
      staff_id: staffId || null,
      start_at: startIso,
      end_at: endIso,
      reason: reason.trim() || null,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setStartAt("");
    setEndAt("");
    setReason("");

    await loadAll();
  }

  async function removeBlock(id: string) {
    setMsg(null);
    const { error } = await supabase.from("availability_blocks").delete().eq("id", id);
    if (error) return setMsg(error.message);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  useEffect(() => {
        mountedRef.current = true;

        (async () => {
            await loadAll();
        })();

        return () => {
            mountedRef.current = false;
        };
    }, [loadAll]);


  return (
    <div className="p-6">
      <div className="mb-2 text-xl font-semibold">Bloqueios</div>
      <div className="text-sm text-gray-600">
        Férias, folgas, fecho cedo, indisponibilidades pontuais (globais ou por profissional).
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-gray-200 p-4 text-sm">A carregar...</div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Aplicar a</span>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="">(Global da loja)</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Motivo (opcional)</span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ex: Férias"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Início</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Fim</span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>

            {msg ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            ) : null}

            <button
              onClick={addBlock}
              className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              Criar bloqueio
            </button>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-900">Bloqueios existentes</div>

            {blocks.length === 0 ? (
              <div className="mt-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                Sem bloqueios.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {blocks.map((b) => {
                  const who = b.staff_id
                    ? staffNameById.get(b.staff_id) ?? "Profissional"
                    : "Global da loja";

                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {who}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            {b.reason ? `· ${b.reason}` : ""}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(b.start_at).toLocaleString("pt-PT")} →{" "}
                          {new Date(b.end_at).toLocaleString("pt-PT")}
                        </div>
                      </div>

                      <button
                        onClick={() => removeBlock(b.id)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
