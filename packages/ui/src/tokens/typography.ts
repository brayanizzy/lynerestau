/**
 * Design tokens — Typographie.
 * Échelle unique partagée entre le web (admin) et le mobile (Expo).
 */

export const typography = {
  /** Piles de polices (ordre de repli). */
  fonts: {
    sans: [
      "System-UI",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ] as const,
    /** Pile terminale pour tickets/factures (ESC/POS 58/80 mm). */
    mono: ["Cascadia Mono", "JetBrains Mono", "Consolas", "monospace"] as const,
  },
  sizes: {
    caption: 12,
    bodySm: 14,
    body: 16,
    lead: 18,
    h4: 20,
    h3: 24,
    h2: 32,
    h1: 40,
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  /** Cible tactile minimale recommandée (spec §9 : boutons assez grands sur tablette). */
  minTouchTarget: 44,
} as const;