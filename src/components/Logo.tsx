export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { wrapper: "gap-2", icon: 20, text: "text-lg" },
    md: { wrapper: "gap-3", icon: 28, text: "text-2xl" },
    lg: { wrapper: "gap-3", icon: 36, text: "text-4xl" },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.wrapper}`}>
      {/* Minimal house/door icon — custom SVG */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 3L4 13V28C4 28.5523 4.44772 29 5 29H13V20H19V29H27C27.5523 29 28 28.5523 28 28V13L16 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="21" cy="21" r="1.5" fill="var(--color-accent)" />
      </svg>
      <div>
        <span className={`${s.text} font-semibold tracking-tight`}>el casito</span>
      </div>
    </div>
  );
}
