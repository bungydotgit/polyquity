# Design System Strategy: Institutional Elegance

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Digital Vault."** 

Polyquity is not just another DeFi protocol; it is an institutional-grade anchor. To move beyond the generic "SaaS template" look, we employ a high-end editorial approach. We achieve this through **Intentional Asymmetry**—where large-scale typography and expansive white space create a sense of calm authority—and **Tonal Depth**, replacing rigid structural lines with sophisticated layering. The goal is to make the interface feel like a series of premium, physical assets floating in a perfectly lit, architectural space.

## 2. Colors & Surface Philosophy
Our palette is rooted in the reliability of `primary` (#004ac6) and the clarity of `surface` (#faf8ff). 

### The "No-Line" Rule
Standard enterprise UI relies on 1px borders to separate ideas. This system prohibits 1px solid borders for sectioning. Boundaries must be defined solely through:
*   **Background Color Shifts:** Use `surface_container_low` for sections sitting on a `surface` background.
*   **Tonal Transitions:** Use a shift from `surface` to `surface_container` to denote a functional change without breaking the visual flow with a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent materials.
*   **Base:** `surface` (#faf8ff)
*   **Sectioning:** `surface_container_low` (#f2f3ff)
*   **Interactive Cards:** `surface_container_lowest` (#ffffff) nested within a lower-tier container to create a "lifted" appearance without heavy shadows.

### The "Glass & Gradient" Rule
To elevate the "Institutional" feel, floating elements (Modals, Popovers, Navigation) must use **Glassmorphism**. Apply `surface_container_lowest` at 80% opacity with a `backdrop-blur-md`.
*   **Signature Textures:** For Hero CTAs and primary actions, utilize a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle. This adds "soul" and depth that a flat hex code cannot provide.

## 3. Typography
We utilize a dual-typeface system to balance "Institutional" with "Functional."

*   **Display & Headline (Manrope):** A geometric sans-serif that communicates modernity and precision. Use `display-lg` (3.5rem) with wide tracking (-0.02em) for high-impact data points or welcome states.
*   **Body & Labels (Inter):** Chosen for its exceptional readability at small scales. Inter handles the heavy lifting of complex DeFi data. 
*   **Editorial Contrast:** Create hierarchy by pairing a `headline-sm` Manrope title with a `body-sm` Inter description. This high-contrast scale mimics premium financial journals.

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through "Tonal Stacking." Place a `surface_container_lowest` card on top of a `surface_container_low` background. This creates a soft, natural edge.

### Ambient Shadows
When an element must float (e.g., a dropdown or a modal), use an **Ambient Shadow**:
*   **Blur:** 24px - 40px.
*   **Opacity:** 4% - 6%.
*   **Color:** Use a tinted version of `on_surface` (#131b2e) rather than pure black to ensure the shadow feels like a natural part of the environment.

### The "Ghost Border" Fallback
If a boundary is required for accessibility (e.g., input fields), use a **Ghost Border**:
*   **Token:** `outline_variant` (#c3c6d7) at **20% opacity**.
*   **Rule:** 100% opaque, high-contrast borders are strictly forbidden.

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Text: `on_primary`. Roundedness: `xl`.
*   **Secondary:** `surface_container_high` with a Ghost Border. Text: `primary`.
*   **Tertiary:** No background. Text: `primary`. Use for low-emphasis actions.

### Input Fields
*   **Style:** `surface_container_lowest` background, `xl` rounding, and a 20% opacity `outline_variant` border.
*   **Focus State:** Shift border to `primary` at 50% opacity with a 2px `primary_fixed` outer glow.

### Cards & Lists
*   **The Divider Ban:** Never use `hr` tags or lines to separate list items. Use vertical white space (`spacing-4`) or alternating background tints (`surface` vs `surface_container_low`) to define rows.
*   **Data Grids:** Use `label-md` for headers in `on_surface_variant` and `title-sm` for the data values.

### Institutional "Trust" Components
*   **Verification Badge:** Small `secondary_container` chip with `on_secondary_container` text to denote "Verified Asset" or "Audited."
*   **Liquidity Gauges:** Use a `primary` to `secondary` gradient for progress bars to visualize depth and flow.

## 6. Do's and Don'ts

### Do
*   **Do** use extreme white space. If a section feels crowded, double the spacing using the `spacing-12` or `spacing-16` tokens.
*   **Do** use `rounded-xl` (1.5rem) for all major containers to soften the "enterprise" feel into something more modern and approachable.
*   **Do** prioritize typography scale over color for hierarchy. A larger font size is more "institutional" than a brighter color.

### Don't
*   **Don't** use pure black (#000) for text. Always use `on_surface` (#131b2e) to maintain tonal harmony.
*   **Don't** use standard "Drop Shadows." If it doesn't look like ambient light, it doesn't belong.
*   **Don't** use sharp corners. Every interaction point should feel machined and polished, represented by our `xl` rounding scale.