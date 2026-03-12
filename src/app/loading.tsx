import Skeleton from "@/components/ui/Skeleton";

const DashboardLoading = () => (
  <div className="flex flex-col gap-6 p-4">
    <div>
      <Skeleton className="mb-3 h-4 w-20" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
    <Skeleton className="h-20 rounded-xl" />
    <div>
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="flex gap-3">
        <Skeleton className="h-48 w-36 shrink-0 rounded-xl" />
        <Skeleton className="h-48 w-36 shrink-0 rounded-xl" />
        <Skeleton className="h-48 w-36 shrink-0 rounded-xl" />
      </div>
    </div>
  </div>
);

export default DashboardLoading;
