# Reprise contrôlée de l'historique — 9 octobre 2026

Ces fichiers concernent un schéma Phase 2 déjà existant. Ils ne recréent pas le
Personnel et ne livrent pas l'API Phase 3. L'utilisateur autorise la réconciliation ;
les conditions techniques ci-dessous doivent être vérifiées avant application.

## Résultat des exports reçus

Les deux exports contiennent les mêmes définitions de dix tables (neuf tables
métier et le suivi Prisma). L'export de 9 595 octets contient uniquement la
structure ; celui de 30 800 octets contient aussi les données. Les originaux
restent privés hors dépôt, avec accès limité au propriétaire du fichier.
**Aucune ligne métier du dump complet n'a été importée ou utilisée en recette.**

La structure seule a été restaurée dans une nouvelle base locale, distincte
de celle du développement. Comparaison au schéma du commit `6917efd` : aucun
écart Prisma. Comparaisons supplémentaires identiques : types/nullabilité/défauts,
collations, moteurs, index, clés étrangères et contraintes CHECK. Les deux
migrations sont terminées, non annulées, avec les empreintes complètes attendues :

- `202609250001_phase1_auth` :
  `8ed679e2d5ca9fa3624ef4e40152a45335005d8b3fb4eb1483abb7380f97aaff`.
- `20260928170000_personnel` :
  `b2fda43adf38a23f52f17ca51a4f11e888824b5fab61565c110c5ec4e3eb9957`.

Le fichier SQL original Personnel reste manquant. Une structure conforme ne
permet pas de reconstituer ses octets ni de remplacer son checksum.

## Fichiers et ordre d'utilisation

1. **`01-controle-lecture-seule.sql`** : importer dans la base LYNE via
   phpMyAdmin. Ce fichier ne fait que des SELECT et des SET de connexion.
   Résultat attendu : `LYNE_CONTROLES_OK`, avec tous les indicateurs à `1`.
   Transmettre cette ligne. Un écart exige un diagnostic, pas une modification
   manuelle des empreintes. Ce contrôle ne constitue pas une sauvegarde.
2. **Avant une intervention réelle**, conserver une sauvegarde complète récente
   et en tester la restauration sur une base privée distincte du site. Le test
   local effectué ici porte sur la structure et des données synthétiques ; il
   ne prouve pas la restauration complète des données du client. Ne connecter
   aucune interface de recette aux comptes personnels restaurés.
3. **`02-adopter-baseline-sur-copie.sql`** : à tester d'abord sur cette copie
   après restauration. Importer le fichier entier en une seule opération,
   sans autre migration concurrente. Il relit les empreintes du schéma et
   l'historique avant d'agir, prépare un nouvel historique, puis effectue un
   renommage atomique des deux tables de suivi. Les données métier ne sont
   ni écrites ni renommées. Un verrou nommé sérialise les imports de ce fichier.
4. **`03-retour-avant-catalogue.sql`** : retour à l'ancien historique uniquement
   avant toute migration suivante. Il conserve aussi le suivi baseline dans
   une archive séparée. Il refuse le retour si le catalogue ou une migration
   ultérieure apparaît. Ne pas le lancer automatiquement après une livraison
   Phase 3 ; un retour applicatif complet exige alors une procédure distincte.

Un fichier arrêté sur erreur ne doit pas être poursuivi ligne par ligne. Inspecter
l'état des tables de suivi avant toute reprise. Une seconde adoption est refusée
sans modification, y compris si l'historique a déjà été repris. Si un retour a
été fait, les archives conservées bloquent une nouvelle adoption automatique :
elles doivent être examinées avant de préparer une nouvelle intervention.

## Signification de la baseline

