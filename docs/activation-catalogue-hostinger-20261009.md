# Activation du catalogue sur Hostinger — 9 octobre 2026

L'utilisateur confirme la reprise de l'historique de la base du site avec
`LYNE_BASELINE_PRESENTE`, après l'essai sur copie. L'API en ligne reste Phase 2
tant que les étapes suivantes ne sont pas terminées. Le frontend compatible
est déjà publié ; il affiche le catalogue lorsque l'API expose les capacités.

## 1. Base de données

Depuis phpMyAdmin, importer en entier
`database/recovery/hostinger-20261009/04-installer-catalogue.sql` **d'abord sur
`u748819186_lyne_reprise`**. Transmettre la ligne finale contenant le nom de la
base et `LYNE_CATALOGUE_MIGRATIONS_OK`. Après validation, conserver une sauvegarde
complète récente de `u748819186_lyne_restau`, puis y importer le même fichier
sans autre migration concurrente. Attendre sa réussite avant activation API.

Trois migrations doivent alors être terminées dans `_prisma_migrations` :
`202610080001_phase2` (étapes 0), `202610090001_menu` et
`202610090002_menu_tables` (étapes 1). Conserver l'archive de l'ancien suivi.
Un échec DDL peut laisser une migration inachevée ; ne pas rejouer ni effacer
ses traces. Le script refuse cet état et exige un diagnostic. Ne pas exécuter
le retour d'historique `03` après le catalogue.

## 2. Installation privée avec le gestionnaire de fichiers

Livrable : `phase3-20261009-complet-prive.zip`, environ 46 Mo, avec les dépendances
de production, sans `.env`, dump, donnée métier ni photo personnelle. Les liens
npm sont matérialisés pour l'extraction depuis hPanel. Les bibliothèques natives
sont celles de Linux x64/Node 24, déjà utilisées par le paquet Phase 2 testé.
Une vérification après activation sur Hostinger reste nécessaire.

Le ZIP et `SHA256SUMS.txt` sont destinés aux pièces jointes de la release GitHub
`hostinger-phase3-20261009`. Le mot « privé » désigne le répertoire d'installation
hors `public_html` ; l'archive ne contient aucun secret et le dépôt est public.

1. Téléverser le ZIP dans `/home/u748819186/lyne-app/`, hors `public_html`.
2. L'extraire : le chemin final doit être
   `/home/u748819186/lyne-app/phase3-20261009/app.cjs`, avec les dossiers `api`,
   `web`, `packages` et `node_modules` à côté. Éviter un double dossier imbriqué.
3. Conserver les anciennes releases ainsi que `.env`, `.env.runtime` et
   `uploads` du dossier parent. Aucune réinitialisation ni seed du serveur.
4. Confirmer l'extraction terminée. Cette étape seule ne change pas l'API active.

## 3. Activation par GitHub, une fois les prérequis confirmés

Le déploiement public doit continuer à suivre `hostinger-web`. Après preuve des
migrations sur le site et de l'extraction complète, modifier le routage API
versionné pour `PassengerAppRoot /home/u748819186/lyne-app/phase3-20261009`,
actualiser `apiRelease` du manifeste de packaging, puis publier les fichiers
publics compilés et ce routage sur `hostinger-web`. Ce changement attend les
prérequis : le lot de préparation ne modifie pas le routage actif.

Contrôler ensuite en HTTPS : `/health` renvoie `database: up`, `phase: 3`,
accueil et gestion accessibles, session anonyme refusée. Après reconnexion,
ADMIN voit le catalogue ; RECEPTION voit le catalogue en lecture seule.
Valider catégories, produit, prix/historique, disponibilité et photo, puis
vérifier que Personnel fonctionne toujours. Les seuls contrôles anonymes ne
constituent pas cette recette authentifiée.

En cas de panne au démarrage, rétablir le routage versionné vers
`phase2-recovery-20261006` et republier `hostinger-web`. Les migrations catalogue
sont additives ; conserver les nouvelles tables et les historiques, sans DROP
ni restauration destructive. Recontrôler santé et Personnel. Les données du
catalogue restent conservées, même si l'ancienne API ne les expose pas.

## Vérifications locales de ce livrable

- Import SQL sur bases neuves synthétiques, dont erreurs injectées et refus
  de reprise ; comparaison des tables au DDL canonique et empreintes exactes.
- Garde-fou des checksums et `prisma migrate status` de la piste baseline :
  historique reconnu, trois migrations à jour après l'import phpMyAdmin.
- ZIP vérifié, extrait ailleurs et empreintes de tous les fichiers contrôlées.
- Intégrations Menu et Personnel exécutées depuis le paquet extrait sur une
  base locale migrée par `04` ; transactions de recette annulées.
- Démarrage par `app.cjs` en production, santé Phase 3/DB up, gestion 200,
  session/capacités/menu protégés par 401 sans connexion.

Ces essais n'utilisent aucune donnée du serveur. Ils ne prouvent pas une
activation distante : elle attend les retours phpMyAdmin et gestionnaire de
fichiers de l'utilisateur.

## Publication et blocage réseau constatés

Les sources et l'import SQL sont poussés sur `main` et `phase3-menu` au commit
`b97573d`. Le ZIP complet est préparé dans
`/workspace/livrables/hostinger-phase3-20261009/` (46 116 769 octets), avec notice
et empreintes. Le brouillon de release GitHub existe, mais les pièces jointes
ne sont pas encore téléversées : `uploads.github.com` est refusé par le proxy
réseau (CONNECT 403). Aucun asset n'est annoncé disponible dans la release.

Le domaine a été ajouté au brouillon des paramètres cloud, sans retirer les
autres domaines. Les instructions de reprise de l'environnement sont actualisées.
Leur enregistrement est confirmé ; l'utilisateur doit enregistrer les changements
dans les paramètres puis publier l'environnement pour les activer. Reprendre
ensuite l'envoi sur le brouillon existant, sans créer une autre release.

Dernier contrôle HTTPS de ce lot : `/health` 200, DB up, phase 2 ; le manifeste
reste sur le code web `23cf4f7` et l'API `phase2-recovery-20261006`. Aucun routage
public n'a été modifié. L'essai SQL sur la copie peut avancer indépendamment
du téléversement du ZIP.
