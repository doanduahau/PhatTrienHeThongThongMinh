# UI-UX-SKILLS.md

> **Cách dùng (tiếng Việt):** Đặt file này ở thư mục gốc dự án, rồi bảo agent: *"Read UI-UX-SKILLS.md before building or changing any UI. Follow it strictly."*
> Với Cline/Cursor/Claude Code, có thể copy vào `.clinerules`, `.cursorrules` hoặc `CLAUDE.md`.
> Nội dung viết bằng tiếng Anh vì agent tuân thủ tốt hơn. Bạn vẫn có thể ra lệnh cho agent bằng tiếng Việt.
> Khi muốn đổi phong cách, chỉ cần sửa mục **1. Design Brief** và **4. Tokens**.

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
Product:            <what it is, one sentence>
Audience:           <who uses it>
Primary job:        <the one thing a visitor/user must be able to do>
Reference sites:    <e.g. apple.com, phongcachxanh.vn, mimo.xiaomi.com/coder>
Direction:          Editorial minimalism. Product-first. Whitespace-driven.
Tone of voice:      <plain, direct, friendly | technical | premium ...>
Language of UI:     <Vietnamese | English>
Real content:       <paste real headlines, product names, prices, image paths>
```

If this block is empty, propose values from the user's request, show them in one short list, and continue unless the user corrects you.

---

## 2. Core Philosophy

1. **Subtract first.** Every element must earn its place. If removing it does not hurt comprehension or action, remove it.
2. **One idea per screen/section.** One headline, at most one supporting line, one or two actions.
3. **The subject is the hero.** The product, photo, data or content is the star. UI chrome stays quiet.
4. **Hierarchy through type and space**, not through boxes, borders, colors or icons.
5. **One memorable thing per page.** Spend boldness in one place (a huge headline, one striking image, one interaction). Keep everything around it calm.
6. **Decisions, not defaults.** Every choice (font, color, radius, layout) should be explainable by the brief. If you would make the same choice for any product, it is a default; reconsider it.

---

## 3. Anti-"AI Look" Rules (hard bans)

These are the tells of generated UI. Do **not** use them unless the user explicitly asks.

### Structure and decoration
- No wrapping every group of content in **cards** (rounded box + shadow + border). Use cards only when items are truly independent objects the user compares or selects (e.g. product listings, pricing plans).
- No identical card grids (3 equal columns, each with icon + title + two lines of text).
- No **icons inside rounded squares/circles** next to features.
- No **badges / pills / eyebrow labels** above headings ("New", "Powered by AI", "Introducing...").
- No gradients as decoration (especially purple-blue), no glassmorphism, no glow, no blurred color blobs, no mesh backgrounds.
- No heavy or identical soft grey shadows on everything. Prefer no shadow; if needed, one subtle elevation level for floating layers only (menus, modals).
- No same border-radius on everything. Radius follows hierarchy (see tokens).
- No decorative dividers, hairline rules or numbered markers (01 / 02 / 03) unless the content is truly a sequence.
- No emoji in UI. No emoji as icons.

### Content
- **No invented content.** No fake stats ("10K+ users", "99.9% uptime"), fake testimonials, fake logos, fake features, fake pricing, lorem ipsum.
- No filler paragraphs. Do not add a description under every title "to fill the space".
- No marketing fluff: "seamless", "cutting-edge", "revolutionary", "unlock the power of", "elevate your", "next-generation", "all-in-one solution".
- No sections the user did not ask for (no unrequested "Why choose us", "Testimonials", "FAQ", "Newsletter", "Stats" bands).
- Use real data from the user. If real data is missing, use an obvious neutral placeholder (`[Product name]`) and tell the user.

### Typography tells
- No accenting a single word in a headline with a different color/italic/gradient.
- No tracked-out ALL-CAPS labels above every heading.
- No meta strings joined by middle dots ("A · B · C") or labels like "WORD — fragment".
- No monospace font for small labels just to look "techy".
- No trailing "→" on every link or button.
- Do not use tinted pure black (#0B0B0B / #111) as a "premium" default; choose the neutral intentionally.

### Layout tells
- Do not make everything symmetrical, equally spaced and equally weighted. Create contrast: one large, many quiet.
- Do not center-align long text.
- Do not use three-column feature rows as the default way to present benefits.

### Motion tells
- No fade-and-slide-up on every section, no hover lift on every card, no scattered micro-animations.
- No parallax, floating blobs, or looping decorative animation.

### Copy and content hygiene (added after real-world review)
- **No caption under section headings.** A heading stands alone. Do not add a grey sub-line "to explain the section" (e.g. under "Skills": "The languages and tools used in projects"). Add a supporting line only when it carries new information.
- **No meta text about how the page was made.** Never write "extracted from the CV", "generated", "sample", "template", or similar on the page.
- **Say each fact once.** Every piece of information (bio, a statistic, email, phone) has exactly one primary place. Do not repeat the same paragraph in the hero and in an About section. Do not repeat the same number in the hero, a spec table and a bullet. Contact details appear in the contact section and, at most, once in the footer.
- **No overclaiming.** Avoid absolute or unmeasured claims: "completely eliminates", "hoàn toàn", "the best", "lowest possible", "perfect", "100% secure", unless a number or source backs it. Describe the mechanism instead ("answers only from the loaded tour data").
- **No contradictory or unexplained metrics.** If two numbers could confuse (e.g. "84% accuracy" next to "0.33% error"), state the metric used (RMSE, MAE, F1...) or keep one number.
- **Do not inflate titles or roles.** Use the user's real status (student, intern candidate, junior). Do not write "Engineer", "Lead", "Architect" unless the user said so. Keep the level of contribution consistent ("contributed to" vs "was responsible for"); do not mix them for the same task.
- **No duplicate bullets.** Before finishing, merge bullets that describe the same work in different words.
- **No visible placeholders or builder widgets in the final page.** No "[Photo here]", no "upload your image" button, no "TODO". Use a real file path or remove the element and tell the user what is missing.
- **No UI that stores data in the visitor's browser pretending to update the site.** A file picker that only changes the viewer's own screen is not a feature.

### Privacy on public pages
- Do not publish date of birth, home address, national ID, student ID, or private social accounts unless the user explicitly asks.
- Phone number: include only if the user wants it public; default to email + GitHub/LinkedIn.
- Location: city or region level only.
- If the user's source text (CV, notes) contains such data, flag it in the final report and ask before publishing it.

### Portfolio / personal / product-showcase pages
- **The work is the hero.** Every project, product or case study needs real visual proof: a large full-width screenshot, photo or demo, not only text and a spec table.
- **Every project links to its source or live demo** (GitHub repo, demo URL, store page). If no link exists, say so in the report instead of leaving a dead block.
- Break the repeated layout. Do not use the identical two-column (4/8) pattern for every section; vary composition so each section has its own focus while sharing the same tokens.
- Hero title states who/what in truthful terms, one line of support, two actions. Move everything else into later sections.

---

## 4. Design Tokens (edit per project, then never deviate)

Define tokens **first**, put them in one place (CSS variables / Tailwind config / theme file), and reference only tokens in components. No hard-coded one-off values.

### 4.1 Color
Use at most **one accent color**. Everything else is neutral.

```css
:root {
  --bg:            #FFFFFF;   /* page background */
  --bg-subtle:     #F5F5F7;   /* alternate section background */
  --text:          #1D1D1F;   /* primary text */
  --text-muted:    #6E6E73;   /* secondary text */
  --border:        #D2D2D7;   /* only when a boundary is truly needed */
  --accent:        #0071E3;   /* the ONE accent: primary actions, links, focus */
  --accent-text:   #FFFFFF;   /* text on accent */
  --danger:        #D70015;   /* errors only */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg:          #000000;
    --bg-subtle:   #161617;
    --text:        #F5F5F7;
    --text-muted:  #A1A1A6;
    --border:      #424245;
  }
}
```

Rules:
- Palette size: 4-6 named values total. Name them by role, not by hue.
- Accent is used only for the primary action, links and focus states. Never for decoration.
- Text contrast: at least 4.5:1 for body, 3:1 for large text and UI components.
- Alternating section backgrounds (`--bg`, `--bg-subtle`) can replace borders and dividers.
- Warm cream + terracotta, or near-black + acid green, are common AI defaults. Use them only if the brief calls for them.

### 4.2 Typography
- **One font family**, optionally a second clearly distinct family for display headings (e.g. serif for headlines). Never more than two.
- Choose fonts deliberately for the brief. Safe defaults for Vietnamese support: `Inter`, `Be Vietnam Pro`, `Manrope`, `Plus Jakarta Sans`, system stack `-apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif`. Always confirm the font supports **Vietnamese diacritics** (latin-ext + vietnamese subsets).
- Load only the weights you use (usually 400, 500/600, 700).

Type scale (desktop / mobile, fluid with `clamp()` is preferred):

| Role | Desktop | Mobile | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| Display (hero) | 72-96px | 40-48px | 700 | 1.0-1.05 | -0.02em to -0.03em |
| H1 | 56-64px | 36-40px | 700 | 1.05-1.1 | -0.02em |
| H2 | 40-48px | 28-32px | 600-700 | 1.1-1.15 | -0.015em |
| H3 | 24-28px | 20-22px | 600 | 1.25 | -0.01em |
| Lead / subtitle | 20-24px | 18px | 400 | 1.4 | 0 |
| Body | 16-18px | 16px | 400 | 1.5-1.6 | 0 |
| Small / caption | 13-14px | 13px | 400 | 1.4 | 0 |

Rules:
- Body line length: 45-75 characters. Max width for text blocks: `60-68ch`.
- Sentence case everywhere (not Title Case, not ALL CAPS) except proper nouns.
- Serif body text gets slightly more line-height than sans.
- Headlines are allowed to be huge. Whitespace around them does the work.
- Do not use more than **4 distinct font sizes** within one section.
- Always apply `text-wrap: balance;` to all headings (`h1`-`h3`, display classes) and `text-wrap: pretty;` to body paragraphs to avoid orphan words and awkward breaks (e.g. a headline ending with one short word on its own line). Check the hero headline at 1440px, 1024px and 390px.

### 4.3 Spacing
Use an 8px base scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160, 200`.

