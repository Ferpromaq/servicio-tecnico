interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function Field({ label, required, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="text-orange-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}
