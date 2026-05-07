import Skeleton from "@/components/ui/Skeleton";

const LocationsLoading = () => (
  <div className="flex flex-col gap-4 p-4">
    <Skeleton className="h-7 w-28" />
    <Skeleton className="h-48 rounded-xl" />
    <Skeleton className="h-48 rounded-xl" />
  </div>
);

export default LocationsLoading;
