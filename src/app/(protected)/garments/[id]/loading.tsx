import Skeleton from "@/components/ui/Skeleton";

const GarmentDetailLoading = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="size-9 rounded-lg" />
      <Skeleton className="h-6 w-16" />
    </div>
    <Skeleton className="aspect-[4/3] rounded-2xl" />
    <div>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-32" />
    </div>
    <Skeleton className="h-24 rounded-xl" />
    <Skeleton className="h-16 rounded-xl" />
  </div>
);

export default GarmentDetailLoading;
