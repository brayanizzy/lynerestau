# Publication web par le déploiement GitHub de Hostinger

## Diagnostic du 9 octobre 2026 (Lubumbashi)

hPanel a cloné `main` au commit `f78e2b1` dans `public_html`. Les journaux
indiquent Composer, sans compilation ni démarrage Node.js. L'utilisateur confirme
ne disposer que de cette fonctionnalité GitHub. Contrôles HTTPS après cette
opération : accueil 403, gestion et santé 404, `/website/` et `/package.json` 200.
Le dépôt source a été publié à la place du site compilé. Le statut « Terminé »
décrit le transfert, pas la santé de LYNE.

## Branches et activation

- `main` : historique des sources, **ne plus sélectionner pour public_html**.
- `setup-hostinger` : correctif de préparation et cette procédure, conservé
  séparément tant que hPanel déploie automatiquement `main`.
- `hostinger-web` : uniquement les fichiers publics prêts à servir.

Dans hPanel, modifier le déploiement GitHub existant : sélectionner la branche
`hostinger-web`, conserver la destination `public_html`, puis redéployer.
Si le formulaire ne permet pas de changer la branche, revenir à la configuration
de la connexion GitHub ; ne pas supprimer le site ou ses données.
Conserver le déploiement automatique sur cette branche.

La branche publique contient 16 fichiers : vitrine, images, gestion compilée,
deux configurations `.htaccess` et un manifeste `release.json` avec le commit
source et les empreintes SHA-256. Ni secrets, ni sources serveur, ni migrations,
ni photos de personnel, ni dépendances Node ne sont publiés. La règle racine
limite les chemins accessibles, y compris si Hostinger conserve d'anciens fichiers
du dépôt source. Après activation, vérifier aussi que `/package.json` et
`/website/` ne sont plus accessibles.

## API et limites

`api/.htaccess` vise la release privée documentée du 6 octobre :
`/home/u748819186/lyne-app/phase2-recovery-20261006/app.cjs`, via Node 24 et
Passenger/LiteSpeed. Son chargeur a été vérifié dans l'archive récupérée.
Le chemin est issu du rapport de reprise ; son existence actuelle et la
configuration réellement active n'ont pas pu être relues sur le serveur.
Cette restauration du routage doit donc être confirmée après activation.

**Ce canal ne met à jour que le web et son routage.** Il ne publie pas le code
Node privé et n'exécute aucune migration ni seed. Une modification future du
contrat API exige la livraison privée compatible avant le web. L'historique
Prisma reste à réconcilier selon `deploiement-hostinger-20261009.md`.
La Phase 2 n'est pas déclarée clôturée par cette livraison.

Après bascule : accueil et `/gestion/` 200, `/health` et `/api/health` 200 avec DB
disponible, `/api/v1/auth/me` 401 sans session. Vérifier ensuite connexion réelle,
Personnel, photos privées, carte et déconnexion. En cas de 500/503 de l'API,
comparer `lyne-app/api-recovery-20261006.htaccess` à la configuration publiée et
vérifier le chemin privé dans le gestionnaire de fichiers ; conserver les
releases et sauvegardes existantes. Ne pas utiliser la configuration Phase 1
historique de `services/api/deploy/api.htaccess` comme remplacement automatique.

## Préparation des prochaines livraisons

Une fois hPanel relié à `hostinger-web`, intégrer `setup-hostinger` dans `main`.
Depuis le checkout source propre, avec Node 24 et npm 11.19.1 :

```bash
npm run build:shared
npm run build:ui
npm run build:admin-web
node services/api/deploy/package-hostinger-web.mjs .tmp/hostinger-web-NOUVELLE-VERSION
```

Le dossier de destination doit être nouveau, sous `.tmp`. Tester ce dossier
compilé avec l'API compatible avant de publier. Vérifier les empreintes du
manifeste et son inventaire exact. Le script ne pousse rien et ne lit aucun
fichier de configuration privé.

Publier ensuite cet inventaire comme nouveau commit sur `hostinger-web`, dont
le parent est le précédent commit public. Utiliser un index Git temporaire avec
`GIT_INDEX_FILE`, `git --work-tree=<dossier-public> add --all`, `git write-tree`
et `git commit-tree`, puis un push normal vers `refs/heads/hostinger-web`.
Partir d'un index vide (`git read-tree --empty`) ; ne pas reprendre l'index du
monorepo. Ne jamais forcer le push : si la branche a changé entre-temps,
relire son état et reprendre. L'historique source reste distinct et traçable par
le manifeste. Vérifier les deux livraisons : GitHub, puis HTTPS après le
déploiement automatique Hostinger.

## Validation locale de cette préparation

Build shared/UI/admin-web réussi ; helper vérifié par ESLint. Inventaire exact
et SHA-256 des 16 fichiers contrôlés. Chromium vérifie la vitrine, le chargement
des images, les largeurs 1440/390 px, le lien vers la gestion et le formulaire de
connexion ; aucune erreur JavaScript. Avec un proxy de test vers l'API locale,
santé 200 et session anonyme 401. Ce proxy ne valide pas Passenger ni les règles
Apache/LiteSpeed : leur contrôle HTTPS reste nécessaire après activation.
Les assets de gestion reconstruits sont identiques au build précédemment testé.
