import OnboardingShell from "@/components/OnboardingShell";
import Input from "@/components/Input";

type Props = {
  searchParams?: Promise<{ step?: string }> | { step?: string };
};

const TOTAL = 6;

export default async function OnboardingPage({ searchParams }: Props) {
    const sp = await Promise.resolve(searchParams ?? {});
    const step = Math.min(TOTAL, Math.max(1, Number(sp.step ?? "1")));

  if (step === 1) {
    return (
      <OnboardingShell
        step={1}
        total={TOTAL}
        title="Dados da loja"
        subtitle="Defina o nome e o link público da sua loja."
        nextHref="/onboarding?step=2"
        nextLabel="Continuar"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="storeName" label="Nome da loja" placeholder="ex: Barbearia Central" />
          <div className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Tipo</span>
              <select className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-gray-100">
                <option>Barbearia</option>
                <option>Estética</option>
                <option>Misto</option>
              </select>
            </label>
          </div>
          <Input name="city" label="Cidade" placeholder="ex: Porto" />
          <Input name="slug" label="Link da loja (slug)" placeholder="ex: barbearia-central" />
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Exemplo: <span className="font-medium text-gray-900">agendasmart.vercel.app/barbearia-central</span>
        </p>
      </OnboardingShell>
    );
  }

  if (step === 2) {
    return (
      <OnboardingShell
        step={2}
        total={TOTAL}
        title="Profissionais"
        subtitle="Adicione os profissionais que vão receber marcações."
        backHref="/onboarding?step=1"
        nextHref="/onboarding?step=3"
      >
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          (Placeholder) Aqui vai existir uma lista de profissionais + botão “Adicionar”.
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
        subtitle="Defina preço e duração de cada serviço."
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
        subtitle="Defina o horário semanal de cada profissional."
        backHref="/onboarding?step=3"
        nextHref="/onboarding?step=5"
      >
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          (Placeholder) Horário semanal simples + botão “Aplicar a todos”.
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
        subtitle="Confirme os dados antes de ativar marcações."
        backHref="/onboarding?step=4"
        nextHref="/onboarding?step=6"
        nextLabel="Continuar"
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
      subtitle="A sua loja vai ficar disponível para clientes marcarem online."
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
