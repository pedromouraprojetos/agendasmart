"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

type StoreRow = { id: string; name: string; slug: string };

function buildPublicUrl(slug: string) {
  const base =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return `${base.replace(/\/$/, "")}/${slug}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setMsg(null);
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!mounted) return;

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

      if (!mounted) return;

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
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const publicUrl = store?.slug ? buildPublicUrl(store.slug) : "";

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMsg("Link copiado!");
      setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Não consegui copiar. Copia manualmente.");
    }
  }

  return (
    <AppShell title="Dashboard (Gerente)">
      <div className="p-6">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            A carregar...
          </div>
        ) : msg && !store ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {msg}
          </div>
        ) : (
          <>
            {msg ? (
              <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
                {msg}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {/* CARD 1 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm font-semibold text-gray-900">Loja</div>
                <div className="mt-1 text-sm text-gray-600">Informação principal</div>

                <div className="mt-4 text-sm text-gray-700">
                  Nome: <span className="font-semibold">{store?.name}</span>
                </div>

                <div className="mt-2 text-sm text-gray-700">
                  Slug: <span className="font-semibold">{store?.slug}</span>
                </div>
              </div>

              {/* CARD 2 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm font-semibold text-gray-900">Link público</div>
                <div className="mt-1 text-sm text-gray-600">
                  Partilhe com os seus clientes
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm break-all">
                  {publicUrl}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={copyLink}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => window.open(publicUrl, "_blank")}
                    className="w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Abrir
                  </button>
                </div>
              </div>

              {/* CARD 3 – AÇÕES RÁPIDAS */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm font-semibold text-gray-900">
                  Ações rápidas
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Gestão de marcações
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    onClick={() => router.push("/dashboard/appointments")}
                    className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Ver marcações
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/create-booking")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                  >
                    Criar marcação (telefone)
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/blocks")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                  >
                    Bloquear horários
                  </button>

                  <button
                    onClick={() => router.push("/onboarding?step=1")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                  >
                    Editar onboarding
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}