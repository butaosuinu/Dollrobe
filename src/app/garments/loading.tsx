import Skeleton from "@/components/ui/Skeleton";

const GarmentsLoading = () => (
  <div className="flex flex-col gap-4 p-4">
    <Skeleton className="h-7 w-36" />
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1 rounded-lg" />
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 w-16 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-full" />
      <Skeleton className="h-8 w-16 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  </div>
);

export default GarmentsLoading;
