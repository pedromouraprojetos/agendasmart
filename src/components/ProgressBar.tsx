export default function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((step / total) * 100)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Passo {step} de {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-black transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
