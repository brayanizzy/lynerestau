# Livraison de la vitrine — 28 septembre 2026

Demande : intégrer les sept images fournies par l'utilisateur à la vitrine
publique et la publier pour présentation à la cliente.

URL vérifiée : https://lyne-restau.alikakonnect.com/

## Livraison réalisée

- Source de la vitrine existante récupérée dans `website/`, avec son logo.
- Sept visuels intégrés : accueil, salle, trois présentations de plats et galerie
  comprenant également pizza et boissons. Les emplacements d'images inexistantes
  ont été remplacés.
- Conversion PNG vers WebP sans redimensionnement ni retouche des originaux :
  17 157 658 octets de PNG → 1 754 932 octets de WebP (environ 90 % de réduction).
- Images sous la ligne de flottaison chargées à la demande ; image d'accueil
  préchargée. Dimensions et textes alternatifs renseignés.
- Menu mobile accessible par bouton, fermeture au clic et avec Échap ; correction
  du titre sur écran étroit, prise en compte des animations réduites.
- Numéro de téléphone cliquable ; liens WhatsApp existants conservés.
- Métadonnées de partage et URL canonique ajoutées.
- Identité visuelle, coordonnées, textes et logo existants conservés.

Les fichiers fournis portent des noms « Image ChatGPT ». Ils sont présentés ici
comme des visuels fournis par l'utilisateur, et non comme des photographies dont
l'authenticité aurait été vérifiée. Les PNG d'origine n'ont pas été modifiés.

## Publication et protection des données

- Sauvegarde privée préalable, archive vérifiée :
  `/home/u748819186/lyne-app/backups/vitrine-before-images-20260928-01.tar.gz`.
- Archive contenant l'ancien `index.html` et le logo ; préparation hors du dossier
  public, publication des assets puis remplacement atomique de `index.html`.
- Empreinte SHA-256 du HTML précédent :
  `403fde352178579029d4e7acf3270c991516a01f75f975927a5b9789a1f6eacb`.
- Empreinte SHA-256 du HTML publié, identique au fichier local :
  `50688129f1ec665f962e441f86a694295b698b9fe07f38ac7f73f604caac7bca`.
- Aucun accès à la base, aucune migration, aucune modification de l'API ni de
  l'application de gestion pendant cette livraison.

## Contrôles effectués

- QA navigateur Microsoft Edge automatisée : réussie localement puis sur l'URL
  HTTPS publique, HTTP 200.
- Sept visuels et logo : huit ressources distinctes disponibles, type image,
  toutes les images de la page chargées.
- Largeurs 1440, 768, 390 et 320 px : aucun débordement horizontal détecté.
- Menu mobile : ouverture, fermeture après navigation et touche Échap vérifiées.
- Liens de contact : une URL téléphone et cinq liens WhatsApp attendus présents.
  Aucun message ni appel n'a été envoyé.
- Aucune erreur JavaScript ou réponse HTTP en erreur observée pendant le parcours.
- Captures ordinateur et mobile contrôlées ; preuves dans `.tmp/vitrine-qa/`.
- ESLint des scripts de la vitrine et `git diff --check` : réussis.

## Suite

La vitrine est disponible pour la recette de la cliente. La Phase 1 de
l'application de gestion reste en cours et n'est pas clôturée par cette livraison.
La séparation vitrine/gestion est conservée. Aucun commit de clôture de phase
n'est créé sans validation utilisateur.

Préparation, tests et retour arrière : `website/README.md`.
