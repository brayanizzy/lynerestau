# AGENTS.md — LYNE RESTAURANT

Journal de suivi du développement incrémental (spec §0, §13).

> **Règles absolues** : travailler uniquement sur la phase autorisée · valider
> une phase avant de commencer la suivante · diagnostics avant code · aucune
> donnée sensible supprimée silencieusement · totaux calculés côté serveur ·
> rapport de fin de phase + commit clair après validation.

---

## Contexte technique

| Élément | Choix validé | Réf. |
|---|---|---|
| Monorepo | npm workspaces (Node 24, npm ≥11.19.1 ; référence 11.19.1) | Phase 0 |
| API | Fastify 5 + TypeScript | Phase 0 (spec §6) |
| DB | MySQL 8+, ORM **Prisma** (Phase 1) | spec §6 |
| Validation | Zod 4 (`@lyne/shared`) | spec §6 |
| Web admin | React 19 + Vite 8 + TS | Phase 0 (spec §6) |
| Mobile | Expo SDK 57 / RN 0.86 / TS 6 | Phase 0 |
| Charte UI | Tokens dans `@lyne/ui`, palette par défaut éditable | Phase 0 |
| CI | **Non activée par choix** ; validations exécutées par l'agent, sans GitHub | décision utilisateur du 25/09/2026 |
| Git | Sources récupérées du serveur et versionnées dans `brayanizzy/lynerestau` | décision utilisateur du 08/10/2026 |
| Serveur | Déploiements SSH ; API Node 24 gérée par LiteSpeed ; vitrine et gestion séparées par chemins | décisions des 25 et 28/09/2026 |

### Reprise depuis le serveur — décision du 08/10/2026

- L'utilisateur demande de poursuivre sans attendre son ordinateur : récupérer
  les sources du serveur, les versionner dans GitHub, puis continuer phase par
  phase. Cette décision remplace la suspension temporaire de Git du 6 octobre.
- Sources importées depuis `source-recovery-20261006.tar.gz` ; comparaison avec
  `phase2-recovery-20261006-final.tar.gz`. Aucun historique `.git` dans l'archive :
  l'historique déjà présent sur GitHub est conservé, sans inventer les anciens commits.
- La Phase 2 reste ouverte. Son SQL de migration historique manque toujours ;
  ne pas modifier l'historique de la base en ligne ni appliquer sa reconstruction
  une deuxième fois. Le Personnel mobile et la recette réelle restent à compléter.
- Les contrôles cloud utilisent une base locale isolée avec données de test.
  Les résultats de 2026-09/10 ci-dessous sont historiques, pas des contrôles actuels.
- État et validations actuels : `docs/rapport-reprise-cloud-20261008.md`.

### Fonctionnement validé le 25/09/2026

- L'utilisateur pilote et valide les phases ; l'agent réalise le développement,
  les tests et les interventions serveur via SSH.
- GitHub, un dépôt distant et une CI hébergée ne sont pas des prérequis pour
  continuer ni pour clôturer une phase. Git local conserve l'historique avec
  un commit après validation de chaque phase.
- Pour chaque phase autorisée : diagnostic, développement, contrôles locaux
  et serveur applicables, mise à disposition pour recette, rapport, puis
  validation utilisateur avant de commencer la suivante.
- Les versions présentées sur le serveur servent à la recette progressive ;
  la validation de mise en production reste prévue en Phase 12.
- Cette décision remplace l'attente d'un dépôt privé distant mentionnée dans
  le cadrage initial. Les exigences de tests et de protection des données restent
  applicables.

### Reprise autorisée le 06/10/2026

- L'utilisateur demande de récupérer les fichiers manquants et de corriger
  le socle avant de poursuivre le développement, en privilégiant SSH.
- À sa demande, Git est laissé de côté temporairement pour le travail courant
  et les commits. Son historique existant peut servir à récupérer les fichiers ;
  aucun commit, dépôt distant ou travail de branche n'est requis pour cette reprise.
  Cette décision remplace temporairement l'exigence de commit de clôture.
- Les sauvegardes, tests, rapports et validations de phase restent nécessaires.
  La Phase 2 est autorisée ; les phases suivantes commencent après validation
  de la phase précédente.
- Sauvegarde privée préalable : `.tmp/recovery-20261006-346be2f7/`.
  Les 74 fichiers suivis absents ont été récupérés sans écraser les fichiers
  présents. Le rapport du lot connexion a aussi été récupéré.
