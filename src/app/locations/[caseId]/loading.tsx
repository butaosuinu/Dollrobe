import Skeleton from "@/components/ui/Skeleton";

const Loading = () => (
  <div className="flex flex-col gap-4 p-4">
    <Skeleton className="h-9 w-32 rounded-lg" />
    <Skeleton className="h-96 rounded-2xl" />
  </div>
);

export default Loading;
