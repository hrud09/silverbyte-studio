# Silverbyte Studio — Design System

**Direction: "Shipped, not pitched."** Silverbyte is a small studio that ships its own
apps and games, and now builds software for businesses. The site should feel like a
calm, technical workshop: dark graphite, plenty of space, real product
screenshots, and the brand's own amber from the logo. No indigo glow, no gradients.

- **Audience:** product owners, founders and ops leads deciding whether to hire a
  small studio. They scan for proof (shipped products, platforms, how we work) and a
  clear way to get in touch.
- **Feeling:** technical, honest, focused. A little playful only where the brand
  already is (the pixel-type logo).
- **Theme:** dark only for now (see *Open decisions*).
- **Source of truth:** tokens live in `assets/css/style.css` `:root`. Pages use token
  names, never raw hex or rgba values.

> Not based on a comparison with real sites: the UXKIN reference library wasn't connected
> when this was written. The colors come from the studio logo and the existing site.

---

## 1. Color

Brand colors are taken from `assets/images/studio-logo.png`: amber `#F0B854`, coral
`#E05A57`, black, white. Neutrals are a near-black graphite with no hue. The old
navy/slate scale fought with the warm logo.

### Neutrals

| Token | Value | Role |
|---|---|---|
| `--bg-base` | `#0C0C0E` | Page background |
| `--bg-surface` | `#151518` | Cards, nav panels, footer |
| `--bg-surface-elevated` | `#1D1D21` | Hovered cards, menus, inputs |
| `--bg-surface-card` | `rgba(21,21,24,.72)` | Cards over imagery |
| `--bg-glass` | `rgba(12,12,14,.88)` | Sticky header (solid-ish; no heavy blur) |
| `--border-subtle` | `rgba(255,255,255,.08)` | Dividers, card borders |
| `--border-strong` | `rgba(255,255,255,.16)` | Hovered borders, inputs |
| `--text-main` | `#F4F4F5` | Headings and body (17.8:1) |
| `--text-muted` | `#A1A1AA` | Secondary text, descriptions (7.6:1) |
| `--text-subtle` | `#7A7A84` | Metadata, captions only (4.6:1) |

### Brand

| Token | Value | Role |
|---|---|---|
| `--primary` | `#F0B854` | **Primary actions**: primary button fill, links, focus ring, active nav dot (10.9:1 on base) |
| `--primary-hover` | `#F5C76F` | Primary button hover |
| `--on-primary` | `#0C0C0E` | Text/icons on amber (10.9:1). **Never white on amber.** |
| `--primary-text` | `#F5C76F` | Amber text on tinted amber badges |
| `--primary-tint` | `rgba(240,184,84,.12)` | Badge and selected-row backgrounds |
| `--primary-border` | `rgba(240,184,84,.32)` | Badge borders, hovered card border |
| `--primary-glow` | `rgba(240,184,84,.18)` | Soft hover fill on quiet buttons |
| `--accent` | `#E05A57` | **Decorative accent only**: the pixel-block marker, one stat or keyword per section. Not used for buttons, links or text states (5.4:1) |
| `--accent-text` | `#EF7A77` | Coral when it must be read as text (7.2:1) |

### Status

| Token | Value | Role |
|---|---|---|
| `--success` | `#34D399` | Live / shipped / sent (10.2:1) |
| `--warning` | `#FB923C` | Beta / coming soon. Orange so it's distinct from amber primary |
| `--error` | `#F87171` | Form errors. Always with an icon and message, so it's never confused with coral |

Rule: **one amber action per view.** Coral appears at most once per section.

---

## 2. Typography

| Role | Family | Why |
|---|---|---|
| Headings + body | **Geist** (Google Fonts, 400/500/600/700) | Neutral, engineered and readable. Fits a software studio without being the default Inter look |
| Labels, eyebrows, metadata, code | **Geist Mono** (400/500) | Gives the "byte" a technical voice next to the pixel logo, in small doses |
| Logo | the pixel wordmark image only | Never set pixel fonts as live text |

Tokens: `--font-sans`, `--font-mono` (system fallbacks included, so the site works before
the webfont loads).

### Scale (1.25 ratio, 16px base)

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `--text-xs` | 12px / .75rem | 1.5 | 500 mono | Eyebrows, tags (uppercase, +0.06em) |
| `--text-sm` | 14px / .875rem | 1.55 | 400–500 | Metadata, nav, buttons |
| `--text-base` | 16px / 1rem | 1.65 | 400 | Body (minimum for paragraphs) |
| `--text-lg` | 18px / 1.125rem | 1.6 | 400 | Lead paragraphs |
| `--text-xl` | 24px / 1.5rem | 1.3 | 600 | Card titles, h3 |
| `--text-2xl` | 32px / 2rem | 1.2 | 600 | Section titles, h2 |
| `--text-3xl` | clamp(2.25rem, 5vw, 3.5rem) | 1.1 | 700 | Hero h1, −0.03em tracking |