- Le serveur répond encore avec l'API Phase 1. La release compilée de Phase 2
  est conservée sous `.tmp/phase2-20260928/` ; elle ne constitue pas une preuve
  de livraison ou de recette du Personnel. Toute migration et publication
  serveur doit être précédée des contrôles applicables et d'une sauvegarde.

---

## Phase 0 — Cadrage & fondations (validée le 25/09/2026)

### Livrables
- [x] Arborescence monorepo (`apps/`, `services/`, `packages/`, `database/`, `docs/`)
- [x] `.env.example` global + par service
- [x] `README.md` (installation/init)
- [x] `AGENTS.md` (ce journal)
- [x] Charte UI de base : `packages/ui` (design tokens) + `docs/charte-ui.md`
- [x] Build/lint/typecheck locaux (scripts npm à la racine)
- [x] Cahier des charges présent : `docs/cahier-des-charges/` (texte extrait v1.0 ; commit après validation)

### Décisions techniques
1. **Fastify** retenu (pas Express) — validation schema intégrée, alignée Zod.
2. **Pas de GitHub ni de CI hébergée requis** — développement avec l'agent,
   validation utilisateur et interventions serveur par SSH ; Git local pour
   l'historique. Procédure dans `docs/ci-build.md`.
3. **Charte UI par défaut éditable** — client n'a pas fourni logo/couleurs
   (spec §15) ; tokens centralisés, remplaçables en un fichier.
4. **Exports `@lyne/*` → src** (`packages/shared|ui`) : idéal pour Vite et tsx.
   ⚠️ À **revoir en Phase 1** : passer sur `dist` + ordre de build pour la
   consommation runtime de l'API (compilation `tsc` → `node dist`).
