# Phase 0 — rapport de remise en état du 25 septembre 2026

Les blocages techniques d'installation, de lint mobile et de configuration API
constatés lors du diagnostic sont corrigés. Les contrôles techniques sont réussis.
La validation utilisateur a été obtenue le 25/09/2026 avec l'autorisation de passer
à la Phase 1. Le commit local de clôture est réalisé avant son démarrage.
Ce rapport porte exclusivement sur les travaux de Phase 0.

## Corrections réalisées

- Synchronisation des manifestes et du lockfile ; installation effective de
  `eslint-config-expo@57.0.2`.
- Alignement ESLint / `@eslint/js` en 9.39.5, compatible avec les contraintes des
  plugins React et import fournis par Expo. ESLint 10 n'est pas encore déclaré
  compatible par ces plugins.
- Version npm de référence 11.19.1, minimum imposé par `engines` et
  `engine-strict=true`. npm 11.16 ignorait l'override à travers le workspace mobile.
  La version globale de npm sur le PC n'a pas été modifiée.
- Correction ciblée de `xcode → uuid@11.1.1`, sans changement de version majeure
  d'Expo, React ou React Native. Audit automatique réactivé dans `.npmrc`.
- Chargement natif Node des `.env` optionnels pour les scripts API `dev` et
  `start` : racine, puis service ; priorité finale aux variables du processus.
- Instructions d'installation et d'environnement corrigées pour chaque service.
- Dossier temporaire `.tmp` exclu du lint, comme des fichiers à versionner.
- Fonctionnement sans GitHub confirmé : agent pour le développement et les
  contrôles, utilisateur pour la recette, historique Git local et interventions SSH.

## Vérifications exécutées

Environnement : Windows, Node 24.18.0 ; installations et diagnostic de l'arbre
réalisés avec npm 11.19.1 via `npx`.

| Vérification | Résultat |
|---|---|
| `npx --yes npm@11.19.1 ci` | Réinstallation complète réussie : 787 paquets installés |
| `npx --yes npm@11.19.1 ls --depth=0` | Arbre valide, aucune dépendance manquante |
| `npx --yes npm@11.19.1 ls uuid` | `uuid@11.1.1 overridden` sous xcode |
| `npm run build` | Shared, UI, API, admin-web et typage mobile réussis |
| `npm run typecheck` | Réussi pour les cinq workspaces |
| `npm run lint` | Réussi |
| `npm run lint:mobile` | Réussi hors sandbox Windows |
| `npx --yes expo-doctor@latest` dans `apps/mobile` | 21/21 contrôles réussis |
| Audit complet pendant la réinstallation | 0 vulnérabilité signalée, 793 paquets audités |
| `npx --yes npm@11.19.1 audit --omit=dev` | 0 vulnérabilité signalée |
| Fichiers `.env` absents | Démarrage autorisé |
| `.env` racine puis service | Chargement et priorité du service vérifiés |
| Variables du processus | Prioritaires sur les deux fichiers |
| Transmission des options `.env` par tsx | Vérifiée |
| Compatibilité xcode/uuid | 100 identifiants de 24 caractères générés sans doublon |
| Correctif uuid | Écriture dans un buffer trop petit rejetée par `RangeError` |
| API compilée, injection Fastify | Réponse `/` conforme, route inconnue en 404 |
| API compilée, vrai serveur HTTP | `/` répond 200 |
| API en mode dev avec watcher tsx | `/` répond 200 |
| SSH | Connexion vérifiée en lecture seule |
| `git check-ignore services/api/.env` | Fichier privé bien ignoré |

Les contrôles ponctuels ont été exécutés avec les utilitaires Node intégrés,
dans `.tmp/verify-phase0.mjs` et `.tmp/smoke-runtime.mjs` (non versionnés).
Aucun framework de tests métier n'a été ajouté. Les serveurs de test ont été arrêtés.

## Fichiers concernés

- `package.json`, `package-lock.json`, `.npmrc` : dépendances et reproductibilité.
- `apps/mobile/package.json` : versions du lint compatibles Expo.
- `services/api/package.json` : chargement `.env` en dev et après compilation.
- `.env.example`, `apps/mobile/.env.example`, `README.md` : configuration documentée.
- `eslint.config.mjs` : exclusion des fichiers de diagnostic temporaires.
- `AGENTS.md`, `docs/ci-build.md`, `docs/serveur.md`, ce rapport : suivi et recette.
- `services/api/.env` : paramètres MySQL fournis par l'utilisateur, privés et ignorés
  par Git ; aucun secret copié dans les exemples ou la documentation.

## Base de données, serveur et limites

Les identifiants MySQL ont été conservés pour une utilisation ultérieure, conformément
à la demande de l'utilisateur. Aucune connexion à la base, migration, création de table
ou seed n'a été effectuée. L'existence de la base et ses droits ne sont pas confirmés.

SSH fonctionne sur la cible LYNE. Le client MySQL et le répertoire du sous-domaine
sont présents. Node/npm ne sont pas dans le PATH de la session SSH testée ; le mode
d'hébergement de l'API reste à examiner avant le premier déploiement. Aucun fichier
serveur n'a été modifié. Détails non sensibles dans `serveur.md`.

Le build mobile actuel reste un contrôle TypeScript : aucun APK ni essai sur
appareil réel n'a été réalisé. Les écrans sont les écrans de fondation Phase 0 ;
les modules métier et `/health` restent prévus à partir de la Phase 1.

ESLint 9 est signalé comme non maintenu par npm, mais demeure requis par les
contraintes des plugins Expo présents. Son remplacement sera à revalider lors
de leur compatibilité avec ESLint 10. npm signale aussi deux scripts d'installation
sans autorisation explicite enregistrée (`esbuild`, `unrs-resolver`) ; cela n'a pas
empêché la réinstallation ni les contrôles. Aucun contournement global n'a été ajouté.

## Recette et clôture

Depuis la racine : `npm run dev:api`, `npm run dev:admin-web` ou `npm run dev:mobile`
selon le client à essayer. L'API répond sur `http://localhost:4000/` par défaut.
Pour le démarrage compilé : `npm run build`, puis `npm start --workspace lyne-api`.
L'installation reproductible utilise `npx --yes npm@11.19.1 ci`.

Après validation explicite de l'utilisateur : créer le commit local de Phase 0,
mettre à jour le journal, puis commencer la Phase 1 lorsqu'elle est autorisée.

## Références techniques du correctif

- [Options de chargement `.env` de Node](https://nodejs.org/api/cli.html#--env-file-if-existsfile).
- [Configuration ESLint Expo](https://docs.expo.dev/guides/using-eslint/).
- [Correctif npm pour les overrides à travers les workspaces](https://github.com/npm/cli/pull/9671).
- [Avis de sécurité uuid corrigé en 11.1.1](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).
