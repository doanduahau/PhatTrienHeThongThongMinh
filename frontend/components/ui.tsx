import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { colorLabel } from "@/lib/format";

const base =
  "inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-accent text-accent-text hover:bg-accent/90",
  ghost: "border border-line bg-bg text-ink hover:bg-subtle",
  dark: "bg-ink text-bg hover:bg-ink/90",
} as const;

const sizes = {
  md: "h-11 px-6 text-[15px]",
  lg: "h-12 px-8 text-base",
  sm: "h-9 px-4 text-sm",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

const cls = (variant: Variant = "primary", size: Size = "md", extra = "") =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={cls(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cls(variant, size, className)} {...props} />;
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-shell px-5 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  href,
  linkLabel,
  id,
  actions,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 id={id} className="text-h2 font-semibold">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {href && linkLabel ? (
          <Link
            href={href}
            className="text-sm font-medium text-accent hover:underline"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function Rating({
  value,
  count,
}: {
  value: number | null | undefined;
  count?: number | null;
}) {
  const rating = Number(value);
  const reviews = Number(count) || 0;
  // §6: chỉ hiện sao khi có đánh giá thật (ratingCount > 0).
  if (reviews <= 0 || !Number.isFinite(rating) || rating <= 0) return null;
  const rounded = Math.round(rating);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-sm"
      aria-label={`Đánh giá ${rating.toFixed(1)} trên 5, ${reviews} nhận xét`}
    >
      <span className="text-star" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((index) => (
          <span key={index} className={index <= rounded ? "" : "opacity-30"}>
            ★
          </span>
        ))}
      </span>
      <span className="whitespace-nowrap text-muted">
        {rating.toFixed(1)} ({reviews})
      </span>
    </span>
  );
}

export function ColorDot({ color }: { color: string | null | undefined }) {
  const info = colorLabel(color);
  if (!info) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span
        aria-hidden="true"
        className="inline-block size-3 rounded-full border border-line"
        style={{ background: info.css }}
      />
      {info.label}
    </span>
  );
}

export function EmptyState({
  title,
  text,
  href,
  cta,
}: {
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-subtle px-6 py-16 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-10 text-muted"
        aria-hidden="true"
      >
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-muted">{text}</p>
      <ButtonLink href={href} className="mt-2">
        {cta}
      </ButtonLink>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-card bg-subtle ${className}`} />
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[3/2] w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
