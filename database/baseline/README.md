# Installation neuve — Phases 2 et 3

Cet historique est destiné exclusivement aux bases neuves. Il regroupe le schéma
Phase 2 dans `202610080001_phase2`, généré avec Prisma 7.10.0 :

```bash
node node_modules/prisma/build/index.js migrate diff --config database/prisma.config.ts --from-empty --to-schema database/schema.prisma --script
```

Après configuration privée des paramètres DB et du secret administrateur :

Le catalogue ajoute `202610090001_menu` (permissions) puis
`202610090002_menu_tables` (catégories, produits, historique des prix). Ces
migrations sont additives ; l'ancienne baseline reste inchangée. Le seed neuf
accorde la lecture du catalogue à Réception et tous les droits à Administrateur.
Sur une base existante de cette piste, la migration ajoute uniquement les droits
menu de ces deux rôles ; les autres permissions restent inchangées.

```bash
npm run db:bootstrap
npm run db:seed
npm run db:deploy:baseline
```

`db:bootstrap` vérifie que la base ne contient ni table, ni vue, ni routine,
ni événement avant d'appliquer cette migration. Une seconde initialisation est
refusée. `db:deploy:baseline` vérifie les empreintes des migrations déjà appliquées
avant de poursuivre ; sur une base à jour, cette commande ne change rien.
Le seed conserve le mot de passe et les droits des comptes existants.

Ne pas exécuter directement `prisma migrate deploy --config database/baseline.config.ts`
sur le serveur historique, ni marquer cette migration comme appliquée sur sa base.
La base Hostinger conserve son historique `database/migrations/` ; le SQL original
`20260928170000_personnel` est toujours à retrouver. Les commandes historiques
`db:deploy` et `db:check-history` conservent leur contrôle et leur refus en cas de
SQL manquant. Les deux historiques ne se mélangent pas.

Pour une future évolution de schéma, maintenir une migration correspondante dans
chaque historique encore utilisé et tester les deux chemins sur une copie privée.
Avant toute réconciliation du serveur : sauvegarder schéma, données et
`_prisma_migrations`, rechercher le fichier SQL original dans les sauvegardes,
vérifier son SHA-256 contre la table puis comparer le schéma réel à `schema.prisma`.
Si le fichier reste introuvable, préparer une reprise explicite sur une copie
restaurée et un plan de retour avant toute intervention sur la production.
Ne jamais fabriquer un checksum correspondant à un SQL différent.
