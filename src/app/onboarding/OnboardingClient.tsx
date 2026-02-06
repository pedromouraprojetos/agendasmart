"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingShell from "@/components/OnboardingShell";
import { supabase } from "@/lib/supabaseClient";

const TOTAL = 6;

type BusinessType = "barbershop" | "beauty" | "mixed";
type StoreIdRow = { id: string };
type Staff = { id: string; name: string; email: string | null };
type Service = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
};


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

  // Step 1 (Loja)
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

    const { error } = await supabase.from("stores").upsert(
      {
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

  // Step 2 (Profissionais)
  function Step2Staff() {
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [items, setItems] = useState<Staff[]>([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [stepError, setStepError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    async function load() {
      setStepError(null);
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data: store, error: storeErr } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle<StoreIdRow>();

      if (storeErr || !store) {
        setLoading(false);
        setStepError("Não foi encontrada uma loja. Volte ao Step 1.");
        return;
      }

      setStoreId(store.id);

      const { data: staff, error: staffErr } = await supabase
        .from("staff")
        .select("id,name,email")
        .eq("store_id", store.id)
        .order("created_at", { ascending: true });

      if (staffErr) {
        setLoading(false);
        setStepError(staffErr.message);
        return;
      }

      setItems((staff ?? []) as Staff[]);
      setLoading(false);
    }

    async function addStaff() {
      setStepError(null);

      const n = name.trim();
      const e = email.trim();

      if (!storeId) return;
      if (!n) {
        setStepError("Indique o nome do profissional.");
        return;
      }

      setAdding(true);

      const { error } = await supabase.from("staff").insert({
        store_id: storeId,
        name: n,
        email: e || null,
      });

      setAdding(false);

      if (error) {
        setStepError(error.message);
        return;
      }

      setName("");
      setEmail("");
      await load();
    }

    async function removeStaff(id: string) {
      setStepError(null);
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) {
        setStepError(error.message);
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
    }

    useEffect(() => {
      load();
    }, []);

    return (
      <OnboardingShell
        step={2}
        total={TOTAL}
        title="Profissionais"
        subtitle="Adicione os profissionais da sua loja."
        backHref="/onboarding?step=1"
        nextHref="/onboarding?step=3"
      >
        {loading ? (
          <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
            A carregar...
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Nome</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: João Silva"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Email (opcional)</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: joao@email.pt"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                />
              </label>
            </div>

            {stepError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {stepError}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                onClick={addStaff}
                disabled={adding}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-gray-200"
              >
                {adding ? "A adicionar..." : "Adicionar profissional"}
              </button>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-900">Equipa</div>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                    Ainda não adicionou profissionais.
                  </div>
                ) : (
                  items.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.email ?? "Sem email"}</div>
                      </div>
                      <button
                        onClick={() => removeStaff(p.id)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </OnboardingShell>
    );
  }

  function Step3Services() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);

    const [items, setItems] = useState<Service[]>([]);
    const [name, setName] = useState("");
    const [priceEuros, setPriceEuros] = useState("15");
    const [duration, setDuration] = useState("30");

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function load() {
      setErrorMsg(null);
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data: store, error: storeErr } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle<{ id: string }>();

      if (storeErr || !store) {
        setLoading(false);
        setErrorMsg("Não foi encontrada uma loja. Volte ao Step 1.");
        return;
      }

      setStoreId(store.id);

      const { data: services, error: servicesErr } = await supabase
        .from("services")
        .select("id,name,price_cents,duration_minutes")
        .eq("store_id", store.id)
        .order("created_at", { ascending: true });

      if (servicesErr) {
        setLoading(false);
        setErrorMsg(servicesErr.message);
        return;
      }

      setItems((services ?? []) as Service[]);
      setLoading(false);
    }

    async function addService() {
      setErrorMsg(null);

      if (!storeId) return;

      const n = name.trim();
      const euros = Number(priceEuros.replace(",", "."));
      const mins = Number(duration);

      if (!n) return setErrorMsg("Indique o nome do serviço.");
      if (!Number.isFinite(euros) || euros < 0) return setErrorMsg("Preço inválido.");
      if (!Number.isFinite(mins) || mins <= 0) return setErrorMsg("Duração inválida.");

      const price_cents = Math.round(euros * 100);

      setSaving(true);

      const { error } = await supabase.from("services").insert({
        store_id: storeId,
        name: n,
        price_cents,
        duration_minutes: mins,
      });

      setSaving(false);

      if (error) return setErrorMsg(error.message);

      setName("");
      await load();
    }

    async function removeService(id: string) {
      setErrorMsg(null);
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) return setErrorMsg(error.message);
      setItems((prev) => prev.filter((x) => x.id !== id));
    }

    useEffect(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <OnboardingShell
        step={3}
        total={TOTAL}
        title="Serviços"
        subtitle="Defina preço e duração dos serviços."
        backHref="/onboarding?step=2"
        nextHref="/onboarding?step=4"
      >
        {loading ? (
          <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">A carregar...</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block md:col-span-1">
                <span className="text-sm font-medium text-gray-700">Serviço</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Corte de cabelo"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                />
              </label>

              <label className="block md:col-span-1">
                <span className="text-sm font-medium text-gray-700">Preço (€)</span>
                <input
                  value={priceEuros}
                  onChange={(e) => setPriceEuros(e.target.value)}
                  placeholder="ex: 15"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                />
              </label>

              <label className="block md:col-span-1">
                <span className="text-sm font-medium text-gray-700">Duração (min)</span>
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="ex: 30"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                />
              </label>
            </div>

            {errorMsg ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                onClick={addService}
                disabled={saving}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-gray-200"
              >
                {saving ? "A adicionar..." : "Adicionar serviço"}
              </button>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-900">Serviços</div>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                    Ainda não adicionou serviços.
                  </div>
                ) : (
                  items.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">
                          {(s.price_cents / 100).toFixed(2)}€ · {s.duration_minutes} min
                        </div>
                      </div>
                      <button
                        onClick={() => removeService(s.id)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </OnboardingShell>
    );
  }

  // Render por step
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
    return <Step2Staff />;
  }

  if (step === 3) {
    return <Step3Services />;
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
