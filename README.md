# LYNE RESTAURANT

**Système interne de gestion de restaurant** — caisse (POS), commandes, stock,
personnel, achats et finances.

- Cahier des charges : [`docs/cahier-des-charges/`](docs/cahier-des-charges/) (v1.0 — 23 sept. 2026)
- Charte UI : [`docs/charte-ui.md`](docs/charte-ui.md)
- Suivi des phases : [`AGENTS.md`](AGENTS.md)
- Vérifications & travail par SSH : [`docs/ci-build.md`](docs/ci-build.md)
- Rapport de Phase 0 : [`docs/rapport-phase-0.md`](docs/rapport-phase-0.md)
- Rapport et recette de Phase 1 : [`docs/rapport-phase-1.md`](docs/rapport-phase-1.md)
- Phase 2, harmonisation de connexion : [`docs/rapport-phase-2-login.md`](docs/rapport-phase-2-login.md)
- Informations serveur : [`docs/serveur.md`](docs/serveur.md)

## Organisation du travail

Décision du **8 octobre 2026** : les sources récupérées depuis le serveur sont
versionnées dans **brayanizzy/lynerestau** pour poursuivre le projet sans attendre
l'ordinateur d'origine. Cette décision remplace la suspension de Git ci-dessous.
La Phase 2 reste en cours ; voir le [rapport de reprise cloud](docs/rapport-reprise-cloud-20261008.md)
pour les contrôles actuels, la base locale et les limites de génération Prisma.

Historique des décisions précédentes :

Décision du 6 octobre 2026 : reprise par récupération des fichiers et
correction du socle, puis poursuite de la Phase 2 en privilégiant SSH.
Les commits Git sont temporairement suspendus ; l'historique existant reste
conservé pour récupération. Les sauvegardes, contrôles et validations de phase
restent nécessaires. Aucun dépôt distant n'est requis.

Le projet avance entre l'utilisateur et l'agent, phase par phase : l'agent
développe, teste et intervient sur le serveur par SSH ; l'utilisateur teste le
résultat et valide la phase avant la suivante. Git local conserve un commit par
phase validée. GitHub, un dépôt distant et une CI hébergée ne sont pas requis
(décision du 25 septembre 2026).

Les versions serveur permettent la recette au fil du développement ; la mise
en production finale reste soumise aux critères de la Phase 12.

## Architecture

Monorepo npm workspaces (TypeScript) :

```
apps/
  mobile/        # React Native + Expo (Android/tablette prioritaire)
  admin-web/     # Dashboard admin — React + Vite + TypeScript
services/
  api/           # API REST — Fastify + TypeScript (Node 24 LTS)
packages/
  shared/        # Types partagés + schémas Zod (source unique de vérité)
  ui/            # Design tokens / charte UI (couleurs, typographie, espacements)
database/
  migrations/    # Migrations SQL/Prisma (Phase 1+, non destructives)
  seed/          # Données de démonstration (Phase 1+)
docs/
  cahier-des-charges/   # Référentiel projet (texte extrait)
  api/                  # Documentation API (Phase 1+)
```

## Prérequis

- Node.js **24 LTS** (`.nvmrc`) + npm **11.19.1+** (version de référence : 11.19.1)
- MySQL **8+** (requis à partir de la Phase 1)
- Pour le mobile : Expo CLI + application **Expo Go** sur l'appareil
  (fichier `apps/mobile/AGENTS.md` pour les règles Expo)

## Installation & démarrage

```bash
# 1. Ouvrir un terminal dans le dossier du projet
npx --yes npm@11.19.1 ci  # version corrigée, sans changer npm globalement

# 2. Pour chaque fichier ABSENT uniquement (PowerShell ; copy → cp sous Unix)
copy services/api/.env.example services/api/.env
copy apps/admin-web/.env.example apps/admin-web/.env
copy apps/mobile/.env.example apps/mobile/.env

# 3. Vérifier que tout construit / typecheck / lint
npm run build
npm run typecheck
npm run lint
npm run lint:mobile

# 4. Lancer un service en développement
npm run dev:api          # API Fastify → http://localhost:4000
npm run dev:admin-web    # Dashboard → http://localhost:5173
npm run dev:mobile       # Expo (QR code / émulateur)
```

