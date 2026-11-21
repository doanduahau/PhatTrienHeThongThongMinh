# UI-UX-SKILLS.md

> **Cách dùng (tiếng Việt):** Tài liệu này là hợp đồng thiết kế của repo. Agent phải đọc trước khi sửa bất kỳ UI nào.
> Với Qoder/Cline/Cursor/Claude Code, tham chiếu nó từ `docs/AGENTS.md` hoặc `frontend/AGENTS.md`.
> Nội dung viết bằng tiếng Anh vì agent tuân thủ tốt hơn. Bạn vẫn có thể ra lệnh cho agent bằng tiếng Việt.
> Khi đổi phong cách, sửa **1. Design Brief**, **4. Tokens** và bảng **3.9 Deviation register**.
>
> **Trạng thái:** cập nhật theo code đang chạy trong `frontend/` (storefront Next.js đã hoàn tất migration từ HTML tĩnh).
> Mọi mô tả ở đây là **mô tả thực tế** — nếu code lệch, code đúng, tài liệu phải theo; chỉ mục 3.9 liệt kê chỗ cần hội tụ.

---

## 0. Role and Priority

You are a senior product designer and front-end engineer. Your job is to build interfaces that look **designed by a human with a point of view**, not generated from a template.

Priority order when rules conflict:

1. The user's explicit instructions in the current message.
2. The Design Brief (section 1) and Tokens (section 4) in this file.
3. Every other rule in this file.

If the user's request or the brief is missing something you need (product, audience, real content), **ask or state a one-line assumption**. Never fill the gap with invented content.

---

## 1. Design Brief (edit this per project)

```
Product:            Gear Shop — e-commerce gaming gear + ergonomic office gear (chuột, bàn phím, lót chuột,
                    tai nghe/soundcard, ghế, bàn, arm) with smart search + ML recommendations.
                    A separate admin console (section 5.5) ships on the same design system but with its own shell.
Audience:           Vietnamese gamers and desk-setup buyers who compare specs before buying.
Primary job:        Find the right product (browse, filter by real spec, or describe it in a sentence) and add it to cart.
Reference sites:    phongcachxanh.vn (commerce density, mega-menu, dark media bands), apple.com (hero restraint)
Direction:          Product-first storefront on a white canvas, ONE blue accent, and a deliberate "dark media
                    surface" for the hero, the category banner, the announcement bar and the search band.
                    Boldness is spent on imagery and type; the shopping chrome stays quiet and tokenised.
Tone of voice:      Plain, direct, friendly Vietnamese. No marketing fluff.
Language of UI:     Vietnamese
Real content:       From business service API (:5001) via NEXT_PUBLIC_API_URL — products, prices, images, stock,
                    ratings. Never invent products, prices, ratings or reviews in a component.
```

> **Port contract (resolved):** the business service listens on `PORT=5001` (`backend/business-service/.env`) and
> `frontend/lib/api.ts` + `lib/server-auth.ts` fall back to `http://localhost:5001`. macOS occupies 5000
> (ControlCenter / AirPlay Receiver) and Next.js dev takes 3000, so 5001 is the agreed slot. `backend/.env.example`
> intentionally still says `3000`; set `NEXT_PUBLIC_API_URL` when the backend runs elsewhere.

---

## 2. Core Philosophy

1. **Subtract first.** Every element must earn its place. If removing it does not hurt comprehension or action, remove it.
2. **One idea per screen/section.** One headline, at most one supporting line, one or two actions.
3. **The subject is the hero.** The product, photo, data or content is the star. UI chrome stays quiet.
4. **Hierarchy through type and space**, not through boxes, borders, colors or icons.
5. **One memorable thing per page.** The storefront spends its boldness on the full-bleed hero imagery; everything
   below it (filters, cards, forms, tables) is calm, bordered and tokenised.
6. **Decisions, not defaults.** Every choice (font, color, radius, layout) should be explainable by the brief. If you
   would make the same choice for any product, it is a default; reconsider it.
7. **Commerce density over editorial whitespace.** Shoppers scan many blocks; blocks are tighter than a portfolio page
   (see 4.3) and information-dense cards are acceptable when the card *is* the product.

---

## 3. Anti-"AI Look" Rules

These are the tells of generated UI. Do **not** use them unless the user explicitly asks or the carve-out below applies.

### 3.1 Structure and decoration
- No wrapping every group of content in **cards** (rounded box + shadow + border). Use cards only when items are truly independent objects the user compares or selects (product listings, order rows, checkout summary, filter boxes).
- No identical marketing card grids (3 equal columns, each with icon + title + two lines of invented copy).
- No **icons inside rounded squares/circles** next to features. The trust row uses bare 24px line icons (3.9 exception, see below).
- No **badges / pills / eyebrow labels** above headings as decoration. Eyebrows are allowed only when they carry real
  data: product category/brand on a ProductCard, "Sản phẩm nổi bật" on the featured card of a category banner.
- No gradients as decoration (especially purple-blue), no glow, no blurred color blobs, no mesh backgrounds.
  **Carve-out (approved):** a scrim gradient over a photograph for text legibility (`bg-gradient-to-t from-ink`,
  `bg-gradient-to-b from-black/60`) and one radial dark wash behind hero copy are allowed — they are functional, not ornamental.
- No heavy or identical soft grey shadows on everything. One floating-layer shadow token only (`shadow-float`, 4.4).
- No same border-radius on everything. Radius follows hierarchy: `rounded-card` (12px) containers, `rounded-btn` (8px) controls, `rounded-full` for toggles/avatars/badges.
- No decorative dividers or numbered markers — **except** the numbered policy sections (`1./2./3.` on `/giao-hang`,
  `/doi-tra-bao-hanh`, `/lien-he`) and the numbered hero dots, where the number is a real sequence or a real index.
- No emoji in UI. No emoji as icons. Star glyphs (`★`) are the one allowed text glyph, rating only.

### 3.2 Content
- **No invented content.** No fake stats, fake testimonials, fake logos, lorem ipsum.
- No filler paragraphs. Do not add a description under every title "to fill the space".
- No marketing fluff: "seamless", "cutting-edge", "revolutionary", "elevate your", "next-generation", "all-in-one".
- No sections the user did not ask for (no unrequested "Testimonials", "Newsletter", "Stats" bands).
- **Copy that states a service promise must be a real, decided policy.** Today the announcement bar
  ("Miễn phí ship từ 1 triệu"), the trust row and the three policy pages are **hardcoded marketing copy**, and the
  mega-menu featured tiles point at hardcoded product ids (`/san-pham/228`, `/san-pham/328`) with hot-linked external
  images. Treat all of it as content the owner must confirm — never add more of it on your own initiative.

