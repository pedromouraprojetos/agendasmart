import Link from "next/link";

export default function StaffShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-white min-h-screen sticky top-0">
          <div className="px-6 py-5">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              AgendaSmart
            </Link>
            <p className="mt-1 text-xs text-gray-500">Área do profissional</p>
          </div>

          <nav className="flex-1 px-3">
            <Link
              href="/staff"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              A minha agenda
            </Link>
          </nav>

          <div className="border-t border-gray-200 px-6 py-4">
            <div className="text-xs text-gray-500">Conta</div>
            <div className="mt-1 text-sm font-medium text-gray-900">Profissional (placeholder)</div>
            <Link href="/login" className="mt-3 inline-block text-sm text-gray-700 hover:underline">
              Terminar sessão
            </Link>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <h1 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h1>
              <p className="text-xs text-gray-500">AgendaSmart</p>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
