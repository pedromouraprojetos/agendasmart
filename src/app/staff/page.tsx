import StaffShell from "@/components/StaffShell";
import Card from "@/components/Card";

export default function StaffPage() {
  return (
    <StaffShell title="Agenda (Profissional)">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Hoje" subtitle="Resumo do dia (placeholder)">
          <div className="text-2xl font-semibold tracking-tight">3 marcações</div>
          <p className="mt-2 text-sm text-gray-600">Próxima: 10:00</p>
        </Card>

        <Card title="Estado" subtitle="O que pode fazer">
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Ver a sua agenda</li>
            <li>Marcar serviços como concluídos</li>
          </ul>
        </Card>

        <Card title="Ações" subtitle="Placeholder">
          <button className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
            Marcar como concluído
          </button>
          <p className="mt-2 text-xs text-gray-500">
            (Placeholder) No MVP real, só conclui.
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <Card title="Marcações de hoje" subtitle="Lista (placeholder)">
          <div className="space-y-3">
            {[
              { time: "10:00", service: "Corte cabelo", client: "João" },
              { time: "11:00", service: "Barba", client: "Rui" },
              { time: "12:30", service: "Sobrancelha", client: "Ana" },
            ].map((b) => (
              <div
                key={b.time}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {b.time} — {b.service}
                  </div>
                  <div className="text-xs text-gray-600">{b.client}</div>
                </div>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                  Confirmado
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </StaffShell>
  );
}
