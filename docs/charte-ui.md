# Charte UI — LYNE RESTAURANT (v0.1.0)

Source de vérité des valeurs : `packages/ui/src/tokens/*.ts` (+ `tokens.css`
généré pour le web). **Toute valeur de marque est centralisée dans ces tokens :
ne jamais dupliquer de hexadécimal dans le code applicatif.**

> ⚠️ Palette *par défaut*, éditable tant que le client n'a pas fourni logo et
> couleurs officiels (spec §15 — « Données initiales à demander au client »).

## Palette

| Rôle | Token | Valeur |
|---|---|---|
| Marque principale (vert bouteille) | `brand.primary` | `#1F3B2D` |
| Accent (terracotta) | `brand.accent` | `#C96A2E` |
| Fond d'écran (crème) | `surface.background` | `#FAF7F2` |
| Carte | `surface.card` | `#FFFFFF` |
| Texte principal | `text.primary` | `#1B1B1B` |
| Texte secondaire | `text.secondary` | `#5C5C5C` |
| Bordure | `border.default` | `#D8D2C8` |
| Danger / Succès / Avertissement / Info | `semantic.*` | `#B3261E` / `#2E7D32` / `#B26A00` / `#1565C0` |

## Statuts de commande (spec §4.5)

**L'information ne repose jamais uniquement sur la couleur** (spec §9) :
chaque état a un libellé, une couleur ET une icône.

| État | Libellé | Couleur | Icône |
|---|---|---|---|
| `new` | Nouvelle | `info #1565C0` | document |
| `preparing` | En préparation | `warning #B26A00` | flame |
| `ready` | Prête | `accent #C96A2E` | bell |
| `served` | Servie | `primary #1F3B2D` | check |
| `paid` | Payée / Clôturée | `success #2E7D32` | cash |
| `cancelled` | Annulée | `danger #B3261E` | cross |

## Typographie & échelle

- Échelle : 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 px
  (tokens `typography.sizes`).
- Piles : sans-serif système ; police monospace réservée aux tickets ESC/POS.
- Grille d'espacement 4 px : 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Cible tactile minimale : 44 px** (tablette/Android prioritaire, spec §9).

## Ticket thermique (58/80 mm)

Largeurs de référence `58` et `80` mm, exemplaire de pied de ticket :
« Merci de votre visite — LYNE RESTAURANT ». Le modèle exact d'imprimante est à
confirmer avant de figer le pilote d'impression (spec §6/§15).

## Utilisation

Web (admin-web) :

```css
@import "@lyne/ui/tokens.css";
.card { background: var(--lyne-surface-card); }
```

TypeScript (mobile/admin) :

```ts
import { colors, spacing, orderStatusTokens } from "@lyne/ui";
```

## Notes

- Version de la charte : `CHART_VERSION` dans `packages/ui/src/index.ts`.
- Le mobile consommera `@lyne/ui` dès que le câblage Metro/monorepo sera
  validé (décision Phase 0 — cf. AGENTS.md).