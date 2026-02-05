import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard (Gerente)">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Trial" subtitle="Estado do plano">
          <div className="text-sm text-gray-700">
            Está em <span className="font-semibold">trial</span>.
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">14 dias</div>
          <p className="mt-2 text-xs text-gray-500">
            (Placeholder) Depois vamos calcular os dias restantes.
          </p>
        </Card>

        <Card title="Link da sua loja" subtitle="Partilhe com os seus clientes">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            agendasmart-lime.vercel.app/<span className="font-medium">nomedaloja</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
              Copiar
            </button>
            <Link
              href="/nomedaloja"
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Abrir
            </Link>
          </div>
          <p className="mt-2 text-xs text-gray-500">(Placeholder) O slug será dinâmico.</p>
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Agenda" subtitle="Visão geral (placeholder)">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            Aqui vai aparecer a agenda semanal e filtros por profissional.
          </div>
        </Card>

        <Card title="Últimas marcações" subtitle="Atividade recente (placeholder)">
          <div className="space-y-3">
            {["10:00 Corte cabelo", "11:00 Barba", "12:30 Sobrancelha"].map((t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div className="text-sm font-medium text-gray-900">{t}</div>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                  Confirmado
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
