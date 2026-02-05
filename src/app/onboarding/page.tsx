import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";

export default function OnboardingPage() {
  return (
    <AuthLayout title="Onboarding" subtitle="Passo 1 de 6 — Configurar a sua loja.">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Aqui vamos configurar loja, equipa, serviços e horários.
        </div>

        <Button>Continuar</Button>

        <p className="text-center text-sm text-gray-600">
          <Link href="/dashboard" className="font-medium text-gray-900 hover:underline">
            Ir para dashboard (placeholder)
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
