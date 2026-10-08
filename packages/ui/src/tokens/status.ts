import { colors } from "./colors.js";

/**
 * Statuts de commande (spec §4.5/§9).
 * Chaque état associe un libellé, une couleur ET une icône suggérée :
 * l'information ne repose jamais uniquement sur la couleur.
 */
export const orderStatusTokens = {
  new: {
    label: "Nouvelle",
    color: colors.semantic.info,
    icon: "document",
  },
  preparing: {
    label: "En préparation",
    color: colors.semantic.warning,
    icon: "flame",
  },
  ready: {
    label: "Prête",
    color: colors.brand.accent,
    icon: "bell",
  },
  served: {
    label: "Servie",
    color: colors.brand.primary,
    icon: "check",
  },
  paid: {
    label: "Payée / Clôturée",
    color: colors.semantic.success,
    icon: "cash",
  },
  cancelled: {
    label: "Annulée",
    color: colors.semantic.danger,
    icon: "cross",
  },
} as const;

export type OrderStatusKey = keyof typeof orderStatusTokens;

/** Cadre de référence pour l'impression ticket (spec §5 / §6). */
export const ticketTokens = {
  widthMm: { narrow: 58, wide: 80 } as const,
  fontScale: 1,
  lineChars: { narrow: 32, wide: 44 } as const,
  footerExample: "Merci de votre visite — LYNE RESTAURANT",
} as const;