### 3.3 Typography tells
- No accenting a single word in a headline with a different color/italic/gradient.
- No tracked-out ALL-CAPS labels above every heading. Allowed in three places only: policy-page eyebrows, the
  mobile-drawer group headers, the "Sản phẩm nổi bật" micro-label.
- No meta strings joined by middle dots.
- No monospace font for small labels just to look "techy".
- No trailing "→" on every link or button. Allowed: the drawer's "Xem tất cả …", the mega-menu "Xem tất cả" (icon, not character).
- Do not use tinted pure black as a global default; this project's dark surface is the `ink` token on purpose (4.1).

### 3.4 Layout tells
- Do not make everything symmetrical, equally spaced and equally weighted. The catalog deliberately breaks symmetry:
  `260px / 1fr / 19rem` three-column at `xl`.
- Do not center-align long text. Centered text is used only in the hero overlay, the 404 page and empty states.
- Do not use three-column feature rows as the default way to present benefits.

### 3.5 Motion tells
- No fade-and-slide-up on every section, no hover lift on every card, no scattered micro-animations.
- No parallax or looping decorative animation. Auto-advancing carousels are a **commerce** pattern here, not decoration:
  they must pause on hover/focus, expose an explicit pause control, and stop under `prefers-reduced-motion` (8).

### 3.6 Copy and content hygiene
- **No caption under section headings.** `SectionHeader` renders title + optional link + optional `actions` only (6).
- **No meta text about how the page was made.** Never write "generated", "sample", "template" on the page.
- **Say each fact once.** Product name appears once in the card; the hero headline is the product name and the
  supporting line is a per-category sentence — do not repeat it in the block below.
- **No overclaiming.** No "tốt nhất", "100%", "hoàn toàn" without a number or source.
- **No contradictory or unexplained metrics.** If a rating and a review count appear together, they come from the API.
- **Do not inflate titles or roles** in any about/contact copy (student project; keep it truthful).
- **No duplicate bullets.** Before finishing, merge bullets that describe the same thing in different words.
- **No visible placeholders or builder widgets in the final page.** `CategoryArt` is a real line-art fallback for a
  missing product photo, not a "[Photo here]" box; if it shows up on a live product, report the missing image.
- **No UI that stores data in the visitor's browser pretending to update the site.** The guest cart
  (`localStorage.gear_guest_cart`) and the saved filter set (`gear_filters{basePath}`) are user state, and the UI says
  so ("Giỏ đang lưu trên trình duyệt này… Đăng nhập để đồng bộ").

### 3.7 Privacy on public pages
- Do not publish date of birth, national ID, student ID, or private social accounts unless the user explicitly asks.
- Phone/email/address in the footer and on `/lien-he` are shop contact details the owner supplied — keep them in one
  place each (footer + contact page), never duplicate into a component.
- Never render `password`, `resetTokenHash`, `verifyTokenHash` or a raw JWT in the DOM. The storefront reads the token
  only from the httpOnly cookie server-side.

### 3.8 Admin console pages
- Data is the hero. A table or a stat card earns its place only if the admin can act on it.
- No dashboard decoration: no gradient stat cards, no icon-in-circle KPI tiles, no chart without an axis label and a unit.
- Every list must state its total count and its active filters; every destructive action needs a confirm step.

### 3.9 Deviation register (real gaps in the current code — converge, do not copy)

| Where | Now | Should be |
|:---|:---|:---|
| `components/category-banner.tsx` | raw hex `bg-[#0b101b]`, `bg-[#121927]/80`, `hover:bg-[#1a2438]` | dark-surface tokens (4.1) |
| `category-banner.tsx`, `header.tsx`, `smart-search.tsx` | `text-white` / `bg-white/10` | `text-bg` / opacity on `bg` |
| `category-banner.tsx` | `rounded-2xl`, `rounded-xl`, `rounded-lg`, `shadow-2xl` | `rounded-card`, `shadow-float` |
| `header.tsx:499` | solid header uses `bg-bg/95 … backdrop-blur-md shadow-sm` | flat `bg-bg` + `border-b border-line`, no second shadow |
| `category-banner.tsx` | glass panel `backdrop-blur-md border-white/10` | solid dark panel (glass was never in the brief) |
| `lib/nav-data.ts`, `app/page.tsx:88` | hot-linked third-party image URLs | API-driven tiles, or self-hosted assets |
| `catalog-view.tsx` | smart-search intent renders as one sentence | filter chips the user can remove (documented intent, not yet built) |

---

## 4. Design Tokens

Tokens are defined **once** in `frontend/app/globals.css` (`:root` + Tailwind v4 `@theme inline`). Components
reference token classes only (`bg-bg`, `text-muted`, `border-line`, `bg-accent`, `rounded-card`) — never raw hex and
never a default palette name like `blue-600`.

### 4.1 Color

```css
:root {
  --bg:            #FFFFFF;   /* page background */
  --bg-subtle:     #F6F8FB;   /* alternate section background, image letterbox */
  --text:          #111827;   /* primary text — also the dark surface (bg-ink) */
  --text-muted:    #5B6472;   /* secondary text */
  --border:        #E5E7EB;   /* 1px boundaries: card border, table row, input */
  --accent:        #2457E6;   /* the ONE accent: primary actions, links, active nav, focus */
  --accent-text:   #FFFFFF;   /* text on accent */
  --accent-soft:   #EAF0FF;   /* selected filter row, tinted info strip */
  --danger:        #E11D48;   /* errors, out-of-stock, sale */
  --star:          #F59E0B;   /* rating stars only */
  --footer-bg:     #0B1220;   /* footer only */
  --footer-text:   #F8FAFC;
}
```

Tailwind mapping in use: `bg-bg`, `bg-subtle`, `text-ink`, `text-muted`, `border-line`, `bg-accent`,
`text-accent-text`, `bg-accent-soft`, `text-danger`, `text-star`, `bg-footer`, `text-footer-text`.

Rules:
- **Dark surface = `bg-ink`.** The announcement bar, hero, smart-search band, policy aside and toasts use `bg-ink` +
  `text-bg`. `bg-footer` is reserved for the footer. Do not introduce a third dark value.
- On a dark surface, secondary text is an opacity of the light colour (`text-bg/85`, `text-bg/70`), not a new hex.
- Accent is used only for the primary action, links, active nav and focus. Never for decoration.
- Text contrast: 4.5:1 body, 3:1 large text and UI components.
- `--bg` / `--bg-subtle` alternation replaces dividers between homepage blocks.