- Section vertical padding: **96-160px desktop**, **64-96px mobile**.
- Space between headline and its supporting line: 12-16px.
- Space between supporting line and buttons: 24-32px.
- Content container: `max-width: 1200px` for layout, `max-width: 680px` for reading text, centered with side padding 24px (mobile) / 40px (desktop).
- When something feels cramped, increase spacing before adding any element.

### 4.4 Shape and elevation
- Radius scale: `0, 8px, 12px, 999px`. Buttons: pill (`999px`) or 8-12px, pick one and stay consistent. Images: 0 (full-bleed) or 12-16px. Inputs: 8-10px.
- Radius should reflect hierarchy: larger containers get larger radius than the elements inside them.
- Shadows: none by default. One subtle shadow token only for floating layers.
- Borders: 1px `--border` and only to separate form fields or table rows. Not to frame content.

---

## 5. Layout Rules

1. **Hero first.** The first viewport shows: one headline, one supporting line (optional), one or two buttons, and one dominant visual (product image/video/demo). Nothing else competes.
2. Sections alternate between: (a) large visual + short headline, (b) text-led statement, (c) a simple grid of real items (products/categories) with no extra chrome.
3. Prefer **full-bleed imagery** and large product shots over small images inside boxes.
4. Prefer **left-aligned** text for anything longer than two lines; **center** only for hero headlines and short statements.
5. Use asymmetry on purpose: one big item next to one small, text offset from image, uneven column widths. Equal-weight grids signal "template".
6. Grids of items (e.g. product categories): show **image + name (+ price if real)**. Nothing else by default.
7. Navigation: logo, 4-7 text links, search/cart/account icons if the product needs them. No mega decorative elements.
8. Footer: real links only, small text, one color, minimal columns.
9. Maintain consistent alignment lines: left edges of headings, text and buttons in a section share one vertical line.