Adapter les fichiers `.env` créés. Ne pas recopier les exemples par-dessus un
fichier déjà configuré. L'API charge le `.env` racine s'il existe, puis celui de
`services/api` ; ce dernier est prioritaire. Les variables déjà définies dans
le processus (par exemple sur le serveur) restent prioritaires sur les fichiers.
Ce chargement s'applique à `npm run dev:api` et à
`npm start --workspace lyne-api` après le build.

Si `npm --version` indique au moins 11.19.1, `npm ci` peut être utilisé directement.
Pour modifier les dépendances avec une ancienne version globale, utiliser
`npx --yes npm@11.19.1 install`. npm 11.16 ignore certains overrides dans les
workspaces ; la version minimale évite de réintroduire une dépendance vulnérable.

Vite et Expo chargent les fichiers `.env` de leur propre application. Le modèle
racine recense toutes les variables ; il ne configure pas automatiquement ces
deux clients. Seules les variables publiques `VITE_*` et `EXPO_PUBLIC_*` sont
destinées aux clients. Sur un téléphone, remplacer `localhost` dans l'URL API
par l'adresse réseau du PC ou l'URL du serveur accessible depuis l'appareil.

Le mobile consomme désormais les contrats de `@lyne/shared` compilés dans
`dist`. `npm run dev:mobile` construit ce paquet avant de démarrer Expo.

## Recette de Phase 1

La [vitrine publique](https://lyne-restau.alikakonnect.com/) est conservée.
Son bouton de pied de page **Se connecter** ouvre
[l'espace de gestion](https://lyne-restau.alikakonnect.com/gestion/).
L'état de l'API et de la base est disponible sur
[`/health`](https://lyne-restau.alikakonnect.com/health).

- Identifiant initial : `admin`.
- Mot de passe initial : fichier local privé `services/api/.env.seed`, ignoré
  par Git. Ne pas le joindre à un rapport ni le publier avec le site.
- Au premier accès, choisir un nouveau mot de passe d'au moins 12 caractères,
  puis se reconnecter : le changement révoque les sessions existantes.
- La Phase 1 comprend l'authentification et la consultation autorisée des
  comptes, rôles et événements d'audit, pas encore le CRUD personnel ou menu.

L'API est exécutée par LiteSpeed ; son fonctionnement ne dépend pas du maintien
de la connexion SSH. La procédure de déploiement privé est dans
[`docs/serveur.md`](docs/serveur.md). L'utilisateur valide la recette avant
le commit de clôture et l'autorisation de Phase 2.

## Ports & conventions

| Service | Port par défaut |
|---|---|
| API (Fastify) | `4000` |
| Admin web (Vite) | `5173` |
| Mobile (Expo/Metro) | `8081` |

- Variables : préfixes `API_*` / `VITE_*` / `EXPO_PUBLIC_*` (voir `.env.example`).
- Version d'API : `/api/v1` (contrats développés à partir de la Phase 1).

## Plan de développement (spec §12)

| Phase | Objet | Statut |
|---|---|---|
| 0 | Cadrage & fondations | Validée par l'utilisateur le 25/09/2026 |
| 1 | Base de données & API socle (auth, RBAC, audit) | Passage à la Phase 2 validé le 28/09/2026 ; réserves de recette tracées |
| 2 | Personnel & administration | Autorisée le 28/09/2026 ; harmonisation de la connexion en premier |
| 3 | Menu / Produits | à venir |
| 4 | Commandes | à venir |
| 5 | Caisse, paiements & impression | à venir |
| 6 | Stocks | à venir |
| 7 | Achats & fournisseurs | à venir |
| 8 | Finances | à venir |
| 9 | Dashboard & rapports | à venir |
| 10 | Notifications & audit renforcé | à venir |
| 11 | QA, sécurité & optimisation | à venir |
| 12 | Production & formation | à venir |

## Règles d'engagement (rappel)

- Une phase est développée, testée, documentée puis **validée** avant la suivante.
- Code versionné avec Git ; un commit clair clôture chaque phase validée.
- Aucune donnée financière/stock/audit supprimée silencieusement (RG-08).
- Totaux calculés **côté serveur** (RG-03).

### Personnel — livraison du 8 octobre 2026

Personnel mobile, photos privées et cartes natives complètent le web/API.
Installation neuve : `npm run db:bootstrap` puis `npm run db:seed`, uniquement
sur une base vide. [Rapport, preuves et recette de Phase 2](docs/rapport-phase-2-20261008.md).
La recette physique et l’historique de migration serveur restent à finaliser.