### 4.2 Typography

- **One family:** `Be Vietnam Pro`, weights `400 500 600 700`, loaded via `next/font/google` with
  `subsets: ["latin","vietnamese"]`, exposed as `--font-be-vietnam` → `font-sans` (`app/layout.tsx:9-13`). No Google
  Fonts `<link>`.
- Applied scale (fluid `clamp()`, exactly as in `globals.css`):

| Token | Mobile → Desktop | LH / LS | Used for |
|:---|:---|:---|:---|
| `text-display` | 40 → 72px | 1.05 / -0.025em | hero H1, 404 "404", static hero |
| `text-h1` | 36 → 56px | 1.1 / -0.02em | page-level H1 |
| `text-h2` | 28 → 40px | 1.15 / -0.015em | `SectionHeader` title |
| `text-h3` | 20 → 24px | 1.3 / — | trust-row titles, sub-blocks |
| `text-lead` | 18 → 22px | 1.45 / — | hero support line |
| `text-sm` / `text-xs` | 14 / 12 | 1.4 / — | meta, eyebrows, stock label |
| body | 16px | 1.5 | — |

- Product detail H1 is currently `text-3xl lg:text-4xl` (literal Tailwind step, not `text-h1`) — acceptable for a
  data page, do not propagate it to marketing headings.
- Sentence case everywhere except proper nouns and the three approved ALL-CAPS eyebrows (3.3).
- `text-wrap: balance` on `h1,h2,h3` and `text-wrap: pretty` on `p` are set globally in `globals.css` — do not restate.
- Money and counts use `tabular-nums`.
- Do not use more than **4 distinct font sizes** within one section.

### 4.3 Spacing

8px base scale. Storefront rhythm, as shipped:

- Homepage block padding: `py-12 lg:py-16` (48/64px) — **not** the 96-160px of an editorial page.
- `Container` = `mx-auto w-full max-w-shell px-5 lg:px-10` → **1760px** cap (`--container-shell: 110rem`), 20px gutter
  mobile / 40px desktop. Reading pages (`/giao-hang`, `/doi-tra-bao-hanh`, `/lien-he`) use `max-w-4xl` instead.
- Grid gaps: `gap-4 lg:gap-6` product grids, `gap-8` catalog shell, `gap-10` product detail and cart columns.
- Card inner padding: `p-4` product card, `p-6` summary/order cards, `p-8` mega-menu panel.
- Header stack height: announcement `h-9` (36px) + main bar `h-[4.5rem]` (72px) = **108px**; non-home pages render a
  `h-[108px]` spacer because the header is `fixed`.
- Controls: `h-11` (44px) default button/input, `h-12` hero + quantity, `h-9` small; filter section header `h-11`;
  results header `h-11`.
- When something feels cramped, increase spacing before adding any element.

### 4.4 Shape and elevation

- Radius: `--radius-card: 12px` (containers, images, banners, empty states) / `--radius-btn: 8px` (buttons, inputs,
  chips, rows) / `rounded-full` (toggles, icon buttons, dots, cart badge).
- Shadow: exactly one token, `--shadow-float: 0 12px 32px -16px rgb(17 24 39 / .28)`, for floating layers only —
  mega-menu, mobile drawer, toast. Cards at rest have a `border border-line`, no shadow.
- Borders: 1px `--border` to frame a card, separate a table/summary row or draw an input. On dark surfaces use a
  low-alpha light border instead of a new grey.

---

## 5. Layout Rules

### 5.0 Stack and data access

Next.js **16** App Router + Tailwind **v4** (`@import "tailwindcss"`, tokens in `@theme inline`) + TypeScript,
`cacheComponents` and `partialPrefetching` enabled, Turbopack CSS rule wired to `@tailwindcss/turbopack`
(`next.config.ts`). The static HTML frontend is gone; do not look for `frontend/*.html`.

**Actual structure**

```
frontend/
  app/
    layout.tsx              # font, skip link, StoreProvider — chrome belongs to the route groups below
    globals.css             # tokens + base only — no component CSS here
    loading|error|not-found.tsx
    (shop)/                 # everything a customer sees: HeaderShell (Suspense) + main#main + Footer
      layout.tsx
      page.tsx              # homepage (server, Suspense)
      danh-muc/[slug]/      # catalog for one category OR a category group (gaming-gear, office-gear)
      san-pham/             # page.tsx = all products; [id]/page.tsx = detail
      gio-hang/             # cart page + client
      thanh-toan/           # checkout
      don-hang/             # my orders + account sidebar
      thong-tin-ca-nhan/    # profile + password
      dang-nhap/            # login/register
      giao-hang/  doi-tra-bao-hanh/  lien-he/    # static policy pages
    admin/                  # own shell (components/admin/shell.tsx) + server gate, no shop chrome
      layout.tsx            # AdminShell > Suspense > AdminGate
    api/auth/{login,register,me,logout}/        # same-origin auth, sets httpOnly cookie
    api/proxy/[...path]/                        # JWT-carrying passthrough for private endpoints
  components/               # flat — no ui/ layout/ product/ subfolders
    ui.tsx                  # Button, ButtonLink, Container, SectionHeader, Rating, ColorDot, EmptyState, Skeleton
    header.tsx footer.tsx header-shell.tsx hero.tsx smart-search.tsx
    store.tsx               # client provider: session, cart, cart drawer, toast
    catalog-view.tsx category-banner.tsx category-filters.tsx category-carousel.tsx product-sort.tsx
    product-card.tsx quick-add.tsx add-to-cart.tsx for-you.tsx category-art.tsx
    cart-drawer.tsx cart-line-row.tsx not-found.tsx
    admin/                  # shell.tsx gate.tsx ui.tsx + one *-client.tsx per console route
  lib/
    api.ts                  # catalogApi (public, cached) + api (authRequest via /api/proxy) + authFetch
    server-auth.ts          # BE_BASE, COOKIE_NAME "gear_token", beFetch(), publicUser()
    types.ts format.ts nav-data.ts category-groups.ts home-data.ts
```

**Server vs client**
- Pages are server components that fetch through `catalogApi` with `next: { revalidate }` (60s products, 300s
  categories/brands). `HeaderShell` is a server component that hands static nav data to the client `Header`.