ASCII wireframe of a typical section (for planning before coding):

```
[ section: bg-subtle, padding 128px 0 ]
         Headline, 56px, max 2 lines
         One supporting line, 20px, muted
              [ Primary ]  [ Secondary ]
   ┌─────────────────────────────────────────┐
   │       large product image, full width    │
   └─────────────────────────────────────────┘
```

---

## 6. Components

### Buttons
- Max **one primary** button per view region. Secondary is text/outline style.
- Height 44-52px (touch-friendly), horizontal padding 24-32px, font 15-17px, weight 500-600.
- Label states the exact action: "Add to cart", "Save changes", "Book a demo". Never "Submit", "Click here", "Learn more" repeated everywhere.
- Same action keeps the same name across the flow (button "Publish" -> toast "Published").
- States: default, hover, active, focus-visible, disabled, loading. Hover = subtle shift in background/opacity, not movement or glow.

### Links
- Underline on hover or always underlined inside body text. Accent color only if it must stand out.

### Forms
- Label above field, always visible (no placeholder-as-label).
- One column by default. Field height 44-48px.
- Inline validation with clear text: what is wrong and how to fix it.
- Mark optional fields, not required ones, when most fields are required.

### Navigation / header
- Sticky is fine; keep it low (56-64px), solid or very subtle blur-free background.
- Active page indicated by text color and a thin underline, not a colored pill. **Never change `font-weight` on hover/active** (it shifts neighbouring links by a few pixels). Keep weight constant, or reserve the bold width.

### Product / item listing
- Image (consistent aspect ratio), name, price. Optional single status text if real ("Out of stock").
- Whole item is clickable. No separate "View details" button on every item.

