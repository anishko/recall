import Link from "next/link";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: 24,
  md: 28,
  lg: 56,
  xl: 72,
  "2xl": 84,
} as const;

/** White circle + two chevrons up, centered with equal spacing */
export function LogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  const px = SIZES[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      width={px}
      height={px}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
      <path
        d="M7.5 11.5L12 7.5l4.5 4"
        stroke="#000000"
        strokeWidth="2.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M7.5 16.5L12 12.5l4.5 4"
        stroke="#000000"
        strokeWidth="2.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function Logo({
  className,
  href,
  showText = true,
  size = "default",
}: {
  className?: string;
  href?: string;
  showText?: boolean;
  size?: "default" | "header" | "hero";
}) {
  const textClass =
    size === "hero"
      ? "font-display text-5xl sm:text-6xl leading-none"
      : size === "header"
        ? "font-display text-5xl sm:text-6xl leading-none"
        : "font-display text-xl leading-none";

  const markSize =
    size === "hero" ? "lg" : size === "header" ? "2xl" : "md";

  const wrapClass = cn(
    "flex items-center",
    size === "default" ? "gap-2.5" : "gap-3.5",
    className,
  );

  const content = (
    <>
      <LogoMark size={markSize} className="block" />
      {showText && (
        <span className={textClass} style={{ color: "var(--color-text)" }}>
          recall
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={wrapClass}>
        {content}
      </Link>
    );
  }

  return <div className={cn(wrapClass, "shrink-0")}>{content}</div>;
}