- Headings: solid `--text-main`. **No gradient text.**
- Body line length: `--measure: 68ch`.
- Numbers in stats/tables: `font-variant-numeric: tabular-nums`.

---

## 3. Spacing & layout

4px base, used everywhere (`--space-1` … `--space-24`):

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` → `--space-1, 2, 3, 4, 6, 8, 12, 16, 24`

| Token | Value | Use |
|---|---|---|
| `--section-y` | clamp(4rem, 9vw, 6rem) | Vertical padding between page sections |
| `--content-max` | 1080px | Container width (existing `.container`) |
| `--measure` | 68ch | Max width of running text |
| Gutter | clamp(1rem, 4vw, 1.5rem) | Side padding (≥16px on phones) |

Layout rules:
- Hero is **left-aligned** on B2B pages (text left, proof right: screenshot or product
  grid). Center only short closing CTAs.
- Avoid rows of three identical cards. Work is shown as a **case list** (big image +
  short write-up, alternating) or a mixed grid with one featured item.

---

## 4. Shape & depth

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Badges, inputs, small buttons |
| `--radius-md` | 10px | Buttons, nav cards |
| `--radius-lg` | 16px | Cards, images, panels |
| `--radius-full` | 9999px | Pills, status dots |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.4)` | Buttons, inputs |
| `--shadow-lg` | `0 16px 40px -12px rgba(0,0,0,.6)` | Menus, dropdowns, lifted cards |

Depth comes mostly from **surface steps + 1px borders**, not shadows. No colored glows.

---

## 5. Components

**Buttons** (`.btn`, 44px min height, `--radius-md`, `--text-sm` 600)
- *Primary* `.btn-primary`: `--primary` fill, `--on-primary` text. Hover `--primary-hover`.
  Use it once per view ("Start a project", "Book a call").
- *Secondary* `.btn-secondary`: transparent fill, `--border-strong`, `--text-main`.
  Hover `--bg-surface-elevated`.
- *Quiet*: text-only, `--text-muted` → `--text-main` on hover, with a trailing →.
- *Focus* (all): `2px solid var(--primary)`, 2px offset. *Disabled*: 45% opacity,
  `cursor: not-allowed`, no hover change.

**Links**: inline links in `--primary`, underlined on hover (offset 3px). Nav links in
`--text-muted` → `--text-main`.

**Inputs**: `--bg-surface-elevated` fill, `--border-strong`, `--radius-sm`, 44px height,
label above in `--text-sm` 500. Focus: border `--primary` + focus ring. Error:
`--error` border plus icon + message below.

**Cards**: `--bg-surface`, `--border-subtle`, `--radius-lg`, padding `--space-6`. Hover:
border `--primary-border`, no lift over 2px.

**Badges**: `--text-xs` mono uppercase. Primary = `--primary-tint` /
`--primary-text` / `--primary-border`. Status badges use the status colors at 12% tint.

**Navigation**: sticky, `--bg-glass`, bottom `--border-subtle`. Logo + wordmark left,
links center/right, one primary CTA ("Work with us") at the far right.

**Footer**: `--bg-surface`, four short columns (Studio, Products, Business, Legal), contact
email in mono, copyright in `--text-subtle`.

**Signature motif**: a small 3-block pixel marker (amber, amber, coral; 6px squares)
before eyebrows, echoing the "BYTE" in the logo. It's the only decorative element. No
blobs, gradients or emoji.

---

## 6. Imagery & icons

- **Icons**: Lucide (outline, 1.75px stroke, 20px default) for every icon, sized with text.
  No emoji as icons.
- **Product images**: real screenshots and existing app banners, `--radius-lg` with a
  `--border-subtle` frame. Phone screenshots in a plain device frame, not 3D mockups.
- **No stock photos** of people at laptops, and no AI-generated illustration.
- App icons (`*-icon.png`) at 36/48/64px with `--radius-md`.

---

## Open decisions

1. **Light mode**: the site is dark-only. Many B2B buyers prefer light pages. If wanted,
   add light values for the neutral tokens (amber would need a darker `#B7801F` for
   text/links on white).
2. **Positioning**: whether B2B work becomes the homepage story or stays on
   `business.html` next to the consumer apps and games.
