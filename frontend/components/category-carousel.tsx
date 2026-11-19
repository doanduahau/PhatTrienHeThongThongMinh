"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { Container, SectionHeader } from "./ui";
import { CategoryArt } from "./category-art";

function ScrollArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={direction === "left" ? "Cuộn danh mục sang trái" : "Cuộn danh mục sang phải"}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-btn border border-line text-ink transition-colors hover:bg-subtle disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
        {direction === "left" ? <path d="m14.5 6-6 6 6 6" /> : <path d="m9.5 6 6 6-6 6" />}
      </svg>
    </button>
  );
}

/** Cuộn ngang có prev/next; ẩn nút khi danh mục vừa khít màn hình. */
export function CategoryCarousel({ categories }: { categories: Category[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const distance = Math.max(240, Math.round(el.clientWidth * 0.7));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * distance, behavior: reduced ? "auto" : "smooth" });
  };

  if (categories.length === 0) return null;
  const scrollable = !(edge.start && edge.end);

  return (
    <section className="py-12 lg:py-16" aria-labelledby="category-heading">
      <Container>
        <SectionHeader
          id="category-heading"
          title="Danh mục gear"
          href="/san-pham"
          linkLabel="Xem tất cả"
          actions={
            scrollable ? (
              <span className="hidden gap-2 sm:flex">
                <ScrollArrow direction="left" disabled={edge.start} onClick={() => nudge(-1)} />
                <ScrollArrow direction="right" disabled={edge.end} onClick={() => nudge(1)} />
              </span>
            ) : null
          }
        />
        <ul
          ref={listRef}
          onScroll={measure}
          className="flex snap-x gap-4 overflow-x-auto pb-1 [justify-content:safe_center]"
        >
          {categories.map((category) => (
            <li key={category.id} className="w-36 shrink-0 snap-start list-none sm:w-44 lg:w-52">
              <Link
                href={`/danh-muc/${category.slug}`}
                className="group flex flex-col gap-3"
              >
                <span className="flex aspect-[4/3] items-center justify-center rounded-card bg-subtle transition-colors group-hover:bg-line">
                  <CategoryArt slug={category.slug} className="size-12 text-ink" />
                </span>
                <span className="font-medium leading-snug group-hover:text-accent">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
