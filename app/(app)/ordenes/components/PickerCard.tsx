import { X } from "lucide-react";

interface PickerCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  tag?: string | null;
  onClear: () => void;
}

export function PickerCard({ icon: Icon, title, subtitle, tag, onClear }: PickerCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      {tag && (
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          {tag}
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
      >
        <X size={15} />
      </button>
    </div>
  );
}
