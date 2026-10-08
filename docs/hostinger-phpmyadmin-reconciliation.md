# Réconciliation serveur — collecte phpMyAdmin

## Constat transmis le 9 octobre 2026

La capture du résultat de la requête sur `_prisma_migrations` montre deux lignes :

| Migration | finished_at affiché | rolled_back_at |
| --- | --- | --- |
| `202609250001_phase1_auth` | `2026-09-25 13:38:07.365` | `NULL` |
| `20260928170000_personnel` | `2026-09-28 15:56:53.315` | `NULL` |

Les horodatages sont retranscrits tels qu'affichés ; leur fuseau n'est pas établi.
Les checksums sont tronqués par l'affichage : leurs préfixes sont compatibles
avec les références conservées, mais la capture ne permet pas une comparaison
intégrale. Aucune migration catalogue n'apparaît dans ce résultat.

Le bandeau « Current selection does not contain a unique column » concerne les
fonctions d'édition de la grille phpMyAdmin : la requête SELECT n'inclut pas la
clé primaire. Il ne signale pas un échec de migration.

Ce relevé confirme l'état déclaré de l'historique, pas l'identité du schéma réel
avec les sources. Le SQL original Personnel manque toujours ; aucune opération
`migrate resolve`, modification de checksum, migration ou restauration distante
n'a été effectuée.

## Prochaine collecte sans données métier

1. Cliquer sur **le nom de la base LYNE** dans la colonne gauche, afin de quitter
   la sélection de la seule table `_prisma_migrations`.
2. **Export → Rapide → SQL** : télécharger une sauvegarde complète et la conserver
   privée. Elle contient potentiellement des informations personnelles et des
   empreintes d'authentification ; elle n'est pas destinée au dépôt Git ni à cet
   échange. Une sauvegarde téléchargée ne prouve pas sa restauration.
3. Faire un second export **Personnalisé → SQL**, avec toutes les tables,
   **Structure uniquement**, sans données. Selon la version, cocher Structure
   et décocher Données dans la liste des tables. Transmettre uniquement ce second
   fichier pour comparaison du schéma.

L'export de structure ne doit contenir aucune instruction INSERT/REPLACE avec
des lignes métier. Il conserve notamment colonnes, index, contraintes et types.
À réception, examiner le SQL avant toute exécution ; restaurer seulement les
définitions vérifiées dans une nouvelle base locale isolée, puis comparer à la
Phase 2 (`database/schema.prisma` au commit `6917efd`). Ne pas comparer directement
à la Phase 3 en prenant ses nouvelles tables pour un défaut de la Phase 2.

Le résultat complet des checksums pourra être obtenu via « Copy to clipboard »
ou l'export du **résultat de la requête SELECT** (deux lignes de métadonnées),
sans exporter les comptes ni les employés.

## Conditions avant toute écriture serveur

Conserver le suivi historique original et les sauvegardes. Vérifier les écarts
de structure et les contraintes sur copie, puis préparer une procédure explicite
de reprise de l'historique et un retour arrière testable. L'autorisation utilisateur
de réconciliation et de livraison existe déjà ; ces contrôles techniques restent
nécessaires. Ne pas appliquer la baseline neuve à la base existante, ne pas rejouer
la reconstruction Personnel et ne pas remplacer le checksum du SQL manquant.

L'activation du catalogue demande aussi la release Node privée Phase 3. La branche
`hostinger-web` publie les fichiers web et le routage ; elle ne migre pas la base
et ne remplace pas automatiquement cette release privée.

## Exports reçus et comparaison effectuée

Les exports fournis ensuite comprennent une structure seule et une sauvegarde
complète. Les définitions DDL sont identiques entre les deux. Seule la structure
a été importée dans une nouvelle base isolée ; comparaison Prisma à la Phase 2
sans différence. Empreintes détaillées des colonnes, index, clés étrangères,
contraintes et propriétés des tables également identiques. Les deux checksums
historiques complets correspondent aux références conservées.

Une procédure d'adoption explicite de baseline conserve l'ancien historique
intact, avec précontrôles et retour protégé. Elle a été testée sur structures et
données synthétiques, suivie des migrations catalogue et des recettes API.
Voir `database/recovery/hostinger-20261009/README.md`. Aucun dump utilisateur
n'est versionné, aucune donnée métier réelle n'est employée en test. La
restauration complète de la sauvegarde client et l'application serveur restent
à réaliser ; prochain relevé : `01-controle-lecture-seule.sql` dans phpMyAdmin.
