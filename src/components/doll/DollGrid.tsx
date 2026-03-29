import type { Doll } from "@/types";
import DollCard from "@/components/doll/DollCard";

type Props = {
  readonly dolls: readonly Doll[];
};

const DollGrid = ({ dolls }: Props) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
    {dolls.map((doll, i) => (
      <div
        key={doll.id}
        className="animate-[slide-up_0.3s_ease-out_both]"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <DollCard doll={doll} />
      </div>
    ))}
  </div>
);

export default DollGrid;
