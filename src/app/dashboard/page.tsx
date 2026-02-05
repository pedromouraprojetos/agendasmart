"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { supabase } from "@/lib/supabaseClient";

type Store = {
  slug: string;
  name: string;
  trial_started_at: string;
  trial_days: number;
};

export default function DashboardPage() {
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (error || !user) return;

      const { data: s, error: storeErr } = await supabase
        .from("stores")
        .select("slug,name,trial_started_at,trial_days")
        .eq("owner_id", user.id)
        .maybeSingle<Store>();

      if (storeErr) return;
      if (s) setStore(s);
    })();
  }, []);

  const baseUrl = "agendasmart-lime.vercel.app";

  return (
    <AppShell title="Dashboard (Gerente)">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Trial" subtitle="Estado do plano">
          <div className="text-sm text-gray-700">
            {store ? (
              <>
                Loja: <span className="font-semibold">{store.name}</span>
              </>
            ) : (
              "Sem loja (ainda)."
            )}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {store ? `${store.trial_days} dias` : "—"}
          </div>
          <p className="mt-2 text-xs text-gray-500">(Cálculo de dias restantes vem depois.)</p>
        </Card>

        <Card title="Link da sua loja" subtitle="Partilhe com os seus clientes">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            {baseUrl}/<span className="font-medium">{store?.slug ?? "nomedaloja"}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
              Copiar
            </button>
            <Link
              href={`/${store?.slug ?? "nomedaloja"}`}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Abrir
            </Link>
          </div>
          {!store ? (
            <p className="mt-2 text-xs text-gray-500">Crie a sua loja no onboarding.</p>
          ) : null}
        </Card>

        <Card title="Ações rápidas" subtitle="Configuração e gestão">
          <div className="space-y-2">
            <Link
              href="/onboarding?step=1"
              className="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Editar onboarding
            </Link>
            <button className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
              Criar marcação (telefone)
            </button>
            <button className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
              Bloquear horários
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
