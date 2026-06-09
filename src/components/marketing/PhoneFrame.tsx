import Image from "next/image";
import clsx from "clsx";

type Props = {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly className?: string;
};

const PhoneFrame = ({ src, alt, width, height, className }: Props) => (
  <div
    className={clsx(
      "aspect-[9/19] overflow-hidden rounded-[1.8rem] border-[8px] border-text-primary/90 bg-surface-base shadow-2xl",
      className,
    )}
  >
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className="size-full object-cover"
    />
  </div>
);

export default PhoneFrame;
