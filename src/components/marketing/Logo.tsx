type Props = {
  readonly size?: number;
  readonly className?: string;
};

const Logo = ({ size = 40, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Doll Wardrobe"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="oklch(0.72 0.14 350)" />
        <stop offset="100%" stopColor="oklch(0.6 0.16 290)" />
      </linearGradient>
    </defs>
    <rect
      x="1"
      y="1"
      width="38"
      height="38"
      rx="12"
      fill="url(#logoGradient)"
    />
    <path
      d="M12 14 L20 10 L28 14 L28 27 Q28 30 25 30 L15 30 Q12 30 12 27 Z"
      fill="oklch(0.985 0.005 85)"
      opacity="0.95"
    />
    <circle cx="20" cy="10" r="2.2" fill="oklch(0.985 0.005 85)" />
    <path
      d="M20 10 L20 8"
      stroke="oklch(0.985 0.005 85)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export default Logo;
