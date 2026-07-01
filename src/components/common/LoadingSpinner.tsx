export default function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-gray-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
      {label ?? "불러오는 중..."}
    </div>
  );
}