L'ancienne table reste **intacte** sous
`_prisma_migrations_legacy_20261009` : mêmes lignes, dates et checksums. Un nouveau
suivi `_prisma_migrations` consigne `202610080001_phase2` comme point de départ
d'un schéma préexistant vérifié (`applied_steps_count = 0`). Cela équivaut à une
adoption explicite de baseline, pas à l'exécution de son DDL ni à la récupération
du SQL manquant. Son checksum est celui du vrai fichier versionné :
`589ff17cd85319e5be609fe075c7c1d82e9e2e562ee9fc13ccf7fb3090cf10e3`.

Après adoption effective et vérification sur le serveur, utiliser la piste
`database/baseline/` et `db:deploy:baseline`. Le garde-fou habituel contrôle les
vrais fichiers et leurs empreintes ; il n'a pas été affaibli. Les commandes de
la piste historique `database/migrations/` ne sont pas adaptées à ce nouveau
suivi. `db:bootstrap` reste interdit sur une base non vide.

L'archive de suivi n'est volontairement pas un modèle applicatif. Un `migrate
diff` global peut proposer de la supprimer : **ne jamais exécuter ce DROP**.
La conserver comme pièce de traçabilité et distinguer cette archive des écarts
des tables métier. `migrate status` de la piste baseline fonctionne normalement.

## Tests exécutés

- Précontrôle, adoption, conservation exacte du suivi d'origine et d'une ligne
  métier synthétique, refus sur checksum incorrect, colonne inattendue et
  seconde exécution.
- Retour arrière exact sur une copie distincte ; archive du suivi baseline
  conservée. Refus du retour après ajout d'une migration ultérieure, puis après
  les vraies migrations catalogue sur la copie locale.
- Après reprise locale : garde-fou des checksums, migrations catalogue, état
  Prisma à jour. Le seul écart du diff final est la table d'archive volontaire.
- Recettes DB/API Personnel et Menu réussies sur la copie avec données fictives ;
  transactions de recette annulées. Aucun compte réel du dump n'est utilisé.

Test SQL reproductible sur un socket MariaDB local, sans données utilisateur :

```bash
LYNE_TEST_MYSQL_CLIENT=/chemin/vers/mariadb \
LYNE_TEST_MYSQL_SOCKET=/chemin/vers/mysql.sock \
LYNE_TEST_MYSQL_USER=agent \
python3 database/recovery/hostinger-20261009/test-rebaseline.py
```

Ce test crée deux bases `lyne_rebaseline_test_*` neuves et les conserve pour
inspection. Il ne cible pas la base applicative configurée dans `.env`.

**Statut au 9 octobre 2026 :** l'utilisateur a transmis le précontrôle serveur
`LYNE_CONTROLES_OK` avec les huit indicateurs à `1`, puis le résultat de l'adoption
sur la copie privée `u748819186_lyne_reprise` : `LYNE_BASELINE_PRESENTE`.
Le suivi actif contient `202610080001_phase2`, terminé, non annulé, avec zéro
étape exécutée ; l'archive historique est présente. Ces opérations ont été
effectuées par l'utilisateur dans phpMyAdmin, pas à distance par l'assistant.
Ce relevé valide la reprise de l'historique sur copie ; il ne constitue pas un
audit ligne par ligne des données restaurées.

Prochaine intervention : conserver un export complet récent de la base du site
`u748819186_lyne_restau`, puis y importer le fichier `02` entier, sans migration
concurrente. Malgré son nom « sur-copie », ce fichier est le même script gardé
désormais testé sur copie ; il revérifie tous les prérequis avant l'adoption.
Attendre son résultat avant toute migration catalogue.

**Confirmation suivante reçue :** l'utilisateur indique avoir terminé cette
étape sur la base du site et obtenu `LYNE_BASELINE_PRESENTE`. La réconciliation
est donc confirmée par l'utilisateur ; l'activation de l'API Phase 3 reste à faire.

## Import catalogue sans terminal

`04-installer-catalogue.sql` est généré par `build-menu-import.py` à partir des
octets exacts des migrations baseline `202610090001_menu` et
`202610090002_menu_tables`. Ne pas importer les SQL bruts séparément : ils ne
consigneraient pas leur exécution dans le suivi Prisma.

