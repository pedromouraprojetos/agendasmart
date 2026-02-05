import Link from "next/link";

export default function GerirPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold tracking-tight">Gerir marcação</h1>
        <p className="mt-2 text-sm text-gray-600">
          (Placeholder) Aqui vamos permitir cancelar ou reagendar via link enviado por email.
        </p>
        <div className="mt-6">
          <Link href="/" className="text-sm font-medium text-gray-900 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
