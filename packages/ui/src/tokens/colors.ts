/**
 * Design tokens — Couleurs.
 * Identité LYNE alignée sur le logo et la vitrine fournis : rouge, noir et blanc.
 * Toute couleur de marque est centralisée ici : ne jamais dupliquer de valeur hexadécimale dans le code.
 */

export const colors = {
  /** Identité de marque — rouge LYNE et neutres. */
  brand: {
    primary: "#B40712",
    dark: "#85040C",
    soft: "#F8E9E9",
    glow: "#F59C8C",
    shadow: "#36030B",
    onPrimary: "#FFFFFF",
    accent: "#111111",
    onAccent: "#FFFFFF",
  },
  /** Surfaces. */
  surface: {
    background: "#FAF8F8",
    card: "#FFFFFF",
    muted: "#F3EEEE",
  },
  /** Texte. */
  text: {
    primary: "#111111",
    secondary: "#5C5C5C",
    disabled: "#9C9C9C",
    onDark: "#FFFFFF",
  },
  border: {
    default: "#E2DADA",
    strong: "#B8AAAA",
  },
  /** États sémantiques. Ne jamais utiliser la couleur seule pour une information (spec §9). */
  semantic: {
    danger: "#B3261E",
    success: "#2E7D32",
    warning: "#B26A00",
    info: "#1565C0",
  },
} as const;

export type ColorToken = typeof colors;
