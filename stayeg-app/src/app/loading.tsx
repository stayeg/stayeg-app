export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 rounded-xl bg-gradient-to-br from-brand-deep to-brand-teal animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-3 w-32 rounded-full bg-muted animate-pulse" />
          <div className="h-2.5 w-24 rounded-full bg-muted animate-pulse delay-100" />
        </div>
      </div>
    </div>
  );
}