1. Importer `04` entier d'abord dans `u748819186_lyne_reprise` et transmettre
   la base affichée et `LYNE_CATALOGUE_MIGRATIONS_OK`.
2. Après validation de ce résultat et avec sauvegarde complète récente conservée,
   importer le même fichier dans `u748819186_lyne_restau`, sans autre migration
   concurrente. Attendre le même résultat avant activation de l'API.

Le script exige la baseline adoptée, l'archive intacte, le schéma Phase 2 conforme,
aucune table catalogue/permission menu existante, un rôle ADMIN et des clés
étrangères actives. Il utilise le même verrou nommé que la reprise de l'historique.
Les permissions et le premier suivi sont transactionnels ; les droits existants
des autres rôles restent inchangés. ADMIN reçoit les trois droits ; RECEPTION,
si présent, reçoit seulement `menu.read`.

Avant le DDL, le second suivi est enregistré comme inachevé. Chaque commande
contrôle ses diagnostics et la forme finale des trois tables est comparée aux
empreintes du DDL canonique. La réussite termine les deux suivis avec leurs
vrais checksums, reconnus ensuite par Prisma. Une coupure pendant le DDL peut
laisser des tables partielles : cela n'est pas transactionnel dans MariaDB.
Dans ce cas, arrêter, conserver le résultat et faire diagnostiquer l'état ;
ne pas relancer aveuglément, supprimer une table ou marquer le suivi terminé.
Une nouvelle exécution refuse un état partiel ou déjà migré. Le retour `03`
est également refusé après ces migrations.

`test-menu-import.py` utilise les mêmes variables socket local que le test
précédent. Il teste succès, schéma canonique, checksums, droits ADMIN/RECEPTION,
préservation des données synthétiques et des archives, refus sur dérive,
collision de permission, désactivation des FK, seconde exécution et retour
historique ; il injecte un échec DML et un échec au milieu du DDL, même avec
un client SQL continuant après erreur. Aucun dump client utilisé.

Le paquet de l'API et l'ordre d'activation sont documentés dans
`docs/activation-catalogue-hostinger-20261009.md`.

## Erreur de syntaxe transmise pendant le contrôle final

L'utilisateur a transmis une requête coupée au milieu de l'empreinte des index,
avec une chaîne non fermée et l'erreur MariaDB 1064. Le fichier `04` publié a
été téléchargé et comparé octet pour octet au fichier testé : il est complet
(21 064 octets, SHA256
`2ba9a69ecc14b412357383edf551f4149f0115e0140dc74f48f58c876e359a72`).
L'origine précise de la coupure n'est pas établie. La base ciblée par cet essai
ne figure pas dans le message d'erreur : ne pas supposer qu'il s'agit de la copie.

Ne pas compléter seulement la quote ni relancer l'import `04`. Le DDL précède
ce contrôle ; des tables peuvent déjà exister et le suivi peut être inachevé.
Importer **`05-diagnostic-apres-interruption.sql` dans la base où l'erreur est
survenue**, puis transmettre les résultats : nom de base, historique, tables
présentes et les cinq indicateurs de conformité du catalogue. Le diagnostic ne
modifie aucune donnée et n'utilise pas de variable d'une connexion précédente.

Le test local reproduit la troncature à cet endroit : le DDL complet est présent,
le suivi de la seconde migration reste inachevé et `05` détecte la conformité
des tables. Il distingue aussi une création partielle des tables. Ce résultat
local ne prouve pas l'état distant : attendre le diagnostic avant de préparer
une éventuelle finalisation contrôlée, sans modifier les checksums ni supprimer
les traces de l'import.

Préférer le téléchargement du fichier complet puis l'onglet **Importer**, sans
copier une sélection du code affiché dans GitHub. Les variantes `.sql.gz` des
pièces jointes GitHub contiennent exactement le SQL versionné et peuvent être
importées directement par phpMyAdmin, sans décompression manuelle.
