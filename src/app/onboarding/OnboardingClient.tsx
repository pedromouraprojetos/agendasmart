"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingShell from "@/components/OnboardingShell";
import { supabase } from "@/lib/supabaseClient";

const TOTAL = 6;

type BusinessType = "barbershop" | "beauty" | "mixed";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function OnboardingClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const step = useMemo(() => {
    const raw = Number(sp.get("step") ?? "1");
    return Math.min(TOTAL, Math.max(1, raw));
  }, [sp]);

  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("barbershop");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function saveStep1AndNext() {
    setErrorMsg(null);
    setSaving(true);

    const name = storeName.trim();
    const cityClean = city.trim();
    const finalSlug = (slug.trim() || slugify(name)).slice(0, 60);

    if (!name) {
      setSaving(false);
      setErrorMsg("Indique o nome da loja.");
      return;
    }
    if (!finalSlug) {
      setSaving(false);
      setErrorMsg("Não foi possível gerar o link (slug).");
      return;
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      setSaving(false);
      setErrorMsg("Sessão inválida. Faça login novamente.");
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("stores").upsert({
        owner_id: user.id,
        name,
        business_type: businessType,
        city: cityClean || null,
        slug: finalSlug,
      },
        { onConflict: "owner_id" }
    );

    setSaving(false);

    if (error) {
      const msg =
        error.message.toLowerCase().includes("duplicate") ||
        error.message.toLowerCase().includes("unique")
          ? "Esse link (slug) já existe. Escolha outro."
          : error.message;

      setErrorMsg(msg);
      return;
    }

    router.push("/onboarding?step=2");
  }

  if (step === 1) {
    return (
      <OnboardingShell
        step={1}
        total={TOTAL}
        title="Dados da loja"
        subtitle="Defina o nome e o link público da sua loja."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nome da loja</span>
              <input
                value={storeName}
                onChange={(e) => {
                  const v = e.target.value;
                  setStoreName(v);
                  if (!slug.trim()) setSlug(slugify(v));
                }}
                placeholder="ex: Barbearia Central"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Tipo</span>
            <select
              value={businessType}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "barbershop" || v === "beauty" || v === "mixed") {
                  setBusinessType(v);
                }
              }}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-gray-100"
            >
              <option value="barbershop">Barbearia</option>
              <option value="beauty">Estética</option>
              <option value="mixed">Misto</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Cidade</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ex: Porto"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
            />
          </label>

          <div className="md:col-span-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Link da loja (slug)</span>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="ex: barbearia-central"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
              />
            </label>

            <p className="mt-2 text-sm text-gray-600">
              Exemplo:{" "}
              <span className="font-medium text-gray-900">
                agendasmart-lime.vercel.app/{slug || "barbearia-central"}
              </span>
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="mt-6">
          <button
            onClick={saveStep1AndNext}
            disabled={saving}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-gray-200"
          >
            {saving ? "A guardar..." : "Continuar"}
          </button>
        </div>
      </OnboardingShell>
    );
  }

  if (step === 2) {
    return (
      <OnboardingShell
        step={2}
        total={TOTAL}
        title="Profissionais"
        subtitle="Adicione os profissionais."
        backHref="/onboarding?step=1"
        nextHref="/onboarding?step=3"
      >
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          (Placeholder) Lista de profissionais + “Adicionar”.
        </div>
      </OnboardingShell>
    );
  }

  if (step === 3) {
    return (
      <OnboardingShell
        step={3}
        total={TOTAL}
        title="Serviços"
        subtitle="Defina preço e duração."
        backHref="/onboarding?step=2"
        nextHref="/onboarding?step=4"
      >
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          (Placeholder) Lista de serviços + associar profissionais.
        </div>
      </OnboardingShell>
    );
  }

  if (step === 4) {
    return (
      <OnboardingShell
        step={4}
        total={TOTAL}
        title="Horários"
        subtitle="Horário semanal."
        backHref="/onboarding?step=3"
        nextHref="/onboarding?step=5"
      >
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          (Placeholder) Horários por profissional.
        </div>
      </OnboardingShell>
    );
  }

  if (step === 5) {
    return (
      <OnboardingShell
        step={5}
        total={TOTAL}
        title="Resumo"
        subtitle="Confirmar antes de ativar."
        backHref="/onboarding?step=4"
        nextHref="/onboarding?step=6"
      >
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          (Placeholder) Resumo: loja, profissionais, serviços e horários.
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={6}
      total={TOTAL}
      title="Ativar marcações"
      subtitle="Tudo pronto."
      backHref="/onboarding?step=5"
      nextHref="/dashboard"
      nextLabel="Ir para dashboard"
    >
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        Tudo pronto 🎉 Pode partilhar o link da sua loja com os clientes.
      </div>
    </OnboardingShell>
  );
}
