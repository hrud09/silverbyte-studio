# Silverbyte Studio — Design System (Workshop Game UI Sprite Edition)

**Direction: "Shipped, not pitched — built in the Workshop."** Silverbyte is a studio that ships its own games and utilities, and builds software for businesses. The site uses the **Workshop Game UI Sprite System** (ported from *Game Dev Gallery*): tactile wooden plank walls, bevelled wood frames with mossy corner nails, cream parchment quest sheets, folded-end banner ribbons, and chunky 3D bevelled sprite buttons.

- **Audience:** players, utility users, and product owners/founders deciding whether to hire a studio that ships real products.
- **Feeling:** tactile, crafted, playful yet disciplined — every panel, button, badge, and card feels like an authentic in-game workshop UI sprite.
- **Source of truth:** tokens and `.gx-*` sprite primitives live in `assets/css/style.css` (`:root`) and `admin/admin.css`.

---

## 1. Color & Materials (`--gx-*` Palette)

The palette pairs warm dark-roast wood panels with high-contrast cream parchment sheets and vibrant game-UI gem accents.

### Wood & Surface Tokens

| Token | Value | Role |
|---|---|---|
| `--gx-bg` / `--bg-base` | `#2b1f1a` | Vertical wood plank wall background |
| `--gx-wood` / `--bg-surface` | `#5a3e31` | Standard bevelled wood plank panels |
| `--gx-wood-dark` | `#3d2a21` | Recessed slots, dark wood frames, code blocks |
| `--gx-wood-light` | `#7a5643` | Top highlight bevels, hovered wood chips, scrollbar thumbs |
| `--gx-edge` | `#241812` | Universal `2.5px`–`4px` dark ink sprite outline |
| `--gx-shadow` | `#140d0a` | Hard 3D drop shadow (`0 4px 0 #140d0a`) |

### Parchment & Ink Tokens

| Token | Value | Role |
|---|---|---|
| `--gx-paper` | `#f3e3c3` | Cream parchment cards (`.portal-card` body, `.contact-card`, `.nav-panel`) |
| `--gx-paper-light` | `#fbf1dc` | Parchment top inner highlight |
| `--gx-paper-dark` | `#dcc39a` | Parchment bottom inner bevel & stacked sheet edges |
| `--gx-ink` | `#4a2e22` | Primary dark brown ink text on parchment surfaces |

### Game UI Accents & Status

| Token | Value | Role |
|---|---|---|
| `--gx-gold` / `--primary` | `#f2b92e` | Primary gold buttons, active nav chips, focus rings, showcase rails |
| `--gx-red` / `--accent` | `#e05a4f` | Primary CTA buttons ("Work with us", "Start a Project"), crimson ribbons |
| `--gx-teal` | `#2bb5b8` | Cyan/teal ribbons, secondary action buttons, B2B accents |
| `--gx-olive` / `--success` | `#a3ad2b` | Live / shipped status badges, striped progress bars |
| `--gx-purple` | `#7b3fa8` | Specialty badges and accents |
| `--gx-moss` | `#a8b07a` | Corner nail heads (`.gx-nails`) on wood panels |

---

## 2. Typography

| Role | Family | Weight & Treatment |
|---|---|---|
| Display titles, buttons, ribbons, badges (`.gx-display`) | **Lilita One** (`--font-display`) | `400`, uppercase on buttons/badges/ribbons, `+0.04em` tracking |
| Body copy & UI descriptions | **Nunito** (`--font-sans`) | `500`–`800`, warm rounded sans for high readability on wood and parchment |
| Subheadings & metadata | **Fredoka** (`--font-mono`) | `500`–`700`, rounded technical voice for labels, platform chips, and counters |

### Title Treatments
- **`.gx-title`** (on dark wood): Cream `#fff6e0` fill with carved 3D dark-ink stroke and drop shadow (`0 3px 0 #241812, -1.5px -1.5px 0 #241812, 1.5px -1.5px 0 #241812...`).
- **`.gx-ink-title`** (on cream parchment): Deep ink `#4a2e22` with warm highlight drop (`0 2px 0 rgba(255, 250, 235, 0.8)`).

---

## 3. Sprite Primitives & Components

