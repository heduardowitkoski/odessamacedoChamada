
export function SpotBar({ spots, total }: { spots: number; total: number }) {
  const pct = Math.round(((total - spots) / total) * 100);
  const isFull = spots === 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Disponibilidade</span>
        <span className={`font-semibold ${isFull ? "text-red-500" : "text-emerald-600"}`}>
          {isFull ? "Turma cheia" : "Há vagas"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFull ? "bg-red-400" : pct >= 80 ? "bg-orange-400" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