- `"use client"` sits on the interactive leaves: `header`, `hero`, `smart-search`, `store`, `catalog-view`,
  `category-filters`, `quick-add`, `add-to-cart`, `cart-drawer`, the auth/cart/checkout/orders clients.
- One provider (`StoreProvider`) owns session, cart, cart drawer and toast. Server components never import it.

**Data access**
- Never `fetch` inside a component: `lib/api.ts` only. `API_BASE = NEXT_PUBLIC_API_URL ?? …` (see §1 gap note).
- Public reads hit the business service directly. **Anything needing the JWT goes through `/api/proxy/<path>`**, which
  reads the httpOnly cookie and re-attaches `Authorization: Bearer …` server-side (`app/api/proxy/[...path]/route.ts`).
  `authRequest("admin/orders")` therefore resolves to `GET {BE}/api/admin/orders` with no extra wiring — the same
  passthrough serves the admin console. The proxy is JSON-only: multipart uploads cannot go through it.
- Never read or store the JWT in client JS. `publicUser()` decides what leaves the server: `id, username, email,
  address, role, emailVerified` — `role` is how the UI gates `/admin`.
- Cart: guest → `localStorage.gear_guest_cart`; on login each line is pushed to `POST /api/cart/items` (failures
  ignored), storage cleared, server cart refetched. Login/register honour `?next=` through `safeNext()`, internal paths only.
- ML blocks (`featured`, `for-you`, `similar`, smart search) are enhancements: `catch(() => [])`/`catch(() => null)` and
  render nothing when empty. Skeletons while loading, never a spinner over a whole page.
- Every product image goes through `resolveImage()` (rejects non-http values) and falls back to `CategoryArt` line art.

**Rules for new UI**
- Token classes only (4). Extract a component when the same class string repeats 3+ times.
- Mobile-first prefixes: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. The nav bar switches at **`xl`**, not `lg`:
  desktop mega-menu at `xl`, hamburger `xl:hidden`.
- `next/image` with real `sizes`; `priority` only on hero slide 0. `next/link` for all internal navigation.
- Vietnamese slugs are the public contract (`/danh-muc`, `/san-pham`, `/gio-hang`, `/dang-nhap`, `/don-hang`,
  `/thanh-toan`, `/giao-hang`, `/doi-tra-bao-hanh`, `/lien-he`). Legacy `?slug=` URLs `redirect()` to `/danh-muc/[slug]`.
- New route: `loading.tsx` skeleton + `error.tsx` + `not-found.tsx` where a record can be missing; Vietnamese
  `metadata` per page (`title` template `"%s — Gear Shop"`).

### 5.1 Homepage (`app/page.tsx`)

Block order as shipped. The homepage is wrapped in `Suspense`; while it resolves the fallback is a `h-80` skeleton plus
a product-grid skeleton.

1. **Hero** — full-bleed `bg-ink`, height `h-[calc(100svh-19rem)] min-h-[26rem] max-h-[46rem]`, crossfade between the
   first **3** featured products (6.5s, `brightness-[.78]` photo, one radial dark wash + a top scrim so the transparent
   header stays readable). Overlay is centred: product name as `text-display`, one per-category support line, one
   `bg-bg` CTA "Xem chi tiết". Arrows `size-11 rounded-full` appear on hover/focus; numbered dots and a pause button sit
   bottom-right. **Fallback `StaticHero`** (white, `text-display`, one CTA) when the API returns nothing.
2. **Category carousel** — `SectionHeader` "Danh mục gear" + scroll-snap row of `aspect-[4/3] rounded-card bg-subtle`
   tiles (`w-36 sm:w-44 lg:w-52`) with `CategoryArt` and the name; prev/next live in `SectionHeader actions` and hide
   when the row already fits.
3. **Featured grid** — `bg-subtle py-12 lg:py-16`, `SectionHeader` "Gear nổi bật" + `Xem tất cả sản phẩm`, products 4→11
   in `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.
4. **Smart-search band** — dark (`bg-ink text-bg`), `md:grid-cols-2`: left an image slideshow (fade 3s, dots), right the
   query input + "Tìm sản phẩm" + four hardcoded example queries as tappable chips. Submits to `/san-pham?q=…&smart=1`.
5. **Trust row** — 4 columns, bare 28px line icon + `text-h3` title + one `text-sm text-muted` line. Only real, shippable
   commitments; no numbers, no badges.
6. **"Gợi ý cho bạn"** — `ForYouSection`, up to 8 products, deduplicated against the two blocks above, ML result with a
   `rating_desc` fallback.

There is **no** showroom block, testimonial block, brand-logo strip or newsletter form. Do not add one unprompted.
No block renders from invented data: if `featured` is empty the grid block disappears entirely.

### 5.2 Catalog (`/danh-muc/[slug]`, `/san-pham`)

```
[ CategoryBanner — full-bleed dark, image or line-art background, scrim ]
  h1 + two short description columns + one highlight strip + one "featured product" row  (no CTA button)
[ Container · grid gap-8 py-10 · lg:grid-cols-[260px_1fr] · xl:grid-cols-[260px_1fr_19rem] ]
  col 1  CategoryFilters (aside aria-label="Bộ lọc")
  col 2  header row  "N sản phẩm"  |  <select> Sắp xếp        (h-11, border-b)
         [smart only] one tinted line "Hiểu là: …"            (rounded-btn bg-accent-soft)
         ProductGrid  grid-cols-2 md:grid-cols-2 2xl:grid-cols-3
         pagination (size-10 squares, "…" gaps, current = bg-accent)
  col 3  xl only — "Sản phẩm nổi bật" rail (19rem)
