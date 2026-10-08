# Vitrine publique LYNE

Site statique : https://lyne-restau.alikakonnect.com/

Cette vitrine est indépendante de `apps/admin-web` et de l'API de gestion.
Seuls `index.html`, `logo-lyne.png` et `assets/` sont destinés à l'hébergement
public. Ne pas publier les scripts, le dépôt, les fichiers `.env` ou les archives.

## Visuels fournis le 28 septembre 2026

Les sept PNG du dossier racine `images/` sont conservés sans modification.
Les versions WebP sont dans `assets/visuels-20260928/`. Elles conservent les
dimensions d'origine ; seul l'encodage est optimisé (qualité 84).
`image-manifest.json` conserve les correspondances, dimensions, poids et
empreintes SHA-256. Ces visuels sont ceux fournis par l'utilisateur ; leur
authenticité comme photographies du restaurant n'a pas été vérifiée.

## Préparation et contrôles

Depuis la racine du projet, avec Node.js :

```powershell
node website/scripts/prepare-images.cjs
node website/scripts/preview.cjs
```

La préparation nécessite `sharp` ; la prévisualisation ne dépend que de Node
et écoute uniquement sur `http://127.0.0.1:4180`.

Dans un second terminal :

```powershell
node website/scripts/verify.cjs
node website/scripts/verify.cjs https://lyne-restau.alikakonnect.com/
```

La vérification nécessite `playwright` et Microsoft Edge. `sharp` et `playwright`
peuvent être fournis par le runtime de travail via `NODE_PATH` : aucune dépendance
supplémentaire n'a été ajoutée aux workspaces métier. Les captures de contrôle
sont enregistrées dans `.tmp/vitrine-qa/`, non versionné.

Les contrôles couvrent le statut HTTP, les sept visuels et le logo, les images
chargées, les erreurs JavaScript/HTTP, le débordement horizontal, le menu mobile,
les liens de contact et les largeurs 1440, 768, 390 et 320 pixels. Aucun message
WhatsApp ni appel téléphonique n'est déclenché.

## Publication et retour arrière

Le site public est dans
`/home/u748819186/domains/lyne-restau.alikakonnect.com/public_html`.

Avant toute publication : sauvegarder les fichiers remplacés dans le répertoire
privé `/home/u748819186/lyne-app/backups/`, puis vérifier l'archive. Envoyer une
version dans un répertoire privé de préparation et comparer les empreintes.
Publier d'abord les nouveaux assets, puis remplacer `index.html` par renommage
atomique d'un fichier temporaire. Vérifier ensuite l'URL HTTPS publique.

Sauvegarde précédant la publication du 28/09/2026 :
`/home/u748819186/lyne-app/backups/vitrine-before-images-20260928-01.tar.gz`.
Elle contient l'ancien `index.html` et le logo. Pour un retour arrière autorisé,
extraire l'archive dans un nouveau répertoire privé, contrôler son contenu, puis
restaurer seulement l'ancien `index.html` par le même mécanisme atomique. Le logo
n'a pas été modifié. Les nouveaux assets peuvent rester en place sans être référencés.

Cette livraison de la vitrine ne clôture pas la Phase 1 de l'application de gestion.
