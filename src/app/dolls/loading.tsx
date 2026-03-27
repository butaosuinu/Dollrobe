import Skeleton from "@/components/ui/Skeleton";

const DollsLoading = () => (
  <div className="flex flex-col gap-4 p-4">
    <Skeleton className="h-7 w-36" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  </div>
);

export default DollsLoading;