```

- Filters are **URL state**: every option is a `Link`/`router.push` on `basePath`, `page` is dropped on change. There is
  no "Apply" button; the only bulk control is "Đặt lại tất cả" (shown when a filter is active).
- Control vocabulary: `<details>` accordion per group (`border-b border-line py-3.5`, chevron `group-open:rotate-180`),
  option rows as links with the selected row `bg-accent-soft font-semibold text-accent` + check, feature flags as real
  checkboxes, "Còn hàng" as a `role="switch"` pill. Never a native `<datalist>` or a range slider — price buckets are
  preset links.
- Filter groups are **per category slug**: `chuot` (kết nối, form dáng, trọng lượng, polling rate, switch), `ban-phim`
  (layout, tính năng, kết nối), `tai-nghe` (kiểu dáng, kết nối audio, tính năng), `soundcard`, `lot-chuot` (6 groups),
  setup group (loại sản phẩm, tải trọng). Shared: giá, nhãn hiệu (from the API), còn hàng.
- The desktop sidebar scrolls independently (`xl:max-h-[calc(100svh-9rem)] xl:overflow-y-auto`); on mobile it stacks
  above the results. The active filter set is remembered per page in `localStorage` (`gear_filters{basePath}`).
- Product cards are wider here than on the homepage because the third rail eats the row: 2 columns until `2xl`, then 3.
- Smart search only runs on `/san-pham` or when a plain text search returns nothing; a category page never calls ML.

### 5.3 Product detail (`/san-pham/[id]`)

`Container py-8` → `grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_19rem]`:

1. Photo `aspect-[4/3] rounded-card`, `CategoryArt` fallback.
2. Info column: brand → H1 → rating → price `text-3xl font-bold tabular-nums` → stock badge (`bg-danger/10 text-danger`
   when low/zero) → colour dot → `AddToCart` (quantity input `h-12 w-24`, clamp 1–99) → "Chính sách & quyền lợi" box
   (`rounded-card bg-subtle`, three links to the policy pages) → spec table rendered from `product.detail` with
   Vietnamese labels.
3. `xl` rail: "Sản phẩm tương tự" — compact rows (56px thumb, name, price), 6 items, omitted when empty.

There are no tabs and no review list on this page today; `GET /api/products/:id/reviews` exists but is not rendered.

### 5.4 Cart, checkout, orders, auth

- **Cart page** — `bg-subtle py-10` hero with breadcrumb "Trang chủ / Giỏ hàng", body `lg:grid-cols-[1fr_360px]`;
  right column `h-fit rounded-card border p-6` summary (Tạm tính, Tổng cộng) + two `ButtonLink` + a note that the guest
  cart lives in this browser.
- **Cart drawer** — opens from the header cart icon; `fixed inset-y-0 right-0 w-full max-w-[460px]`, slides with
  `translate-x-full → 0`, overlay `bg-ink/40`, focus-trapped, Esc closes, footer row + `grid-cols-2` "Xem giỏ hàng" /
  "Thanh toán". Compact line rows (`flex gap-3`, 80px thumb) shared with the page via `cart-line-row`.
- **Checkout** — same hero+breadcrumb pattern, `lg:grid-cols-[1fr_360px]`, three explicit states: empty cart →
  `EmptyState`; not signed in → a "Đăng nhập để đặt hàng" card linking `/dang-nhap?next=/thanh-toan`; signed in → one
  bordered form (`space-y-5 rounded-card border p-6`) with a shipping `<select>` from the API, address, phone and
  "Đặt hàng". Right rail lists every line `name × qty`, subtotal, shipping fee, total.
- **Orders** — `lg:grid-cols-[240px_1fr]`; left is a small account sidebar (initials avatar, Đơn hàng / Giỏ hàng /
  Đăng xuất). Each order is a `article.rounded-card border p-5` — header "Đơn #id" + status badge + date, item thumbs,
  address, fee, total, and "Huỷ đơn" **only while `status === "pending"`**.
- **Login/register** — one card `mx-auto max-w-4xl rounded-card border lg:grid-cols-2`; left half is a dark
  `bg-ink text-bg` aside (benefits + demo credentials), right half the form; mode switches through two text buttons.
  No forgot-password/reset UI exists yet even though the endpoints do.

### 5.5 Admin console (shipped)

`/admin` (Tổng quan) · `/admin/don-hang` · `/admin/san-pham` · `/admin/khach-hang` · `/admin/nhan-xet` ·
`/admin/danh-muc` · `/admin/thuong-hieu` · `/admin/van-chuyen` · `/admin/ml`. Primitives live in
`components/admin/ui.tsx`, the frame in `components/admin/shell.tsx`; each route is a server `page.tsx` that only sets
`metadata` + `export const instant = false` and renders one `*-client.tsx`.

Same tokens, same `Container`, no new colors — and no storefront chrome. The root `app/layout.tsx` keeps only
html/body/font/skip-link/`StoreProvider`; the shop header and footer moved into `app/(shop)/layout.tsx`, and `/admin`
sits outside that group, so it gets its own frame:

- Shell: a one-line `h-14 border-b border-line` header — logo + "Quản trị" pill, the current section as
  `text-sm text-muted`, "Về cửa hàng", avatar initials + username, Đăng xuất — then `grid gap-8 py-8
  lg:grid-cols-[240px_1fr]`: a bare 9-link aside (no card, no avatar block) and `<main id="main">`. No hero band, no
  breadcrumb, no `text-3xl` page title, because the header already names the section. Active nav item is
  `bg-accent-soft text-accent` + `aria-current`, not an inverted dark rail — the console must not look like a separate product.
- Blocking `/admin` happens in **`frontend/proxy.ts`** (matcher `/admin`, `/admin/:path*`), before routing: it reads the
  `gear_token` cookie, decodes the JWT payload for `role`, and unless that is `admin` rewrites to an unmatched path, so
  the visitor gets the ordinary root 404 — real **HTTP 404**, storefront `<title>`, no admin markup at all. This has to
  happen pre-render because metadata is resolved from the route tree before any component can refuse: a page-level
  guard would still emit `<title>Đơn hàng · Quản trị</title>` and the admin nav, which advertises that the area exists.
  `components/admin/gate.tsx` stays as the second wall (verified `auth/me`, not an unverified cookie claim); it returns
  the 404 element rather than throwing `notFound()`, because a throw during prerender is baked into the static shell and
  would then hide the real console. Under `cacheComponents` `cookies()` must sit in a `<Suspense>` hole — that is why
  every admin route is `◐` — and `dynamic = "force-dynamic"` is rejected outright.
- The storefront header offers a "Quản trị" link (desktop cluster and mobile drawer) only when the signed-in role is
  `admin`, so the console is unreachable by URL guessing from the shop side.
- "Kiểm kho" has no route: the low-stock table is a dashboard card. Account create offers no "đã xác thực" tick
  (login does not check `emailVerified`, and `ít nút hơn` wins).
- Lists are tables (the customer pages stay card-based). Row separation by `border-b border-line`; numbers
  right-aligned `tabular-nums`; one filter bar (search + status + date range) above each table; `pagination` from the API.
- Stat cards: `rounded-card border p-6`, one `text-h2 tabular-nums` value + one label. No sparkline without a unit.
- Every mutation posts through `/api/proxy/admin/...`, then re-reads or merges the response — and knows that
  `PATCH /api/admin/orders/:id/status` returns the order **without** `user` (refetch or preserve the existing cell).
- Order status controls come from the backend state machine, not from a free `<select>`:
  `pending → confirmed | cancelled`, `confirmed → shipping | cancelled`, `shipping → delivered`, terminal otherwise.
  Disable what is not allowed; surface the 400 `data.allowedStatuses` when a stale tab loses the race.
- Never offer lock/role changes on the signed-in admin's own row (the API rejects them), and never offer a slug change
  on a category (rejected). Deletion always confirms and always shows the backend's refusal message.
- Order rows lead with `code` (`DH-0001`) — it is the human key the shop and the customer quote to each other;
  the numeric `id` stays in the detail view only. The one order search box hits `?search=`, which already covers
  code, customer username, email and receiver phone.
- Product table: the list is `GET /api/products` with the admin cookie, which already returns active **and**
  inactive rows; the visibility column is a switch that posts `PUT /api/products/:id { isActive }`, and the
  "chỉ hàng đang bán" filter is `?isActive=true`. Inactive products 404 for customers but stay editable here.
- Customers: create (username/email/password + optional role & verified flag — no verification mail is sent, so
  the form should offer the verified tick), reset password (no current password), delete. The delete button must
  expect 400 `{ orderCount }` and show the "còn N đơn hàng, hãy khoá thay thế" message instead of a generic error.
- Reviews (`GET /api/admin/reviews`) is one global moderation table: content, author, product (thumbnail + name +
  its `isActive`), score, date. Deleting still goes through `DELETE /api/products/:productId/reviews/:reviewId`.
  There is no server-side score filter — filter by product/search, or sort client-side within the page.
- ML page: `GET /api/recommendations/ml-status` for health, and one "Tải lại model" action posting
  `/api/admin/ml/reload`; a 503 means ML is down or the two backends disagree on `ML_INTERNAL_TOKEN` —
  render `message` verbatim, it names the cause.
- Forms reuse the storefront input spec (`h-11 w-full rounded-btn border border-line px-3 text-sm`) and are real
  `<form onSubmit>` with `type="submit"`, so HTML5 `required` / `minLength` / `pattern` stop the submit before any
  request (the login page's rules: username `[A-Za-z0-9_]+`, password ≥ 6). Omitted optional fields must be sent as
  absent, not as `""` or `null` — the API rejects empty strings on numbers.
- Error surface: one toast (`bg-ink … shadow-float`, bottom, auto-dismiss), no `alert()`. `errorMessage()` in
  `components/admin/ui.tsx` prefers the joined `[{field,message}]` array over the envelope `message`, otherwise every
  400 reads as the useless "Dữ liệu không hợp lệ!". The modal stays open so the value can be corrected.

---

## 6. Components

### Buttons (`ui.tsx`)
- Variants `primary` (`bg-accent text-accent-text hover:bg-accent/90`), `ghost` (`border border-line bg-bg`),
  `dark` (`bg-ink text-bg`). Sizes `sm h-9 px-4 text-sm` · `md h-11 px-6 text-[15px]` · `lg h-12 px-8 text-base`.
  Rounded `rounded-btn`, colour-only hover, `disabled:opacity-50`.
- Max **one primary** per view region. Label states the exact action ("Thêm vào giỏ", "Đặt hàng", "Huỷ đơn"), never "Gửi".
- `ButtonLink` mirrors `Button` for navigation — a link that looks like a button must still be a link.

### Container / SectionHeader / EmptyState / Skeleton
- `Container` — the only max-width wrapper (`max-w-shell px-5 lg:px-10`).
- `SectionHeader` — `h2.text-h2.font-semibold` left; right slot holds `actions` (e.g. carousel arrows) then an optional
  `Xem tất cả` accent link. `mb-6`. No subtitle.
- `EmptyState` — `rounded-card bg-subtle px-6 py-16 text-center`, one icon, `h2`, one line, one CTA. Says what belongs
  here and how to fill it.
- `Skeleton` / `ProductGridSkeleton` — `animate-pulse rounded-card bg-subtle`, matching the real aspect ratios so
  nothing shifts.

### ProductCard
- `rounded-card border border-line bg-bg`, image `aspect-[3/2]` on `bg-subtle`, `object-cover`; hover only changes the
  border to `border-accent/40` and the title to accent. No zoom, no lift.
- Whole card is one link (`after:absolute after:inset-0`); `QuickAdd` floats at `right-3 top-3 z-10` **outside** the
  link so both work. Content: eyebrow (category or brand) · name · price `tabular-nums` + rating · colour dot + stock
  label. Out of stock is labelled `Tạm hết` in `text-danger`, never hidden.
- Grid columns are decided by the caller (`md:grid-cols-3 lg:grid-cols-4` on the homepage, `2xl:grid-cols-3` in catalog).

### Rating / ColorDot / CategoryArt
- `Rating` renders **only** when `ratingCount > 0`; otherwise the element is absent, not zeroed. It carries an
  `aria-label` with the numeric value.
- `ColorDot` maps the stored colour string to a swatch + the original label; a gradient swatch covers two-tone names.
- `CategoryArt` is 24px-stroke line art keyed by category slug, used as image fallback and as the carousel motif. It is
  always `aria-hidden`.

### Navigation / header
- `fixed` at `z-40`, 36px dark announcement rotator (3 messages, 4s, prev/next + pause, controls fade in on hover) above
  a 72px main bar: wordmark · `xl` mega-menu · search (`hidden md:flex`, grows `max-w-xs → 2xl:max-w-xl`) · account ·
  cart with count badge · hamburger `xl:hidden`.
- Over the homepage hero the header is **transparent with white text** while the page is at the top and not hovered;
  otherwise `bg-bg/95 backdrop-blur-md shadow-sm`. Scrolling down past 40px accumulates hides it; scrolling up shows it.
  Non-home pages reserve a 108px spacer so nothing jumps.
- Active nav item is `text-accent underline underline-offset-8`. **Never** change `font-weight` on hover/active — the
  row would shift by a few pixels.
- Mega-menu panel: `w-[78rem] max-w-[calc(100vw-3rem)] rounded-card border bg-bg p-8 shadow-float`, three zones (group
  name + "Xem tất cả", 4-column subcategory links, one large + two small featured tiles). Opens on hover **and**
  `group-focus-within`, so it is keyboard reachable.
- Mobile drawer: `w-72` from the left, `bg-ink/40` overlay, accordion groups (both open by default), Esc closes, closes
  on route change, `INFO_LINKS` under a divider.

### Footer
- `bg-footer text-footer-text`. Desktop `md:grid-cols-2 lg:grid-cols-4` (brand / contact+hours / mua sắm / tài khoản);
  mobile renders the same columns as native `<details>` accordions. Legal strip: `© 2026 Gear Shop`.

### Tables and data (admin)
- Right-aligned numbers with `tabular-nums`; rows separated by `border-b border-line`, no zebra, no shadow.
- Filters and total count visible above the table; each column header names the unit (`Doanh thu (₫)`, `Tồn kho`).
- Show the 3-5 numbers that matter, clearly labelled. No decorative charts.

### Modals, menus, toasts
- Drawer and mega-menu are the only overlays. All close with Esc and by clicking the overlay; focus is trapped in the
  cart drawer and returned on close.
- Toast: one line, `bg-ink text-bg rounded-btn shadow-float`, bottom-centre, auto-dismiss 2600ms, no action button.

### Icons
- Inline 24-viewBox SVGs with `stroke="currentColor"`, `strokeWidth` 1.6–2, `aria-hidden="true"`. Icon-only buttons are
  `size-10`/`size-11` with `rounded-btn` and an `aria-label`. No icon library, no decorative icon next to a heading.

### Images
- `next/image` everywhere, `resolveImage()` first, `CategoryArt` fallback, explicit `sizes`, `priority` only on hero
  slide 0. `remotePatterns: [{ protocol: "https", hostname: "**" }]` — keep it that way only while product images are
  external; narrow it once uploads are self-hosted, and say so in the report.

---

## 7. Copywriting

Words are design material. Each text element does exactly one job.

- Write from the shopper's perspective, in plain Vietnamese. Say what it is or does; do not sell it.
- Headlines are concrete ("Gear gọn, chuẩn gu cho góc máy chơi game.", "Chuột nhẹ, phản hồi nhanh cho mọi trận đấu.").
  No slogans that could describe any company.
- Active voice, sentence case, no filler adjectives, no exclamation marks.
- Do not repeat the headline in the paragraph below it.
- Empty states: say what belongs here and give the action that fills it ("Chưa có đơn hàng nào." + "Xem sản phẩm").
- Error messages: what happened and how to fix it, no apology, no blame. Reuse the backend's Vietnamese message — it is
  already written for the user and arrives in `message`.
- One vocabulary: `giỏ hàng`, `đơn hàng`, `thanh toán`, `sẵn hàng / tạm hết`, `đánh giá` for ratings, `nhận xét` for
  reviews. Do not alternate synonyms.
- Status labels are fixed: `Chờ xác nhận · Đã xác nhận · Đang giao · Đã giao · Đã huỷ` (`lib/format.ts`).
- Money is `money()` → `1.250.000đ` (no space before `đ`). Never format currency inline in a component.
- Do not write copy to pad space. If a section feels empty, fix layout/spacing or remove the section.

---

## 8. Motion

- Default: almost none. Motion explains a change or directs attention to one thing.
- Shipped timings: colour/border transitions 150–200ms; hero crossfade 500ms at 6.5s intervals; announcement rotate
  4s; mega-menu fade+slide 200ms with `delay-75`; header show/hide 300ms; drawer slide via `transform`; hover zoom
  `scale-105` 300ms **only** on mega-menu tiles.
- Animate only `transform` and `opacity`.
- Every auto-advance is pausable by the user and stops on hover/focus; carousels additionally check
  `prefers-reduced-motion`, and `globals.css` clamps all durations under it.
- Never animate text readability away and never animate the header in a way that moves content (the spacer prevents it).

---

## 9. Responsive, Accessibility, Performance

**Responsive**
- Breakpoints in use: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Verify 360, 390, 768, 1024, 1280, 1440, 1760px.
- No horizontal scroll at any width. Touch targets ≥ 40px (`size-10`/`size-11`, hero dots `size-10`).
- One line of note: the desktop nav appears at `xl`, so on a 1024–1279px laptop the hamburger is the only nav.
- Category banner height is viewport-based (`100svh - 19rem`, clamped 26rem–46rem): re-check it at 667px and 1024px tall.
- The 108px header spacer must be kept in sync with any change to `h-9` / `h-[4.5rem]`.

**Accessibility**
- `lang="vi"`, one `h1` per page, `header/nav/main#main/footer`, `button` for actions, `a` for navigation.
- Skip link "Tới nội dung chính" is the first focusable element (`sr-only` until focused).
- `:focus-visible` is a global 2px accent outline with 2px offset; never remove it without a replacement.
- Landmarks are labelled (`aria-label="Bộ lọc"`, `"Danh mục sản phẩm"`, `"Menu di động"`, `"Chọn slide"`); carousels use
  `role="tablist"`/`aria-selected`, the stock switch `role="switch"`, pause buttons `aria-pressed`.
