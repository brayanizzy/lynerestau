# Déploiement demandé — état du 9 octobre 2026 (Lubumbashi)

L’utilisateur demande désormais de publier les modifications sur GitHub puis sur
le serveur après les contrôles, afin de vérifier progressivement le travail en
ligne. Il autorise le déploiement et la réconciliation contrôlée de l’historique.
Le passage à la Phase 3 est demandé après finalisation de la Phase 2.

## Résultat effectif de cette intervention

Aucune nouvelle release n’a été activée sur Hostinger et aucune migration serveur
n’a été modifiée. L’accès SSH à `217.65.157.197:65002` est refusé avant
l’authentification, y compris lors de l’essai hors sandbox. Un CONNECT via le proxy
s’ouvre puis se ferme sans bannière SSH. Cela n’établit pas que SSH est désactivé
chez Hostinger ; cela établit que ce canal n’est pas utilisable depuis cette machine.
Aucun mot de passe n’a été testé ou affiché. L’utilisateur dispose uniquement du
gestionnaire de fichiers, pas d’un terminal serveur.

Contrôles HTTPS actuels : `/health` retourne 200 avec DB up/phase 2 ; `/gestion/`
retourne 200. Le JavaScript `index-h4h43dbb.js` et le CSS `index-DyPd8yzN.css`
sont identiques octet pour octet au build local. L’administration web a donc déjà
le code actuellement versionné. Les ajouts récents de Personnel concernent surtout
l’application mobile. L’utilisateur a ensuite confirmé que le périmètre actuel
reste exclusivement le navigateur ; la livraison Android est différée. Ces constats
ne constituent pas une recette authentifiée des parcours en production.

## Paquet sans terminal préparé

`phase2-20261009-complet-prive.zip` contient une release privée complète, y compris
ses dépendances de production. Les liens internes npm sont matérialisés en fichiers
pour l’extraction par un gestionnaire de fichiers. Aucun `.env`, dump ou photo de
personnel n’est inclus. Taille : environ 46 Mo (140 Mo décompressés).

Le ZIP a été vérifié, extrait dans un dossier distinct puis démarré avec le chargeur
`app.cjs` en mode production et une configuration privée de test. Santé, gestion et
401 sans session passent. Le contrôle d’intégration sur MariaDB locale passe aussi :
CRUD, rôles, révocation, photos privées, EXIF, archivage, cartes ; transaction annulée
et administrateur inchangé. Cette validation Linux x64/Node 24 ne remplace pas le
contrôle des bibliothèques natives sur Hostinger après activation.

Fichiers fournis à part : `api-phase2-20261009.htaccess`, `SHA256SUMS.txt` et la
notice de transfert. Le paquet est conservé sous
`/workspace/livrables/hostinger-phase2-20261009/` dans le cloud.

## Transfert manuel possible avec le gestionnaire de fichiers

1. Conserver le dossier de release actuellement utilisé et copier le fichier
   `domains/lyne-restau.alikakonnect.com/public_html/api/.htaccess` sous un nom
   de sauvegarde **dans `lyne-app/backups/`**, hors du répertoire public.
2. Téléverser le ZIP dans `/home/u748819186/lyne-app/`, puis l’extraire là.
   Le chemin final doit être `lyne-app/phase2-20261009/app.cjs`, avec `api/`, `web/`,
   `packages/` et `node_modules/` à côté. Le ZIP et ses dépendances restent hors
   de `public_html`. Conserver les `.env`, `.env.runtime`, `.env.seed` et `uploads`
   existants du dossier parent. Ne pas déplacer leurs données.
3. Pour activer, téléverser le fichier `.htaccess` fourni sous un nom temporaire
   dans `public_html/api/`, puis remplacer `.htaccess` par renommage. Cette action
   change l’API active ; elle ne doit intervenir qu’après extraction complète et
   conservation de la configuration précédente. Aucun changement de la vitrine
   ni du build web public n’est requis : leurs assets sont déjà identiques.
4. Contrôler immédiatement `/health`, le login, Personnel, la photo, la carte et
   la déconnexion. En cas de 500/503 ou de problème applicatif, restaurer le
   `.htaccess` précédent et revérifier la santé. Conserver les deux releases.

Ce transfert n’exécute aucune migration ni seed. Il ne résout pas à lui seul
l’historique Prisma et ne livre pas d’APK. L’assistant ne peut pas réaliser les
clics dans une session hPanel à laquelle il n’a pas accès.

## Réconciliation des migrations

Le diagnostic `services/api/deploy/preflight-hostinger.mjs` est préparé et testé
sur une arborescence simulée utilisant la vraie base locale. Sur le serveur, avec
Node 24, il lit Passenger, les migrations et les noms des tables, recherche le SQL
original dans les fichiers et archives privés, et écrit uniquement un rapport privé.
Il ne démarre pas de migration, de seed ni de déploiement. Exemple pour un opérateur
disposant ultérieurement du terminal :

```bash
/opt/alt/alt-nodejs24/root/usr/bin/node /chemin/prive/preflight-hostinger.mjs /home/u748819186
```

Avant toute réconciliation effective : sauvegarde DB et historique, restauration
sur une base isolée, comparaison du schéma et vérification de l’empreinte du SQL
retrouvé. S’il reste absent, une reprise explicite de l’historique devra être
conçue et validée sur cette copie avant application au serveur. Ne pas modifier
un checksum pour faire accepter une reconstruction différente et ne pas appliquer
`db:bootstrap` à la base existante. L’autorisation de réconciliation ne remplace
pas ces preuves techniques, actuellement impossibles à collecter à distance.

## Automatisation et mobile

L’API GitHub est refusée par le proxy (HTTP CONNECT 403). `api.github.com` a été
ajouté au brouillon réseau, sans retirer les domaines existants. Enregistrer puis
publier les paramètres du cloud est nécessaire avant de réessayer l’API et les
capacités de déploiement GitHub. Aucun workflow de déploiement n’est annoncé actif,
aucun secret GitHub n’a été créé, aucune clé serveur n’a été changée.

L’utilisateur confirme : « Le projet reste dans le navigateur pour le moment ».
Aucun compte Expo/EAS, APK ou test natif n’est donc requis pour terminer le périmètre
web de Phase 2. Les essais portent sur les navigateurs desktop et les petits écrans.
Les sources mobiles sont conservées pour une phase de livraison ultérieure.

## Recette web complète exécutée après la précision de périmètre

Sur le code actuel avec la base locale isolée, Chromium a exécuté avec succès :
connexion, création de service/fonction, rôle limité, compte avec mot de passe
provisoire, fiche et association du compte, photo privée, carte PDF sans salaire,
modification, archivage/restauration, recherche, navigation à 390 px, déconnexion,
changement initial du mot de passe et consultation avec le rôle limité.
Ce dernier ne voit ni salaire, ni enregistrement, ni impression ; les champs sont
non modifiables. Aucune erreur JavaScript applicative n’a été relevée.

Les comptes synthétiques ont ensuite été désactivés, leurs sessions révoquées,
les fiches archivées et leurs références désactivées. L’administrateur initial
est inchangé et les traces de recette sont conservées. Ces essais n’ont utilisé
aucun compte ni aucune donnée du serveur distant. Les artefacts sont conservés
hors Git sous `.tmp/recette-web-resultats.json`, `.tmp/recette-carte-web.pdf` et
`.tmp/recette-web-personnel-390.png` ; les identifiants de test restent privés.
