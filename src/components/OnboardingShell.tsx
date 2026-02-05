import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import Button from "@/components/Button";

export default function OnboardingShell({
  step,
  total,
  title,
  subtitle,
  backHref,
  nextHref,
  nextLabel = "Continuar",
  children,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  backHref?: string;
  nextHref?: string;
  nextLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <span className="text-xl font-semibold tracking-tight">AgendaSmart</span>
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <ProgressBar step={step} total={total} />

          <div className="mt-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
          </div>

          <div className="mt-6">{children}</div>

          <div className="mt-8 flex items-center justify-between gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Voltar
              </Link>
            ) : (
              <div />
            )}

            {nextHref ? (
              <Link href={nextHref} className="w-full max-w-xs">
                <Button>{nextLabel}</Button>
              </Link>
            ) : (
              <div className="w-full max-w-xs" />
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Pode ajustar tudo mais tarde nas Definições.
        </p>
      </div>
    </main>
  );
}