- Colour is never the only signal: selected filters add a check + semibold, stock adds a word, errors add text.
- Hidden carousel slides are `aria-hidden`, not removed, so focus order stays predictable. Full keyboard operation, Esc
  closes overlays.

**Performance**
- Server components + `revalidate` for catalog reads; `cache: "no-store"` on every authed call.
- Heavy blocks (`HeroSlideshow`, grids, filters) are code-implicit client islands; keep client JS out of pages that do
  not need it and watch First Load JS in `next build`.
- No layout shift: fixed aspect ratios (`3/2`, `4/3`, `16/10`), skeletons that match them, spacer for the fixed header.
- No Tailwind CDN; `globals.css` holds tokens and base styles only.

---

## 10. Workflow the Agent Must Follow

### Step 1: Understand
Restate the brief in 3-4 lines (product, audience, primary job, references). Ask at most **one** question if something
critical is missing; otherwise state assumptions.

### Step 2: Plan (before any code)
Write a compact plan:
- **Tokens:** confirm nothing new is needed; if a new surface requires a value, add it to `globals.css`, not the component.
- **Layout:** one-sentence concept + ASCII wireframe, with the `grid-cols-[…]` template and breakpoint at which it changes.
- **Server/client split:** which file gets `"use client"` and why.
- **Data:** which `lib/api.ts` method feeds each block, and what renders when it returns empty.
- **Content list:** exact Vietnamese strings, all of them real. Mark anything missing.

