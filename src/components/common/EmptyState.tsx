export default function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
      <p className="text-sm font-medium text-white/70">{title}</p>
      {description && <p className="mt-1 text-xs text-white/40">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
