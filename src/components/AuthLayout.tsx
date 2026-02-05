import Link from "next/link";

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <span className="text-xl font-semibold tracking-tight">AgendaSmart</span>
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Ao continuar, concorda com os Termos e a Política de Privacidade.
        </p>
      </div>
    </main>
  );
}