### Step 3: Self-review the plan
Check against sections 3 and 6, and against the 3.9 register — do not repeat a deviation while "following the existing file".

### Step 4: Build
- Define/extend tokens first, then primitives in `ui.tsx`, then the section.
- Keep specificity flat: Tailwind single classes, no element selectors that cancel margin/padding.
- Reuse components; do not duplicate near-identical markup with slightly different values.

### Step 5: Critique and subtract
1. Remove one decorative thing ("take off one accessory").
2. Delete any text that does not help the user understand or act.
3. Run the checklist in section 11.
4. With a browser tool, check desktop (1440/1760) and mobile (390) and fix what looks generic or crowded, including the
   transparent-header-over-hero case at the top of the page.

### Step 6: Report
Reply briefly: what was built, which tokens were used or added, which content is hardcoded and needs confirmation, and
what you intentionally left out.

---

## 11. Final Checklist (must all be true)

**Anti-AI**
- [ ] No unnecessary cards, badges, pills, icon boxes, glow, mesh or decorative gradients (scrims for legibility only).
- [ ] No fake stats, testimonials, logos or features. No lorem ipsum. No emoji.
- [ ] No sections the user did not ask for; no new auto-rotating band.
- [ ] No single-word colour accent in headlines; ALL-CAPS only in the three approved slots (3.3).
- [ ] One clear focal point per screen; no glass panel outside the register in 3.9.
- [ ] No caption under a section heading; no meta text about how the page was made.
- [ ] Each fact appears once; no duplicate bullets.
- [ ] No overclaims, unexplained metrics or inflated titles; every service promise is one the owner confirmed.
- [ ] No visible placeholder, upload widget or TODO; no dead link; no hot-linked image added silently.
- [ ] No private data published without explicit OK.

