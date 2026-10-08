# Phase 1 — rapport de livraison en recette

**28 septembre 2026 — déployée ; passage à la Phase 2 validé par l'utilisateur.**
Après livraison, l'utilisateur a demandé « on continue la phase deux ».
Le commit local de clôture conserve le socle livré avant les changements de
Phase 2. Les essais utilisateur non attestés et l'avis mobile restent des
réserves documentées, sans être déclarés réussis.

## Résultat livré

La vitrine et les vraies images de la cliente sont conservées. Le nouveau
bouton **Se connecter**, en pied de page, ouvre
[la gestion LYNE](https://lyne-restau.alikakonnect.com/gestion/).
La connexion utilise maintenant la vraie base MariaDB du serveur.

Le dernier choix utilisateur est appliqué : développement et déploiement par
SSH, sans GitHub ni manipulation hPanel requise. La séparation retenue est
par chemins (`/gestion/` et `/api/`), pas par nouveau sous-domaine.

### Périmètre

- Schéma Prisma non destructif, comptes, rôles, permissions, sessions, audit.
- Seed administrateur idempotent et quatre rôles de référence.
- Authentification web/mobile, déconnexion et changement du mot de passe.
- Autorisations contrôlées par l'API ; comptes, rôles et audit en consultation.
- `/health`, OpenAPI et Swagger à accès contrôlé.
- Interfaces web et Expo pour la connexion et le changement initial obligatoire.
- Pas de CRUD personnel/menu, commandes, paiements ou finances dans cette phase.

### Sécurité du socle

Mots de passe hachés Argon2id. Sessions opaques dont seule l'empreinte est
stockée en base ; cookie web `__Host-lyne_session`, HttpOnly, Secure et
SameSite=Strict en HTTPS. Jeton mobile conservé dans SecureStore.
Révocation à la déconnexion et de toutes les sessions au changement du mot de
passe. Contrôle d'origine des mutations web, limitation des tentatives,
réponses d'erreur génériques et journalisation des opérations de sécurité.

Le changement du mot de passe initial est obligatoire avant les consultations.
Les rôles autres qu'administrateur n'ont pas encore de permissions métier ;
leur administration appartient aux phases suivantes.

## Déploiement réalisé

Node 24.19.0, Fastify 5, Prisma 7.10.0 et MariaDB 11.8.9. LiteSpeed lance
la release `/home/u748819186/lyne-app/phase1-20260928` avec un chargeur
CommonJS qui importe le build ESM. La santé, la connexion et la déconnexion
HTTPS ont été revérifiées après fermeture de SSH : le service en est indépendant.

Les paramètres MySQL et le secret initial ont été transférés uniquement après
accord explicite vers le dossier privé autorisé. Fichiers `.env`, `.env.seed`
et `.env.runtime` en mode 600, parent en mode 700 ; aucun secret dans le web
ou Git. Les URL de fichiers privés testées renvoient 403/404.

Sauvegardes avant migration, seed et remplacement de la vitrine ; aucune
suppression de données métier ou d'audit. Le point de diagnostic temporaire
est retiré du site public et conservé en privé. Détails et procédure de
retour applicatif dans [serveur.md](serveur.md).

## Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| Vitest (`npm test`) | 19 tests réussis |
| Build shared, UI, API, web et typage mobile | Réussi |
| `npm run typecheck` | Réussi sur toutes les workspaces |
| Lint racine et Expo | Réussis |
| Expo Doctor | 21/21 |
| Export Android (`expo export --platform android`) | Réussi, 1 251 modules ; ce n'est pas un essai sur appareil |
| Installation de la release sur serveur (`npm ci --omit=dev`) | Réussie |
| Seed sur vraie base | Compte initial créé, réexécution idempotente, droits administrateur vérifiés |
| Contrôle réel DB | Santé, connexion, session, blocage initial, déconnexion/révocation réussis |
| HTTPS après déconnexion SSH | Santé 200, base `up`, authentification web et mobile réussies |
| Cookie web | Secure, HttpOnly, SameSite=Strict ; aucun jeton dans le JSON |
| Contrôle initial / origine / révocation | Accès métier bloqué avant changement, origine étrangère refusée, session déconnectée refusée |
| Navigateur | Clic du bouton de vitrine vers la connexion ; mise en page desktop/mobile ; mauvais identifiants refusés en français |
| Affichage mobile de connexion | Largeur 390 px, aucun débordement horizontal ; taille normale restaurée après contrôle |
| Confidentialité publique | `.env` en 403 ; package serveur et ancien diagnostic en 404 |
| Hygiène locale | Fichiers secrets et `.tmp` ignorés, `git diff --check` réussi |

Les tests isolés couvrent notamment la validation, les autorisations, les
sessions et le changement du mot de passe. Les contrôles réels n'ont pas
changé le mot de passe initial : cette première action reste à l'utilisateur.
Les événements et sessions de vérification restent traçables dans la base.

### Dépendances

Corrections installées et vérifiées : Vitest 4.1.11, adaptateur MariaDB avec
`mariadb` 3.4.7, `deepmerge-ts` 8.0.2 pour Prisma Config, `mysql2` 3.24.4
pour les outils Prisma. L'override xcode/uuid de Phase 0 est conservé.

- Audit des dépendances de la release API : **aucun signalement**.
- Audit du monorepo : **trois paquets signalés modérés**, liés au même avis
  [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
  sur `decode-uri-component`, via `query-string` et Expo Router.
- Le correctif disponible modifie la compatibilité de modules ; aucun override
  aveugle ni rétrogradation d'Expo Router n'a été appliqué. À traiter avec une
  combinaison compatible et une nouvelle recette mobile. Ce chemin de
  dépendances n'est pas inclus dans la release API déployée.

## Recette utilisateur pour clôturer

1. Ouvrir la vitrine et cliquer sur **Se connecter** en bas de page.
2. Utiliser l'identifiant `admin`. Le mot de passe initial se trouve dans le
   fichier local privé `services/api/.env.seed`, sous `SEED_ADMIN_PASSWORD`.
   Ne pas partager ce fichier ni utiliser le mot de passe SSH/MySQL comme
   mot de passe applicatif.
3. Choisir et confirmer personnellement un nouveau mot de passe de 12 à
   128 caractères. Après la confirmation, se reconnecter avec ce nouveau mot
   de passe ; les sessions précédentes sont révoquées.
4. Vérifier Vue d'ensemble, Comptes, Rôles & accès, Journal d'audit et
   Documentation API. Les écrans sont en consultation pour cette phase.
5. Se déconnecter puis recharger la page : les données internes ne doivent
   plus être consultables sans authentification.
6. Faire un essai sur téléphone/tablette Android : `npm run dev:mobile`,
   ouvrir le QR code dans un environnement Expo compatible, vérifier
   connexion, restauration de session après retour dans l'application et
   déconnexion. L'URL publique API est configurée localement dans le `.env`
   mobile ; aucun secret n'est embarqué.
7. Signaler les éventuels défauts, puis valider explicitement la Phase 1 pour
   son commit local de clôture et autoriser la Phase 2.

## Limites et points à suivre

- Recette du compte réel après changement initial et essai Android réel non
  encore réalisés par l'utilisateur. Un export réussi ne prouve pas un parcours
  natif complet ; aucun test iOS sur appareil n'a été réalisé.
- Avis de dépendance mobile modéré restant, à suivre avant diffusion mobile.
- Aucune promesse de disponibilité ou supervision longue durée : le processus
  géré et son indépendance de SSH sont vérifiés, pas la tenue sous charge.
- Sauvegardes ponctuelles présentes ; automatisation, rétention, restauration
  testée et durcissement de production restent prévus en Phases 11/12.
- Les secrets SSH/MySQL communiqués en conversation sont à renouveler avec
  l'utilisateur ; aucun changement non sollicité de ces accès n'a été fait.
- La validation de la vitrine par la cliente et la validation finale de
  production ne sont pas remplacées par ce rapport.

**Conclusion : socle de Phase 1 livré ; passage à la Phase 2 explicitement
autorisé par l'utilisateur, avec les réserves ci-dessus conservées.**
