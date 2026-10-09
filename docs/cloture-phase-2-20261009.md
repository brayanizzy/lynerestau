# Phase 2 — validation fonctionnelle et passage à la Phase 3

Le 9 octobre 2026 (Africa/Lubumbashi), l'utilisateur valide le travail Personnel /
administration, demande la clôture et autorise explicitement le lancement de la
Phase 3. Le périmètre de livraison reste le navigateur, y compris sur téléphone.
Cette décision autorise le passage de phase avec les réserves techniques suivantes ;
elle ne transforme pas les contrôles non exécutés en contrôles réussis.

## Livré et vérifié

- Personnel, fonctions/services, comptes/rôles, permissions, photos privées,
  archivage/restauration et cartes imprimables : recette locale de 11 parcours
  réussie, avec MariaDB réelle et navigateur desktop/390 px ; voir le rapport
  de déploiement et le rapport Phase 2 du 8 octobre.
- 66 tests réussis, builds, typages et lints validés lors de la livraison Phase 2.
- Au contrôle du 9 octobre : accueil et `/gestion/` 200 ; `/health` et
  `/api/health` 200, `database: up`, `phase: 2` ; session anonyme 401.
- `/release.json` confirme le commit source `23adcdf` et la livraison publique
  `hostinger-web` ; `/package.json` 404. L'incident du déploiement direct de
  `main` dans le dossier public est résolu.

## Réserves reportées, sans effacement de l'historique

1. Le SQL historique Personnel manque toujours. Aucune réconciliation du suivi
   Prisma serveur n'a été exécutée. Toute nouvelle migration serveur nécessite
   sauvegarde, restauration isolée, comparaison du schéma et reprise contrôlée
   de l'historique. Ne pas appliquer la baseline neuve à la base existante.
2. La recette authentifiée réalisée ici utilise la base locale ; le contrôle
   actuel du serveur couvre la disponibilité et les protections anonymes.
   La validation utilisateur est consignée, sans lui attribuer des essais précis.
3. Impression physique et restauration des sauvegardes serveur restent à
   vérifier avant mise en production finale. Aucun APK n'est requis pour ce lot.

## Méthode conservée

Sources sur `main` ; fichiers publics compilés sur `hostinger-web`, consommés
automatiquement par Hostinger. Vérifier HTTPS après chaque publication.
L'API Node et les données restent dans le dossier privé du serveur. Ce canal
GitHub générique ne livre pas cette API et n'exécute pas de migrations.
Le catalogue Phase 3 peut être développé/testé dans le cloud ; son activation
serveur exige la base et la release API compatibles, avant les fonctions web.

Statut : **Phase 2 validée fonctionnellement par l'utilisateur, passage à la
Phase 3 autorisé ; clôture technique sans réserve non acquise**.

## Réserve historique levée selon les résultats utilisateur du 9 octobre

Après comparaison des exports, précontrôle complet réussi et adoption testée
sur `u748819186_lyne_reprise`, l'utilisateur confirme `LYNE_BASELINE_PRESENTE`
sur la base du site `u748819186_lyne_restau`, conformément à l'étape demandée.
L'ancien suivi est archivé par le script ; le SQL Personnel original reste
manquant et n'a pas été reconstitué ni rejoué. La piste baseline devient le
suivi applicable au schéma existant vérifié. Cette confirmation est un résultat
transmis par l'utilisateur, pas une connexion directe de l'assistant à la base.
Elle lève le blocage historique pour préparer les migrations catalogue ; les
autres réserves de recette/production et la livraison effective Phase 3 restent
distinctes. Procédure : `database/recovery/hostinger-20261009/README.md`.
