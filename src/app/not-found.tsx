import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-gray-600">
          O link pode estar errado ou a página já não existe.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-gray-200"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
