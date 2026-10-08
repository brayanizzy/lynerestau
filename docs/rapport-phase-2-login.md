# Phase 2 — lot 1 : harmonisation de la connexion

28 septembre 2026. Phase 2 autorisée par l'utilisateur ; ce rapport porte
uniquement sur son premier lot visuel, pas sur une clôture du module Personnel.
Le socle de Phase 1 a été enregistré dans le commit local `fb2344f` avant ces
modifications. Les réserves de recette mobile restent dans son rapport.

## Demande et diagnostic

L'utilisateur fournit une référence de connexion : fond coloré, grande carte
blanche arrondie, formulaire à gauche et panneau graphique à droite. Il demande
les couleurs de l'entreprise. Le logo et la vitrine sont rouge/noir/blanc,
alors que la gestion employait encore la palette verte provisoire de Phase 0.

## Réalisé

- Tokens UI alignés sur le rouge de la vitrine (`#B40712`), son rouge sombre,
  le noir et le blanc ; version de charte 0.2.0.
- Formulaire à gauche avec logo fourni, titre de bienvenue, champs arrondis,
  pictogrammes, bouton rouge et retour vers la vitrine.
- Grand panneau rouge/noir dessiné en CSS ; pas d'image externe générée ni de
  changement du logo original. Le panneau est masqué sur petit écran.
- Boutons accessibles afficher/masquer pour chacun des champs de mot de passe.
- Même présentation pour le changement initial obligatoire et volontaire.
- Messages français, labels, autocomplete, focus clavier, chargement,
  désactivation et cibles tactiles d'au moins 44 px conservés.
- Aucun faux bouton de connexion sociale, lien de récupération automatique
  ou option de session prolongée emprunté au modèle.

Les règles d'authentification et les permissions côté serveur ne changent pas.
Aucune migration, aucun seed et aucun changement de compte ou mot de passe
réel n'ont été effectués pour ce lot. La santé de l'API indique toujours
`phase: "1"` : seule la présentation du web commence la Phase 2.

## Fichiers principaux

- `apps/admin-web/src/AuthPanel.tsx`, `auth.css`, `AuthPanel.test.tsx`.
- `apps/admin-web/src/Console.tsx`, `styles.css` : intégration sans réécrire
  la logique des requêtes de connexion/déconnexion/changement de mot de passe.
- `packages/ui/src/tokens/colors.ts`, `tokens.css`, `index.ts`.
- `vitest.config.mts`, `docs/charte-ui.md`, `AGENTS.md` et ce rapport.

## Vérifications

- Build complet réussi, y compris API et contrats partagés ; typage complet réussi.
- ESLint racine réussi ; aucun code mobile modifié dans ce lot.
- **24 tests réussis** : les 19 tests API existants et 5 tests de rendu
  connexion (labels/autocomplete, masquage initial, champs obligatoires,
  annulation autorisée uniquement hors obligation, chargement, erreurs échappées).
- Navigateur local sur le build compilé, avec comptes fictifs en mémoire :
  identifiants incorrects refusés, bouton afficher/masquer fonctionnel,
  authentification initiale et écran de changement obligatoire, déconnexion.
  Aucun nouveau mot de passe saisi ou soumis par l'agent dans le navigateur.
- Affichages desktop, tablette 768 px, téléphone 390 px et formulaire de
  changement à 320 px inspectés ; aucun débordement horizontal constaté.
- Les dimensions de test du navigateur sont rétablies après contrôle.
- Site public contrôlé dans le navigateur : nouvelle composition et logo
  chargés, identifiants fictifs refusés par l'API, formulaire remis à zéro.
  Les empreintes HTTPS du HTML, du JavaScript et du CSS correspondent au
  build local. Le logo servi est un PNG valide et visuellement conforme ;
  son encodage HTTP diffère du fichier source (944 917 contre 978 609 octets,
  réponse via HCDN), donc aucune égalité binaire du PNG n'est revendiquée.
- Après fermeture SSH : `/health` renvoie 200 avec base `up` et l'accès
  anonyme à `/api/v1/users` renvoie 401. Le serveur de test local a été arrêté.
- Le parcours utilisateur après changement de son vrai mot de passe et
  l'essai Android réel ne sont pas déclarés validés par ces contrôles visuels.

## Publication SSH

URL : https://lyne-restau.alikakonnect.com/gestion/

Archive allowlistée : `index.html`, CSS/JS compilés et logo uniquement.
SHA-256 vérifié avant extraction :
`8a73ed4c6f8cb212704d937b2cff6366d02b0fa3d13dd44a167f99b5884ab00e`.

Sauvegarde privée avant modification :
`/home/u748819186/lyne-app/backups/gestion-before-redesign-20260928-150235.tar.gz`.
Elle contient la gestion publique et la copie web privée précédente.

Build conservé dans `/home/u748819186/lyne-app/web-login-20260928`.
Nouveaux assets publiés avant remplacement atomique d'`index.html` sous
`public_html/gestion/`, et copie web de la release privée mise à jour.
Anciens assets conservés pour les pages déjà ouvertes et un retour arrière.
Aucun remplacement du HTML de la vitrine ni redémarrage de l'API nécessaire.

SHA-256 du nouvel index public :
`0194841791bf532cc258bac299aada82f15ac6b5c43f4ffd449857a1cbe451e1`.
Santé HTTPS après publication : HTTP 200, base `up`.

## Suite de Phase 2

La refonte du login ne livre pas encore le CRUD du personnel. Restent les
employés, fonctions, services, comptes associés et permissions administrables,
photos protégées et cartes imprimables, avec leurs migrations non destructives,
tests et recette. Statut d'un employé et statut de son compte restent séparés
conformément à RG-11. Pas de Phase 3 avant validation de la Phase 2 complète.
