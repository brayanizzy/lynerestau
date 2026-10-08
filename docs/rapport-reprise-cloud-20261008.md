# Reprise depuis les archives du serveur — 8 octobre 2026

## Objectif et provenance

L'utilisateur autorise la récupération du code serveur dans GitHub, puis la poursuite de la Phase 2 sans attendre l'ordinateur d'origine. Les décisions antérieures de suspension de Git sont remplacées. Aucun passage à la Phase 3 n'est validé par cette reprise.

Deux archives ont été fournies :

| Archive | SHA-256 |
|---|---|
| `source-recovery-20261006.tar.gz` | `bbdb620ef69f333084e9e1eaa138782f6de89a72be7c4901aba8fe31499069f3` |
| `phase2-recovery-20261006-final.tar.gz` | `3c5ea8f935d8c0a5c9942c5bcec4a7995a2413a67489ce3df068cd47409cb4ff` |

La seconde empreinte correspond au rapport du 6 octobre. Les archives ne contiennent ni historique `.git`, ni `.env` de production. Seuls les exemples de configuration sont inclus dans les sources. Les chemins et types de fichiers ont été contrôlés avant extraction ; aucune archive n'a été extraite sur le serveur.

Les 135 fichiers source récupérés sont conservés dans un commit d'import distinct. L'historique initial du dépôt GitHub est préservé. Le HTML, le JavaScript et le CSS de gestion de la release correspondent aux ressources publiques récupérées le 8 octobre. Cette comparaison ne vérifie pas les fichiers privés actuellement exécutés côté serveur.

## Correction effectuée

Le nouvel audit signale `GHSA-pqg4-j6r4-53mv` sur `shell-quote@1.10.0`, dépendance transitive des outils de développement. Mise à jour vers `1.12.0` dans les plages déjà autorisées : une seule entrée de `package-lock.json` change, aucun manifeste ni code métier. Commit distinct de l'import.

L'audit complet passe de 23 à 22 paquets signalés, avec zéro critique. Les 19 signalements élevés et 3 modérés restants proviennent des avis sur `braces`, `node-forge` et `decode-uri-component`, principalement dans la chaîne Expo. Les propositions automatiques comprennent des changements majeurs incompatibles : aucun `audit fix --force` n'est appliqué. Leur traitement reste à planifier avec les vérifications mobiles.

L'audit distinct du verrouillage de production de la release API (`npm audit --omit=dev --package-lock-only`) ne signale aucune vulnérabilité connue au moment du contrôle.

## Contrôles exécutés

- Installation verrouillée avec Node 24.19.0 et npm 11.19.1 : réussie, 1 066 paquets installés.
- Build des paquets shared et UI : réussi.
- Build de l'administration web : réussi.
- Typage administration web et mobile : réussi.
- Lint racine et lint mobile : réussis. Pour Expo dans ce cloud : `EXPO_NO_TELEMETRY=1 CI=1`, afin d'éviter l'écriture du profil de télémétrie hors du workspace.
- Vitest : **54 tests réussis dans 4 fichiers**, sans assertions désactivées.
- Intégration réelle de la release fournie : `PHASE2_INTEGRATION_OK`, sur la base locale uniquement. Vérifications CRUD, références, confidentialité des salaires, unicités, versions, archivage/restauration, cartes, rôles, mots de passe temporaires, révocation et audit. Les données de test sont annulées par transaction ; le compte initial local est préservé.
- API locale : `/health` répond HTTP 200, `status=ok`, `database=up`, `phase=2`.
- Navigateur local, largeur 390 px : connexion HTTP 200, formulaire de changement initial obligatoire affiché, déconnexion HTTP 200 et retour au formulaire. Aucune exception JavaScript observée.
- Réinstallation depuis le verrouillage corrigé et reconstruction web : réussies. HTML, JS, CSS et logo reconstruits identiques à la release fournie.
- Arrêt puis redémarrage de la base locale et des services : réussis. Réexécution des instructions de démarrage : services existants conservés et contrôles HTTP réussis.

**Limite Prisma :** le build global s'arrête au téléchargement du checksum du moteur depuis `binaries.prisma.sh`, refusé par le proxy. Le domaine a été ajouté au brouillon de configuration cloud ; son application et la régénération restent à vérifier. Aucune vérification de checksum ou TLS n'a été désactivée.

Pour exécuter les 54 tests en attendant, le client JavaScript généré livré dans l'archive a été temporairement réutilisé après comparaison de son `inlineSchema` au fichier `database/schema.prisma` (identiques hors espaces et commentaires). Cette copie temporaire a été supprimée après les tests. Les avertissements de source maps absentes viennent du conditionnement de la release, qui exclut les `.map` ; ils n'ont pas fait échouer les tests. Le build et le typage complets de l'API depuis zéro restent **non validés dans cette instance**.

## Environnement local isolé

MariaDB 11.8.6 est installé sous `/workspace/lyne-tools/mariadb` depuis les paquets Debian, téléchargés via des index signés et vérifiés. Le serveur écoute uniquement sur `127.0.0.1:3307`. Le serveur hébergé était décrit comme MariaDB 11.8.9 ; la version de patch locale diffère.

La base `lyne_cloud_dev` a été créée vide. Elle a reçu le SQL Phase 1 puis la reconstruction Personnel, uniquement pour ce schéma local jetable. Cela ne réconcilie pas l'historique du serveur et ne reconstitue pas le SQL original de migration. Aucun enregistrement fictif de migration n'a été ajouté à l'historique de production.

Les paramètres locaux et secrets de démonstration générés sont dans `.env`, mode 600, ignoré par Git. Les scripts et données de cette instance restent hors du dépôt, sous `/workspace/lyne-tools/`. Aucune base ni configuration de production n'a été importée.

La gestion Vite est modifiable localement. En attendant la génération Prisma, son API utilise le livrable compilé fourni, conservé hors du dépôt dans `/workspace/lyne-recovery/release/`. Ce fonctionnement ne remplace pas la compilation des sources API pour les prochains changements.

## Suite de la Phase 2

1. Appliquer l'autorisation réseau Prisma, puis réussir `npm run build`, `npm run typecheck`, `npm test` et `npm run db:validate` depuis les sources.
2. Examiner la récupération ou la réconciliation explicite de `20260928170000_personnel` avant toute migration supplémentaire. L'original manque toujours ; conserver le garde-fou `db:check-history`.
3. Compléter le Personnel mobile et les tests adaptés à Expo 57 ; effectuer la recette sur Android réel.
4. Vérifier les photos privées et l'impression des cartes dans les conditions de recette.
5. Préparer les livrables de déploiement et une sauvegarde, puis recette et validation de la Phase 2 avant la Phase 3.

L'accès SSH depuis cet environnement reste indisponible malgré son activation dans Hostinger. Cette reprise n'a modifié aucun fichier ni donnée sur l'hébergement et n'a déclenché aucun déploiement.