**Design system**
- [ ] Only token classes (`bg-bg`, `text-muted`, `border-line`, `rounded-card|btn`, `shadow-float`); no stray hex, no
      stray `rounded-xl`, no default palette name, no second shadow.
- [ ] `bg-ink` is the only dark surface in content, `bg-footer` the footer; secondary text on dark uses `/opacity` of the light colour.
- [ ] One accent, one font family, ≤4 sizes per section; spacing from the 8px scale.
- [ ] `Container` (1760px) or `max-w-4xl` for reading pages — no ad-hoc `max-w-[…]`.

**Content**
- [ ] Vietnamese diacritics correct; money through `money()`; dates `Intl` `vi-VN`; status labels from `ORDER_STATUS_LABELS`.
- [ ] Button labels name the exact action.
- [ ] Every block renders from the API or is omitted.

**Quality**
- [ ] 360 → 1760px, no horizontal scroll; touch targets ≥40px; no CLS (aspect ratios + skeletons + header spacer).
- [ ] Keyboard reachable, visible focus, mega-menu opens on focus-within, Esc closes overlays, alt/`aria-hidden` correct.
- [ ] `prefers-reduced-motion` respected; motion limited to section 8.
- [ ] `next build` passes, no hydration warning, no TS error; nav active state never changes font-weight.

**Stack**
- [ ] Server components by default; `"use client"` only on interactive leaves.
- [ ] All data through `lib/api.ts`; authed calls via `/api/proxy`; no JWT in client storage; page complete when ML is down.
- [ ] `next/image` + `next/link`; Vietnamese slugs preserved; `metadata` per page; `loading`/`error`/`not-found` per route.

**Admin console (when building 5.5)**
- [ ] Route gated on `role === "admin"`; 401 → login, 403 → plain "không có quyền" state.
- [ ] Status controls follow the backend state machine; 400 `allowedStatuses` handled.
- [ ] Self-lock/self-role rows disabled; delete actions confirmed; backend refusal text shown verbatim.
- [ ] Form payloads omit untouched optional fields (never `""`/`null`); `[{field,message}]` rendered inline.
- [ ] Order-status mutation refetches or preserves `user`, since the PATCH response omits it.

---

## 12. Quick Prompts (copy/paste to the agent)

**Start a new page**
```
Read docs/UI-UX-SKILLS.md. Build [page] for Gear Shop in the existing Next.js 16 App Router + Tailwind v4 frontend,
following sections 4, 5.0 and 6. Reuse ui.tsx primitives; add no new token.
First write the plan (wireframe with the grid template, server/client split, API method per block, exact Vietnamese
strings), review it against section 3, then build one block at a time.
```

**Add a catalog/filter control**
```
Read docs/UI-UX-SKILLS.md §5.2. Add [filter] to components/category-filters.tsx using the existing accordion + link
options, URL-state routing (drop `page`), and the per-slug group map. Verify the option value matches what
GET /api/products accepts, then check the page at 390px and 1440px.
```

**Build the admin console**
```
Read docs/UI-UX-SKILLS.md §3.8, §5.5 and §11-Admin. Build the /admin segment against these endpoints:
GET /api/admin/orders · PATCH /api/admin/orders/:id/status|payment · GET /api/admin/users
PATCH /api/admin/users/:id/lock|role · GET /api/admin/stats/{overview,revenue,top-products,low-stock}
all through authRequest() on /api/proxy. Show the backend's Vietnamese message on every failure.
Plan the shell + one screen first and wait for my OK before building the rest.
```

**Fix an AI-looking UI**
```
Read docs/UI-UX-SKILLS.md. Audit the current UI against §3 and §11. List every violation, then fix them.
Remove cards, badges, icon boxes, filler text and invented stats. Keep only content I provided. Do not add sections.
Also close any row in §3.9 that you touch, and update that table when you do.
```

**Clone the feeling of a reference**
```
Read docs/UI-UX-SKILLS.md. Match the layout rhythm, density and type hierarchy of [reference URL/image], using my tokens
only. Do not add any element that is not visible in the reference, and do not import its colors as raw hex.
```

**Final pass**
```
Remove 30% of the elements on this page. Keep only what helps the user understand or act. Increase whitespace instead of
adding components. Then run the §11 checklist and report what you removed and why.
```

---

## 13. Reference Style Notes (what "good" looks like)

- **phongcachxanh.vn** — the pattern this storefront follows: tall dark media band under a transparent header; sticky
  header that hides on scroll-down; mega-menu with 4 link columns plus image tiles; scroll-snap category row; alternating
  white / `bg-subtle` product grids; a dark "describe what you need" band; four plain trust columns; dark footer. Blue
  accent `#2457E6`, sale red, amber stars, 12px card radius, 8px buttons. Copy is friendly and concrete, never generic.
- **apple.com** — hero restraint: one headline, one support line, one action, the photo doing the work. Applied to
  `StaticHero` and to the hero overlay text.
- What is *not* from either reference and must stay out: purple-blue gradient washes, glassmorphism as a default
  surface, icon-in-circle feature rows, testimonial carousels, badge spam.

Common thread: **one focal point per screen, real product photography, dense but tokenised commerce chrome, almost no decoration.**
