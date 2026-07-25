export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video bg-white/5 rounded-xl mb-3" />
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
          <div className="h-2.5 bg-white/5 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
