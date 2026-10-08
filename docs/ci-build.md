# Vérifications & travail par SSH — LYNE RESTAURANT

## Scripts de vérification

Depuis la racine du monorepo :

Utiliser npm **11.19.1 minimum** ; la référence est 11.19.1. Les commandes
`npx --yes npm@11.19.1 ...` fonctionnent sans changer la version globale de npm.

| Commande | Effet |
|---|---|
| `npx --yes npm@11.19.1 ci` | Installe les versions verrouillées de toutes les workspaces |
| `npx --yes npm@11.19.1 install` | Actualise l'installation et le lockfile après modification des dépendances |
| `npx --yes npm@11.19.1 audit` | Vérifie les vulnérabilités signalées pour l'arbre complet |
| `npm run build` | Construit `@lyne/shared`, `@lyne/ui`, `lyne-api`, `lyne-admin-web` puis typecheck du mobile |
| `npm run typecheck` | `tsc --noEmit` sur chaque workspace (dont Expo) |
| `npm run lint` | ESLint (flat config racine) sur shared/ui/api/admin-web |
| `npm run lint:mobile` | `expo lint` (apps/mobile) |
| `npm test` | Tests Vitest du socle de Phase 1 |
| `npm run dev:api` / `dev:admin-web` / `dev:mobile` | Services de développement |

Vitest est disponible depuis la Phase 1. Les tests isolés ne remplacent pas
les contrôles avec la vraie base ni la recette HTTPS et sur appareil mobile.

## Cycle convenu le 25 septembre 2026

GitHub et une CI hébergée ne sont pas utilisés comme conditions de poursuite.
L'agent réalise les contrôles et les interventions SSH ; l'utilisateur valide
chaque phase. Git local conserve les versions validées.

1. Diagnostiquer puis développer la phase autorisée.
2. Vérifier l'installation reproductible avec npm 11.19.1 (`npm ci`), le lint racine et
   mobile, le typage, les tests disponibles et le build.
3. Mettre la version à disposition sur le serveur par SSH et effectuer les
   contrôles adaptés : démarrage, endpoints et parcours de la phase.
4. Fournir le rapport de phase et les instructions de recette à l'utilisateur.
5. Après sa validation, créer le commit local et mettre à jour `AGENTS.md`.
   La phase suivante reste soumise à son autorisation.

Les validations serveur progressives ne remplacent pas la recette finale de
production prévue en Phase 12.

## Déploiement SSH et recette de Phase 1

La connexion à `u748819186@217.65.157.197`, port `65002`, sert au déploiement.
Node 24.19.0 est disponible dans `/opt/alt/alt-nodejs24/root/usr/bin` ; LiteSpeed
gère l'API persistante. Vitrine conservée, gestion sous `/gestion/`, API sous
`/api/`, secrets hors du répertoire public. Voir `serveur.md` pour la procédure
et `rapport-phase-1.md` pour les résultats du 28/09/2026 et la recette restante.

Préserver les données existantes et prévoir un retour à la version précédente
avant remplacement d'une application en service. Les secrets restent dans
l'environnement approprié, hors Git et hors rapports.

## Corrections et résultats du 25 septembre 2026

- Installation complète depuis le lockfile : réussie, dépendances synchronisées.
- ESLint 9.39.5 et configuration Expo 57.0.2 : lints racine et mobile réussis.
- Build et typage : réussis ; Expo Doctor : 21/21.
- Override `xcode → uuid@11.1.1` appliqué avec npm 11.19.1 : aucun signalement
  de vulnérabilité sur l'audit complet et l'audit production.
- Chargement `.env`, compatibilité xcode/uuid et démarrages API dev/compilé : vérifiés.
- Le lint mobile a nécessité une exécution hors sandbox Windows : son contrôle
  de casse des chemins remonte au dossier utilisateur, inaccessible dans la sandbox.
- La validation utilisateur de Phase 0 a été obtenue le 25/09/2026 ; la Phase 1
  est autorisée. Voir `AGENTS.md` pour le suivi et `rapport-phase-0.md` pour la recette.

`npm ci` exige un lockfile synchronisé avec les manifestes ; il n'exige ni
GitHub ni un dépôt distant. Le lockfile sera conservé dans les commits locaux.

## Actualisation du 8 octobre 2026

GitHub est désormais explicitement autorisé par l’utilisateur. Les sources serveur
ont été récupérées et la Phase 2 est poursuivie dans le dépôt. `npm test` couvre
maintenant aussi le Personnel, les photos et les contrats mobiles (66 tests).
La génération Prisma fonctionne depuis les sources. Pour une nouvelle base vide,
voir `database/baseline/README.md` ; ne pas utiliser cette baseline sur le serveur
historique. Rapport de livraison : `docs/rapport-phase-2-20261008.md`.