### Tables and data
- Right-align numbers, tabular figures (`font-variant-numeric: tabular-nums`).
- Row separation via spacing or a subtle line, not zebra + borders + shadow together.
- Dashboards: show the numbers that matter (3-5), clearly labeled, with units. No decorative charts.

### Modals, menus, toasts
- Use only for tasks that need interruption. Close with Esc and click outside. Focus is trapped in modals and returned on close.
- Toasts: one line, plain language, auto-dismiss unless it contains an action.

### Icons
- Use only when they speed recognition (cart, search, account, menu, close). One icon set, one stroke weight (1.5px or 2px), 20-24px.
- No icon as decoration next to headings or list items.

### Images
- Real product/subject images from the user. If missing, use a neutral solid placeholder with the correct aspect ratio and tell the user. Do not use random stock URLs, emoji or SVG blobs as stand-ins.
- Always set `width`/`height` or `aspect-ratio` (prevent layout shift), `alt` text, `loading="lazy"` below the fold, modern formats (webp/avif) when possible.

---

## 7. Copywriting

Words are design material. Each text element does exactly one job.

- Write from the user's perspective, in plain words. Say what it is or does; do not sell it.
- Headlines: short, concrete, a statement or a product name + one fact. ("Chuot choi game sieu nhe", "MacBook Pro. 14-inch model now with M6.") Avoid slogans that could describe any company.
- Active voice, sentence case, no filler adjectives, no exclamation marks by default.
- Do not repeat the headline in the paragraph below it.
- Empty states: say what belongs here and give the action to fill it.
- Error messages: say what happened and how to fix it. Do not apologize, do not blame the user.
- Keep one vocabulary across the product (do not alternate "Cart / Basket / Bag").
- Vietnamese UI: use natural, short phrases; keep diacritics correct; keep product names in original form; format numbers/currency the Vietnamese way (`1.250.000đ` or `1.250.000 ₫`) consistently.
- Do not write copy to pad space. If a section feels empty, fix layout/spacing or remove the section.

---

## 8. Motion

- Default: almost none. Motion exists to explain a change or draw attention to one thing.
- Allowed: state feedback (button press, toggle, accordion open/close, menu appear), one orchestrated hero reveal on page load, smooth scroll anchors.
- Durations 150-300ms for feedback; 400-700ms for one hero moment. Easing: `cubic-bezier(0.22, 1, 0.36, 1)` or `ease-out`.
- Animate only `transform` and `opacity`.
- Always honor `prefers-reduced-motion: reduce` (disable non-essential animation).
- Never animate text readability away (no flicker, no long typewriter effects for important content).

---

## 9. Responsive, Accessibility, Performance (quality floor)

Build to this floor without announcing it:

**Responsive**
- Mobile-first. Test at 360, 390, 768, 1024, 1280, 1440px widths.
- No horizontal scroll at any width. Touch targets at least 44x44px.
- Hero headline scales with `clamp()`; images use `max-width: 100%`.
- Navigation collapses cleanly; the primary action stays reachable.

**Accessibility**
- Semantic HTML: one `h1`, ordered headings, `header/nav/main/section/footer`, `button` for actions, `a` for navigation.
- Visible `:focus-visible` outline using the accent (never `outline: none` without a replacement).
- Color is never the only signal. Contrast per section 4.1.
- All images have meaningful `alt` (empty `alt=""` for decorative). Form fields have labels. Icon-only buttons have `aria-label`.
- Full keyboard operability, logical tab order, Esc closes overlays.

**Performance**
- Optimize and size images, lazy-load below the fold, preload the hero image and primary font.
- Avoid heavy animation libraries and large dependencies for simple effects.
- The Tailwind CDN script is for prototypes only. For a deployed site, compile Tailwind (or write plain CSS from the tokens) and say so in the final report.
- Avoid layout shift (set image dimensions, reserve space for async content).

---

## 10. Workflow the Agent Must Follow

### Step 1: Understand
Restate the brief in 3-4 lines (product, audience, primary job, references). Ask at most **one** question if something critical is missing; otherwise state assumptions.

### Step 2: Plan (before any code)
Write a compact plan:
- **Tokens:** 4-6 named colors, font(s) and roles, spacing and radius choices.
- **Layout:** one-sentence concept + ASCII wireframe per section, with alignment (left / center).
- **Principles:** the one memorable thing, and what stays quiet.
- **Content list:** exact text and assets to be used, taken from the user. Mark anything missing.

### Step 3: Self-review the plan
Check against sections 3 and 6. If any decision is something you would do for any similar page, revise it and say what changed in one line.

