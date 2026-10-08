/**
 * Design tokens — Echelle, rayons, élévation.
 * Grille de base de 4 px, cohérente sur web et mobile.
 */

export const spacing = {
  xs4: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  round: 9999,
} as const;

export const elevation = {
  flat: 0,
  low: 1,
  medium: 2,
} as const;