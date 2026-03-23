import Skeleton from "@/components/ui/Skeleton";

const NfcWriteLoading = () => (
  <div className="flex flex-col gap-4 p-4">
    <Skeleton className="h-7 w-48" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);

export default NfcWriteLoading;