### Step 4: Build
- Define tokens first, then base styles, then components, then sections.
- Build **one section at a time** when the page is large.
- Keep CSS specificity flat (single classes; avoid conflicting `.section` vs element selectors that cancel margin/padding).
- Reuse components; do not duplicate near-identical markup with slightly different values.

### Step 5: Critique and subtract
Before declaring done:
1. Remove one decorative thing ("take off one accessory").
2. Delete any text that does not help the user understand or act.
3. Run the checklist in section 11.
4. If a screenshot/browser tool is available, view the result at desktop and mobile widths and fix what looks generic or crowded.

### Step 6: Report
Reply briefly: what was built, which tokens were chosen, which content is placeholder, and what you intentionally left out.

---

## 11. Final Checklist (must all be true)

**Anti-AI**
- [ ] No unnecessary cards, badges, pills, eyebrows, icon-in-circle, gradients, glass, glow.
- [ ] No fake stats, testimonials, logos or features. No lorem ipsum. No emoji.
- [ ] No sections or components the user did not ask for.
- [ ] No single-word color/italic accent in headlines; no ALL-CAPS label spam.
- [ ] Layout has a clear focal point; not everything is equal weight.
- [ ] No caption lines under section headings and no meta text about how the page was made.
- [ ] No fact is repeated in more than one primary place; no duplicate bullets.
- [ ] No overclaims, unexplained metrics, or inflated titles.
- [ ] No visible placeholders, upload widgets or TODOs. No dead links.
- [ ] No private data (birth date, address, IDs) published without the user's explicit OK.
- [ ] Showcase/portfolio pages: real screenshots and links for every project.

**Design system**
- [ ] Only tokens used (no stray hex values or random px).
- [ ] At most 1 accent color, at most 2 font families.
- [ ] Spacing from the scale; sections have generous vertical padding.
- [ ] Radius and shadow consistent with section 4.4.

**Content**
- [ ] Each section: one headline, at most one supporting line, one or two actions.
- [ ] Button labels name the exact action. Copy is plain and specific.
- [ ] Vietnamese text has correct diacritics and the chosen font supports them.

**Quality**
- [ ] Responsive 360px to 1440px, no horizontal scroll.
- [ ] Keyboard accessible, visible focus, correct contrast, alt text, labels.
- [ ] `prefers-reduced-motion` respected; animation limited to what section 8 allows.
- [ ] Images sized, lazy-loaded, optimized.
- [ ] Headings use `text-wrap: balance`; no orphan words at 1440 / 1024 / 390px.
- [ ] Nav active state does not change font-weight (no layout shift).

---

## 12. Quick Prompts (copy/paste to the agent)

**Start a new page**
```
Read UI-UX-SKILLS.md. Build the [page name] for [product]. Use only this real content: [paste].
First write the plan (tokens, wireframe, content list), review it against section 3, then build one section at a time.
```

**Fix an AI-looking UI**
```
Read UI-UX-SKILLS.md. Audit the current UI against sections 3 and 11. List every violation, then fix them.
Remove cards, badges, icon boxes, filler text and invented stats. Keep only the content I provided. Do not add new sections.
```

**Clone the feeling of a reference**
```
Read UI-UX-SKILLS.md. Match the layout rhythm, spacing and type hierarchy of [reference image/URL].
Do not add any element that is not visible in the reference. Use my content: [paste].
```

**Portfolio from a CV**
```
Read UI-UX-SKILLS.md, especially "Copy and content hygiene", "Privacy on public pages" and "Portfolio / personal / product-showcase pages".
Build my portfolio from this CV: [paste]. Use only facts from the CV, do not inflate my role or add claims.
Leave out date of birth and phone unless I say otherwise. Add image slots with real file paths for each project and a link slot (GitHub/demo).
In the final report list: what you left out, what is missing (screenshots, links), and any number that needs its metric explained.
```

**Final pass**
```
Remove 30% of the elements on this page. Keep only what helps the user understand or act. Increase whitespace instead of adding components. Then run the section 11 checklist.
```

---

## 13. Reference Style Notes (what "good" looks like)

- **apple.com:** black or white canvas, one huge headline, one subline, two buttons, a giant product image that fills the width. No cards, no icons, no stats. Hierarchy is only size, weight and space.
- **phongcachxanh.vn:** full-width hero with a large product shot, a single headline, one white button; below it a plain heading ("Danh muc chinh") and a clean row of category items, each just an icon/image and a name.
- **mimo.xiaomi.com/coder:** warm light background, centered title, one install command as the main action, three quiet secondary buttons, then a large illustrated feature panel with a short statement.

Common thread: **one focal point per screen, big type, big space, real product, almost no chrome.**
