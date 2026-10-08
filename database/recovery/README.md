# Reconstruction du 6 octobre 2026

Le serveur conserve la migration appliquée `20260928170000_personnel`.
Son empreinte originale enregistrée est
`b2fda43adf38a23f52f17ca51a4f11e888824b5fab61565c110c5ec4e3eb9957`.
Le fichier SQL original n'a pas été retrouvé dans les sources, archives et
objets Git examinés. L'historique serveur n'a pas été modifié.

`personnel-schema-reconstruction.sql` est une reconstruction du passage du
schéma Phase 1 au schéma Phase 2, obtenue avec Prisma 7.10.0. Ce fichier n'est
pas une nouvelle migration à appliquer sur le serveur : les tables et colonnes
sont déjà présentes. Il reste hors du dossier des migrations déployables.

Le schéma Phase 2 a été récupéré depuis la release compilée conservée et
sert à générer le client. Avant toute migration suivante, récupérer le SQL
original ou établir une procédure de réconciliation explicite et vérifiée.
Ne pas remplacer silencieusement l'empreinte dans `_prisma_migrations`.
