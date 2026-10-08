# Base de données — LYNE RESTAURANT

Source de vérité : **MySQL 8+** (spec §6). Les migrations sont **versionnées,
non destructives et reproductibles** (spec §0 : « Créer les migrations de manière
non destructive et reproductible »).

| Dossier | Contenu | Statut |
|---------|---------|--------|
| `migrations/` | Scripts SQL/Prisma de schéma, appliqués phase par phase | *Phase 1* : schéma socle (users, roles, permissions, audit) |
| `seed/` | Données de démonstration (compte admin, référence) | *Phase 1* : seed admin (+ données de démo par phase) |

## Règles (rappel cahier des charges)

- Les suppressions physiques des données financières, achats, ventes et
  mouvements sont **interdites en exploitation normale** (RG-08) :
  les migrations ne suppriment jamais silencieusement de données sensibles.
- Montants en `DECIMAL`, jamais `FLOAT` (spec §7).
- Identifiant stable + `created_at` / `updated_at` sur les tables métier.
- Sauvegarde automatique MySQL quotidienne + politique de rétention (Phase 12).

## Phase 0

Aucune migration ni seed en Phase 0 (cadrage & fondations uniquement).
Les répertoires `migrations/` et `seed/` sont réservés à partir de la Phase 1.

## Phase 1 — socle appliqué, recette du 28/09/2026

- Schéma : `schema.prisma` ; configuration : `prisma.config.ts`.
- Migration : `migrations/202609250001_phase1_auth`, appliquée sur MariaDB
  11.8.9 avec le connecteur MySQL de Prisma 7.10.0.
- Tables : `users`, `roles`, `permissions`, `role_permissions`, `sessions`,
  `audit_logs`, plus la table de suivi Prisma.
- Seed réel : `services/api/src/seed.ts` ; quatre rôles de référence,
  permissions socle et compte administrateur initial. Son réexécution ne
  remplace pas le mot de passe d'un compte existant.
- Mots de passe hachés Argon2id ; seule l'empreinte des jetons de session est
  conservée. Changement initial obligatoire, sessions révocables et audit.

Depuis la racine, après configuration privée de l'environnement :

```bash
npm run db:validate
npm run db:generate
npm run db:status
```

`npm run db:deploy` et `npm run db:seed` écrivent dans la base : vérifier la
cible et disposer d'une sauvegarde avant intervention. Le seed lit le secret
initial dans `services/api/.env.seed` ; ne pas régénérer ce fichier pour tenter
de changer un mot de passe déjà initialisé. Ne jamais employer `migrate reset`
ou un retour arrière destructif sur la base serveur.

Une sauvegarde privée a précédé la migration, puis une autre le seed du
28/09/2026. Le contrôle réel a validé le seed idempotent, les rôles, la santé
DB, la connexion, l'obligation de changement initial et la révocation à la
déconnexion. Les événements d'audit de ces contrôles sont conservés.
Voir `docs/serveur.md` et `docs/rapport-phase-1.md` pour les détails et limites.

## Reprise du 8 octobre 2026

Pour une **nouvelle base vide**, le schéma Phase 2 est maintenant reproductible
avec `npm run db:bootstrap`, puis `npm run db:seed`. Voir
[la procédure baseline](baseline/README.md). Le serveur existant conserve son
historique : cette nouvelle procédure ne répare pas automatiquement le fichier
SQL historique manquant et ne doit pas lui être appliquée.