5. **Mobile découplé des workspaces en Phase 0** — éviter la config Metro
   (transpilation de sources TS d'autres workspaces) ; consommera
   `@lyne/shared` (dist) avec config Metro dédiée dès qu'il en aura besoin.
6. **Alignement React 19.2.3** entre mobile (pin Expo) et admin-web (pin
   identique) pour un seul exemplaire de `react` dans l'arbre npm.
7. **Aucun framework de test en Phase 0** (aucune logique métier) — **Vitest**
   introduit en Phase 1 (unitaires métier + intégration API).
8. **Pas de migration/seed en Phase 0** — `database/migrations|seed` réservés
   à la Phase 1 (migrations non destructives, RG-08).
9. **ESLint 9.39.5 partagé** — les plugins React/import d'Expo 57 ne déclarent
   pas la compatibilité ESLint 10. Rester en 9 jusqu'à leur compatibilité vérifiée.
10. **npm 11.19.1 minimum** — corrige la propagation des overrides à travers
    les workspaces. Utilisable via `npx --yes npm@11.19.1` sans mise à jour globale.
11. **Override limité à `xcode → uuid@11.1.1`** — correction de l'avis
    GHSA-w5hq-g745-h8pq ; Expo 57 et React Native 0.86 conservés.
12. **Environnement API** — scripts dev/start avec chargement natif Node des
    fichiers optionnels : racine puis service ; l'environnement du processus
    reste prioritaire. Web et mobile utilisent leur propre `.env`.

### Vérifications

Résultats du 25/09/2026 après correction ; rapport : `docs/rapport-phase-0.md`.

- [x] Installation corrigée avec npm 11.19.1
- [x] `npx --yes npm@11.19.1 ci` — réinstallation complète réussie
- [x] `npm run build`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run lint:mobile`
- [x] Expo Doctor — 21/21
- [x] Arbre npm valide ; `uuid@11.1.1` effectivement appliqué
- [x] Audit complet et production — 0 vulnérabilité signalée
- [x] Chargement `.env` : fichiers absents, racine, service et priorité du processus
- [x] Compatibilité xcode/uuid ; API Phase 0, HTTP 200 en modes dev et compilé
- [x] Connexion SSH en lecture seule
- [x] Validation finale de la Phase 0 par l'utilisateur — accord pour passer à la Phase 1 le 25/09/2026
- [x] Commit local de clôture : `6405dec`

### Points restants / risques
- Modèle exact de mini-imprimante à confirmer (spec §6/§15) avant Phase 5.
- Données initiales client manquantes (logo, personnel, menu, fournisseurs…) :
  demander en amont des phases concernées (spec §15).
- Connexion SSH vérifiée : `u748819186@217.65.157.197:65002`. Le client MySQL
  est présent ; Node/npm ne sont pas dans le PATH testé. Vérifier l'environnement
  Node et le mode d'exécution persistant avant déploiement API (voir `docs/serveur.md`).
- Informations MySQL enregistrées pour plus tard à la demande de l'utilisateur :
  valeurs privées dans `services/api/.env`, ignoré par Git ; aucune connexion DB
  ni migration effectuée. L'existence de la base et ses droits restent à vérifier
  en Phase 1. Aucun hébergement de dépôt Git distant n'est requis.

---

## Phases suivantes (spec §12)

### Phase 1 — passage à la Phase 2 validé le 28/09/2026, réserves tracées

Plan : schéma Prisma/MySQL non destructif (comptes, rôles, permissions,
sessions et audit), seed admin idempotent, authentification et autorisations
côté API, `/health`, documentation OpenAPI, connexion web/mobile et tests Vitest.
Pas de CRUD personnel/menu ni d'opérations financières dans cette phase.

Diagnostic et intervention du 28/09/2026 : Node 24.19.0 dans
`/opt/alt/alt-nodejs24/root/usr/bin`, MariaDB 11.8.9 (connecteur Prisma MySQL),
migration socle appliquée et seed administrateur exécuté sur le serveur.
L'idempotence du seed et le fonctionnement avec la vraie base sont vérifiés.

À la demande la plus récente de l'utilisateur, le déploiement utilise uniquement
SSH et conserve la vitrine : bouton de pied de page « Se connecter », gestion
sous `/gestion/` et API sous `/api/` sur le même domaine. Cette solution remplace
le sous-domaine de gestion envisagé ; ni hPanel ni GitHub ne sont nécessaires.
LiteSpeed gère le processus Node avec les directives Passenger vérifiées sur
cet hébergement. Code et secrets sont hors du site public ; le transfert des
paramètres MySQL et du secret initial a été explicitement autorisé par l'utilisateur
vers `/home/u748819186/lyne-app/`. Les trois fichiers de configuration ont le mode 600.

Les sessions sont des jetons opaques révocables, dont seule l'empreinte est
stockée en base : cookie HttpOnly pour le web, stockage sécurisé pour le mobile.
Ce choix respecte l'option sessions/token du cahier des charges.

Contrôles : 19 tests Vitest réussis, build et typage complets, lints racine/mobile,
Expo Doctor 21/21, export Android, vérification réelle MySQL, connexion HTTPS
web/mobile, changement initial obligatoire, révocation à la déconnexion,
contrôle d'origine et `/health` fonctionnels. Page de connexion vérifiée dans
le navigateur, dont affichage mobile et refus des identifiants incorrects.

Audit des dépendances du livrable API : aucun signalement. L'arbre complet
conserve un avis modéré mobile (`decode-uri-component` via Expo Router,
trois paquets affectés), documenté sans imposer de mise à jour incompatible.

Rapport et recette : `docs/rapport-phase-1.md`. L'utilisateur a explicitement
demandé de continuer la Phase 2 le 28/09/2026. Cet accord valide le passage de
phase ; il ne constitue pas une preuve d'essai Android réel ou de changement
du mot de passe. Ces réserves restent tracées. Les constats Phase 0 ci-dessus
restent historiques. Commit local de clôture : `fb2344f`.

### Phase 2 — autorisée le 28/09/2026, en cours

Lancement officiel confirmé par l'utilisateur après livraison du login.
Diagnostic et plan d'exécution : `docs/plan-phase-2.md`.

L'utilisateur demande de poursuivre la Phase 2 et de commencer par harmoniser
la connexion selon sa référence visuelle, avec les couleurs de l'entreprise.

Premier lot : charte rouge/noir/blanc du logo et de la vitrine, connexion à
deux panneaux arrondis, formulaire responsive, logo existant et bouton
afficher/masquer le mot de passe. Aucun changement des comptes, sessions,
permissions ou règles de mot de passe ; pas de migration dans ce lot.

Build, typage, lint et 24 tests réussis ; inspection desktop/tablette/mobile
et publication SSH avec sauvegarde du web précédent. Rapport du lot :
`docs/rapport-phase-2-login.md`. L'API reste le socle Phase 1 ; cette livraison
visuelle ne clôture pas la Phase 2.

Suite de la phase : diagnostic et schéma non destructif pour employés,
fonctions et services ; CRUD et comptes associés avec permissions serveur,
statuts employé/compte distincts (RG-11), photos privées et cartes imprimables ;
tests, déploiement SSH et recette avant clôture. Aucun module Personnel n'est
déclaré livré par la seule harmonisation de connexion.

| Phase | Objet | Livrable / porte de sortie |
|---|---|---|
| 1 | Base de données & API socle | Login fonctionnel, seed admin, RBAC testé, `/health` OK |
| 2 | Personnel & administration | CRUD personnel complet, permissions, carte imprimable |
| 3 | Menu / Produits | Catalogue exploitable par la réception |
| 4 | Commandes | Flux Nouvelle→Préparation→Prête→Servie testé |
| 5 | Caisse, paiements & impression | Commande payée → ticket sans doublon financier |
| 6 | Stocks | Stock traçable et alertes fonctionnelles |
| 7 | Achats & fournisseurs | Validation achat → stock + finance une seule fois |
| 8 | Finances | Chiffres cohérents avec ventes/paiements/achats |
| 9 | Dashboard & rapports | Rapports vérifiés contre données source |
| 10 | Notifications & audit renforcé | Actions sensibles consultables, alertes pertinentes |
| 11 | QA, sécurité & optimisation | Zéro bug bloquant ; restauration testée |
| 12 | Production & formation | Production accessible, sauvegardes actives, PV de recette |

---

## Vitrine publique — livraison du 28/09/2026

À la demande explicite de l'utilisateur, les sept visuels fournis dans `images/`
ont été intégrés et publiés sur https://lyne-restau.alikakonnect.com/ pour
présentation à la cliente. Source conservée dans `website/`, conversion WebP
(environ 90 % de poids économisé), originaux intacts, sauvegarde privée de
l'ancienne version et remplacement atomique du HTML via SSH.

Contrôles locaux et HTTPS public réussis : huit ressources image (dont le logo),
affichage 1440/768/390/320 px, menu mobile, absence d'erreurs JavaScript/HTTP et
liens de contact. Rapport : `docs/rapport-vitrine-20260928.md`.

Cette livraison ne clôture pas la Phase 1 de gestion ; aucune intervention sur
la base ou l'API n'a été réalisée pour la vitrine. Validation cliente en attente.

---

## Commandes de référence

```bash
npm run build        # build shared → ui → api → admin-web + typecheck mobile
npm run typecheck    # tsc --noEmit partout (y compris Expo)
npm run lint         # ESLint racine (shared/ui/api/admin-web)
npm run lint:mobile  # expo lint
npm run dev:api      # Fastify sur :4000
npm run dev:admin-web# Vite sur :5173
npm run dev:mobile   # Expo
```

Voir aussi : `README.md`, `docs/charte-ui.md`, `docs/ci-build.md`, `database/README.md`.

## Actualisation du 8 octobre 2026 — Personnel mobile et base neuve

À la demande « terminons la phase 2 », le Personnel mobile (CRUD, références,
compte associé, photo privée, carte native, archives et permissions) est développé.
Le web conserve la gestion complète des comptes et rôles. 66 tests, builds,
types, lints, génération officielle Prisma, export Android et intégration sur
MariaDB réelle locale réussissent. Rapport : `docs/rapport-phase-2-20261008.md`.

`db:bootstrap` initialise seulement une base vide avec `database/baseline` ;
`db:deploy:baseline` vérifie cet historique. Le serveur historique reste protégé
par `db:check-history` : son SQL original Personnel est toujours manquant.
Ne pas appliquer la baseline à la production. Aucun déploiement distant dans ce lot.
La recette sur appareil, l’impression physique, la réconciliation historique et
la validation utilisateur restent des réserves de clôture ; pas de Phase 3.

## Décision du 9 octobre 2026 (heure de Lubumbashi) — livraison continue demandée

L’utilisateur autorise désormais GitHub puis le déploiement en ligne après les
contrôles, et demande la réconciliation contrôlée des migrations pour terminer
la Phase 2 avant le passage à la Phase 3. Il ne faut pas redemander l’autorisation
de chaque déploiement déjà compris dans ce périmètre. Cette décision remplace
l’ancienne restriction de travail sans GitHub/CI comme mode imposé.

Accès SSH refusé depuis le cloud avant authentification ; l’utilisateur dispose
seulement du gestionnaire de fichiers. Paquet complet avec dépendances préparé
et testé après extraction, mais aucune activation distante ni migration réalisée.
Le web public est identique au build courant ; les nouveaux écrans sont mobiles.
Voir `docs/deploiement-hostinger-20261009.md` pour les preuves, le transfert manuel
possible, le diagnostic privé et les prérequis réseau/Android restants.

Précision immédiate de l’utilisateur : le projet reste dans le navigateur pour
le moment. Différer les livraisons Expo/Android ; ne pas bloquer la Phase 2 web
sur un APK ou une recette native. Valider le web responsive et les parcours API.

Recette navigateur locale complète réussie (11 groupes de parcours), dont compte
lecture seule, photo, PDF et écran 390 px. Comptes synthétiques désactivés et fiches
archivées après les essais ; administrateur initial inchangé. Le blocage restant
est l’intervention effective sur le serveur et son historique, pas un APK.

Après publication réseau, API GitHub accessible et diagnostic Actions déclenché.
Run `37855100663` refusé avant toute étape : compte GitHub verrouillé pour problème
de facturation. Workflow manuel conservé dans `.github/workflows/hostinger-diagnostic.yml`.
Ne pas confondre cet échec avec un test SSH négatif : aucun runner n’a démarré.
Attendre la levée du verrouillage avant de relancer ; aucun déploiement Hostinger
ni aucune réconciliation DB n’a eu lieu. Les secrets Actions sont inaccessibles
à l’intégration (HTTP 403), même si le dépôt et le déclenchement sont autorisés.

## Déploiement GitHub direct Hostinger — 9 octobre 2026

L'utilisateur a relié `main` à `public_html` via le déploiement générique hPanel
(Composer, aucun réglage Node). Cela publie les sources : accueil 403,
gestion/santé 404, `/website/` et `/package.json` 200. Préparer et publier
`hostinger-web` avec uniquement les fichiers publics compilés et le routage vers
la release privée Phase 2 documentée. Conserver les changements source sur
`setup-hostinger` tant que hPanel suit `main`, pour éviter une nouvelle publication
du monorepo. Ensuite intégrer cette branche source dans `main`.

Procédure : `docs/hostinger-github-web.md`. L'utilisateur doit sélectionner
`hostinger-web` dans hPanel puis redéployer ; contrôler HTTPS après activation.
La compilation et les contrôles navigateur locaux passent. Aucun accès serveur
retrouvé ni migration réalisée ; ce canal ne livre pas l'API privée. Le périmètre
reste navigateur et Phase 2 jusqu'à résolution des réserves serveur.

## Validation utilisateur et lancement Phase 3 — 9 octobre 2026

L'utilisateur demande explicitement de clôturer la Phase 2 et de lancer la Phase 3.
Le déploiement `hostinger-web` est désormais confirmé en HTTPS : vitrine/gestion
200, santé DB Phase 2 200, session anonyme 401, ancien package source 404.
La Phase 2 est validée fonctionnellement, avec réserves techniques tracées dans
`docs/cloture-phase-2-20261009.md`. Cette nouvelle décision autorise le développement
de la Phase 3 malgré ces réserves ; ne pas présenter l'historique serveur comme
réconcilié ni appliquer la baseline à la base historique.
Périmètre Phase 3 : catalogue navigateur, catégories, produits, prix audités,
disponibilité, statut et photos. Aucune commande/paiement/stock dans ce lot.
Conserver GitHub/Hostinger pour le web ; API privée et migrations nécessitent
une livraison compatible avant activation du catalogue en ligne.

Catalogue Phase 3 implémenté : catégories/produits, prix décimaux et historique
transactionnel, disponibilité effective, photos privées, permissions et versions.
84 tests, builds/types/lint, évolution MariaDB et installation neuve, intégration
Personnel et Menu, recette navigateur et lecture seule réception réussissent.
Le web vérifie `/api/v1/capabilities` avant d'afficher le catalogue ; il reste
compatible avec l'API Phase 2 en ligne. Rapport : `docs/phase-3-menu-20261009.md`.
Migrations locales uniquement ; catalogue serveur non activé, Phase 3 non clôturée.

Publication confirmée : source `23cf4f7` sur main, web `1bae3ff` sur hostinger-web,
manifeste et empreintes HTTPS conformes, accueil/gestion 200. API serveur toujours
Phase 2, DB disponible, session anonyme 401. L'utilisateur confirme l'accès à
phpMyAdmin ; prochaine étape : `database/diagnostics/hostinger-phase3-readonly.sql`,
puis sauvegarde/restauration isolée et réconciliation avant activation API/Menu.
