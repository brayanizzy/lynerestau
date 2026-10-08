# Serveur — recette de Phase 1

État vérifié le 28 septembre 2026. Cette fiche ne contient aucun secret.
La recette progressive ne constitue pas la validation de production de Phase 12.

## Accès et exécution

- SSH : `ssh -p 65002 u748819186@217.65.157.197` ; empreinte hôte connue vérifiée.
- Répertoire utilisateur : `/home/u748819186` ; système Linux.
- Node **24.19.0** et npm **11.17.0** dans `/opt/alt/alt-nodejs24/root/usr/bin`.
  Ajouter ce dossier au PATH dans une session de travail ; ne pas modifier le
  runtime global de l'hébergement. Le lockfile est préparé localement avec
  npm 11.19.1 ; l'installation verrouillée de la release serveur a réussi.
- LiteSpeed lance et supervise Node avec les directives Passenger de
  `services/api/deploy/api.htaccess`. Aucun processus `nohup`, service système,
  cron ou connexion SSH maintenue ne sont nécessaires.
- La connexion HTTPS réelle a été retestée avec succès **après fermeture SSH**.

## URLs et fichiers

| Usage | URL / emplacement |
|---|---|
| Vitrine conservée, lien de connexion en pied de page | https://lyne-restau.alikakonnect.com/ |
| Application web | https://lyne-restau.alikakonnect.com/gestion/ |
| API versionnée | https://lyne-restau.alikakonnect.com/api/v1/ |
| Santé API et base | https://lyne-restau.alikakonnect.com/health |
| Répertoire public | `/home/u748819186/domains/lyne-restau.alikakonnect.com/public_html` |
| Release privée active | `/home/u748819186/lyne-app/phase1-20260928` |

Le répertoire public contient la vitrine et ses images, le build statique sous
`gestion/`, `api/.htaccess` pour relier les requêtes au processus Node et
`.htaccess` à la racine pour réécrire `/health` vers `/api/health`.
Le code serveur et ses dépendances ne sont pas copiés sous `public_html`.

Le chargeur CommonJS `app.cjs`, requis par le chargeur Node LiteSpeed de cet
hébergement, importe l'API ESM compilée. LiteSpeed utilise un socket Unix géré.
La configuration privée conserve `API_HOST=127.0.0.1`, une origine web HTTPS
unique et `TRUST_PROXY=false` ; ne pas activer une confiance globale dans les
en-têtes proxy sans diagnostic du chemin réseau.

La méthode a été vérifiée par un point de diagnostic temporaire avant
activation. Son dossier public a été déplacé vers
`/home/u748819186/lyne-app/node-probe-public-retired` ; son ancienne URL renvoie
404. Il reste récupérable en privé, sans secret.

Référence : [documentation LiteSpeed Node.js/Passenger](https://docs.litespeedtech.com/lsws/cp/cpanel/cloudlinux/#how-litespeed-works-with-nodejs-selector).
Pour demander un redémarrage contrôlé de la release courante, créer si besoin
son dossier `tmp`, puis actualiser `tmp/restart.txt` dans cette release privée.
Vérifier ensuite la santé et l'authentification ; ne pas tuer tous les processus Node.

## Configuration privée

Transfert explicitement autorisé par l'utilisateur vers `/home/u748819186/lyne-app/` :

- `.env` : connexion MySQL ; copie du fichier local `services/api/.env`.
- `.env.seed` : identifiant et mot de passe administrateur initial généré.
- `.env.runtime` : environnement de recette HTTPS, origines, durée de session.

Les trois fichiers ont le mode **600** ; le dossier parent a le mode **700**.
Le serveur ne charge pas le secret de seed pendant les requêtes ordinaires.
Ces fichiers ne doivent jamais entrer dans Git, une archive publique, un rapport
ou une capture d'écran. Les chemins publics `/.env`, `/api/.env` et
`/gestion/.env` renvoient 403 ; `/api/package.json` renvoie 404.

Les secrets SSH/MySQL ayant été communiqués en conversation, prévoir avec
l'utilisateur leur renouvellement et l'actualisation coordonnée des fichiers
privés. Ils n'ont pas été changés sans son accord.

## Base et sauvegardes

- MariaDB **11.8.9**, connecteur MySQL Prisma **7.10.0** ; accès réel vérifié.
- Migration `202609250001_phase1_auth` appliquée le 25/09/2026.
- Seed exécuté le 28/09/2026 : quatre rôles, quatre permissions socle et
  administrateur initial. Réexécution idempotente vérifiée sans remplacement
  du mot de passe. Changement du mot de passe imposé au premier accès.
- Tables : `users`, `roles`, `permissions`, `role_permissions`, `sessions`,
  `audit_logs` et `_prisma_migrations`. Aucun module financier créé.

Sauvegardes privées dans `/home/u748819186/lyne-app/backups/` :

- `before-phase1-20260925.sql` : avant migration.
- `before-phase1-seed-20260928.sql` : avant seed, schéma des sept tables et
  fin du dump vérifiés ; pas encore de test de restauration.
- `vitrine-before-images-20260928-01.tar.gz` : avant les images cliente.
- `vitrine-before-login-20260928.tar.gz` : HTML avant le bouton de connexion.

Les contrôles de connexion écrivent des sessions et des événements d'audit ;
ces traces sont conservées. Aucune purge de données utilisateur n'a été réalisée.
Automatisation des sauvegardes, rétention et restauration testée restent dans
les phases de sécurisation et de mise en production.

## Refaire une release sans GitHub

1. Diagnostiquer l'état local et serveur, préserver les changements existants
   et exécuter build, typage, lints et tests de la phase autorisée.
2. Depuis la racine, lancer
   `node services/api/scripts/package-release.mjs .tmp/<nouvelle-release>`.
   Le dossier doit être nouveau. Le script copie uniquement les builds API,
   web et shared, le chargeur et le contrôle DB ; jamais les `.env` ou dumps.
3. Dans ce dossier, générer son lockfile avec
   `npx --yes npm@11.19.1 install --package-lock-only`, puis auditer les
   dépendances de production et examiner la liste des fichiers de l'archive.
4. Transférer par SSH vers une **nouvelle** release sous `lyne-app`, installer
   avec `npm ci --omit=dev`, puis vérifier la configuration et le démarrage.
   Les fichiers privés restent dans le parent ; ne pas les réécrire implicitement.
5. Sauvegarder les fichiers publics concernés. Publier le build web et faire
   pointer `PassengerAppRoot` vers la nouvelle release avec un remplacement
   atomique de la configuration. Garder les anciens assets pendant la transition.
6. Tester `/health`, le parcours de connexion et la révocation, même après
   fermeture SSH. Rapporter les résultats et demander la validation utilisateur.

Sur la release initiale, `npm run seed` initialise le compte et `npm run verify`
contrôle la base réelle. Ne pas relancer un seed pour réinitialiser un compte.
Ne pas exécuter de migration simplement pour republier le bouton ou le web.

Un retour arrière applicatif consiste à réactiver la release précédente et ses
fichiers web sauvegardés. Il ne doit pas annuler ou réinitialiser la base ni
supprimer les journaux. Le premier déploiement de gestion n'a pas de release
API précédente : la sauvegarde de vitrine permet de restaurer son HTML.