### Wood Panels (`.gx-wood`, `.gx-wood-dark`, `.gx-nails`)
- Bordered with `3.5px solid #241812`, `16px` border-radius, subtle horizontal wood-grain overlay, top warm highlight bevel (`inset 0 3px 0 rgba(255, 220, 175, 0.22)`), bottom dark bevel (`inset 0 -5px 0 rgba(20, 10, 5, 0.42)`), and hard drop shadow (`0 6px 0 #140d0a`).
- `.gx-nails` adds two mossy metal nail heads (`#a8b07a` with `#241812` border) in the top-left and top-right corners (`::before` / `::after`).
- `.gx-slot` creates a recessed dark-wood inventory well (`#322119`, `2.5px solid #241812`, `inset 0 3px 0 rgba(0, 0, 0, 0.45)`) for nested items like `.shipped-item`, `.b2b-metric`, and `.b2b-cap-card`.

### Parchment Sheets (`.gx-paper`, `.gx-paper-stack`, `.gx-paper-well`)
- Used on `.portal-card` bodies, `.contact-card`, `.nav-panel` mega-menus, and `.legal-table th`.
- `3.5px solid #241812` border, `#f3e3c3` fill, inner cream/tan bevels, and `#4a2e22` ink typography.
- `.gx-paper-stack` adds a second offset parchment sheet shadow (`4px 5px 0 -1px #dcc39a, 4px 5px 0 1.5px #241812`) behind the card.

### Folded Banner Ribbons (`.eyebrow` / `.gx-ribbon`)
- Section eyebrows render as tilted (`rotate(-1.2deg)`) game banner ribbons with `Lilita One` uppercase text, `2.5px solid #241812` outlines, `0 4px 0 #241812` drop shadow, and `clip-path` V-notched ribbon tails (`::before` / `::after`).
- Color-coded by section: Coral (`#e05a4f`), Teal (`#2bb5b8`), Gold (`#f2b92e`), and Olive (`#a3ad2b`).

### Chunky 3D Buttons (`.btn` / `.gx-btn`)
- `2.5px solid #241812` border, top gloss highlight gradient (`rgba(255,255,255,0.32)` to `rgba(0,0,0,0.18)`), inner top highlight, and `0 3px 0 #241812` shadow.
- **Interactive press**: `:hover` brightens (`filter: brightness(1.06)`); `:active` physically depresses (`transform: translateY(3px)`) and collapses the bottom shadow (`0 0 0 #241812`).
- Variants: `.btn-primary` (Coral `#e05a4f` / Gold `#f2b92e`), `.btn-secondary` (Wood `#5a3e31`), `.btn-badge` (Dark wood store badge with gold icon).

### Navigation & Topbar (`header.site-header` / `.gx-topbar`)
- Horizontal wood beam (`#4a3328`) with `4px solid #241812` bottom border and `0 5px 0 rgba(0,0,0,0.4)` shadow.
- `.nav-trigger` items are bevelled wood chips (`.gx-chip`) that turn gold (`#f2b92e`) and tilt `-1.5deg` when hovered, expanded, or active.
- Dropdown `.nav-panel` is a stacked parchment sheet with `.nav-group-label` dark-wood plaques (`.gx-plaque`).

### Showcase & Progress Bar (`.showcase`, `.showcase-progress`)
- Hero `.showcase` is a dark wood stage (`#3d2a21`) with a `5px` gold top rail (`#f2b92e`), gold tag badge, wood icon buttons (`.showcase-btn`), and an olive diagonal-striped game loading bar (`.showcase-progress > span`).

---

## 4. Layout & Spacing Rules

- **Content width:** one `.container` width (`1180px` max) for header, sections and footer. Product and legal pages keep their narrower reading column inside it.
- **Section rhythm:** `--section-y: clamp(3.25rem, 6vw, 4.75rem)` top and bottom. `.section-alt` bands are separated by a 2px solid hairline (`rgba(134,104,79,.26)`), not dashed trails.
- **Product cards (`.portal-card`):** every card has a banner of the same height (`clamp(170px, 17vw, 200px)`, 180px on phones). A product with no artwork gets `.portal-card-banner--icon`, its icon on a dark-wood stage (the CMS renderer adds it automatically). Icon and title are top-aligned, titles use `line-height: 1.2`, and the footer actions sit on the card's bottom edge (`margin-top: auto`), so footers line up across a row.
- **Contact channels:** an even button grid (`minmax(190px, 1fr)`), one column at 480px and below.
- **Footer links:** CSS columns in sentence-case Nunito (4 columns on desktop, 2 on phones), read top to bottom.
