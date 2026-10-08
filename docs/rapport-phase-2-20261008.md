# Phase 2 — livraison de code du 8 octobre 2026

Le module Personnel mobile complète maintenant l’administration web récupérée.
Le code est prêt pour la recette ; la clôture fonctionnelle attend les essais
sur téléphone et la validation utilisateur. Aucune Phase 3 n’a été commencée.
Aucun changement n’a été appliqué à Hostinger dans cette intervention.

## Livré

- Mobile : liste paginée, recherche, filtres statut/archives, création et édition
  des fiches, fonctions/services, compte existant associé, salaire selon permission,
  archivage et restauration motivés, conflits de version sans écrasement forcé.
- Photo depuis la galerie : limite 2 Mo/16 MP, stockage serveur privé, accès
  authentifié, normalisation JPEG et suppression EXIF. Les photos consultées sur
  mobile restent en mémoire ; aucun jeton n’est placé dans leur URL.
- Carte mobile : logo LYNE, identité, matricule, fonction/service et photo ;
  HTML échappé, 85,6 × 54 mm sur A4, impression native avec nouvelle vérification
  des droits et du statut juste avant impression. Les salaires et coordonnées
  privées sont exclus. L’impression du navigateur reste dans l’administration web.
- Administration des comptes, rôles, mots de passe temporaires et permissions :
  disponible dans le web existant. Le mobile associe les comptes déjà créés.
- Sessions : client réseau partagé, réponses validées, PATCH pris en charge,
  déconnexion locale sur 401 même si un proxy renvoie du HTML. Le retour depuis
  la galerie vérifie la session sans effacer inutilement le formulaire.
- Base neuve : historique distinct et complet, bootstrap refusé si la base
  contient déjà des objets ; contrôle des empreintes avant les migrations suivantes.
  Voir `database/baseline/README.md`.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| Installation verrouillée Node 24 / npm 11.19.1 | Réussie, suivie du build complet |
| Génération Prisma officielle et validation du schéma | Réussies sans contournement TLS/checksum |
| Builds shared/UI/API/web + types mobile | Réussis |
| Types de tous les workspaces et lints racine/mobile | Réussis |
| Vitest | 66 tests, 7 fichiers, aucun échec |
| Export Android Expo SDK 57 | Réussi, 1 381 modules et 28 assets |
| Nouvelle base MariaDB 11.8.6 | Migration et seed réussis ; deuxième seed conserve le compte |
| Migration baseline répétée | Aucune migration en attente |
| Comparaison DB / schéma Prisma | Aucune différence |
| Bootstrap sur base remplie / mauvais historique | Refus attendus vérifiés |
| Intégration du livrable sur DB réelle locale | Réussie, données de test annulées, administrateur inchangé |
| Photos par HTTP authentifié | Accès anonyme 401, JPEG privé no-store, EXIF retiré, conflit 409, retrait puis 404 |
| Carte dans Chromium | Logo chargé, dimensions exactes vérifiées, PDF produit |
| Démarrage et redémarrage API source + Vite | Santé 200, gestion 200, session absente 401 |

L’intégration vérifie également les contraintes uniques, le masquage du salaire,
les droits, les comptes, les rôles, la révocation, les versions, les cartes actives,
l’archivage sans désactivation du compte et l’absence de secrets dans l’audit.
Les tests de photos utilisent un dossier temporaire supprimé en fin de test.
Le cloud démarre désormais le code compilé depuis les sources, plus l’ancienne archive.

L’export Android est un bundle JavaScript/Hermes : ce n’est pas un APK signé.
Aucun essai Android/iOS physique, sélecteur photo natif ou dialogue d’impression
n’est présenté comme exécuté. Le PDF Chromium ne remplace pas l’impression réelle.

## Dépendances

Audit au moment de cette livraison : arbre de développement, 24 signalements
(19 élevés, 5 modérés, aucun critique). Livrable API, 2 modérés, aucun élevé/critique.
Les deux modérés du livrable correspondent au connecteur MariaDB et à son parent
Prisma : GHSA-cx2f-j9fh-8g68 (authentification ed25519 avec TLS automatique).
Le connecteur reste à la version compatible verrouillée 3.4.7 ; la correction
3.5.4 devra être validée avec l’adaptateur et le serveur avant remplacement.
Les autres avis concernent principalement l’outillage Expo ; aucune mise à jour
majeure forcée n’a été appliquée. Les anciens rapports d’audit restent historiques.

## Installation et livraison

Les sources sont versionnées dans `brayanizzy/lynerestau`. Le livrable web/API est
préparé dans `.tmp/phase2-20261008`, avec un lockfile de production et son contrôle
`verify-phase2.mjs`. Il ne contient ni `.env`, ni dump, ni photo privée.
Les sources mobiles restent dans `apps/mobile` ; l’export est dans `.tmp/mobile-phase2`.

Le script d’installation cloud et les instructions de démarrage ont été actualisés
et enregistrés dans le brouillon d’environnement. Leur enregistrement ne publie
pas la nouvelle snapshot et ne déploie pas Hostinger. Relire, enregistrer et publier
les paramètres cloud pour conserver cette nouvelle configuration.

La base de développement `lyne_phase2_baseline_verified` est privée au cloud.
L’ancienne base de test est conservée. Le serveur existant continue d’utiliser
son historique d’origine ; son SQL `20260928170000_personnel` reste absent des
archives. Le contrôle bloque toute future migration historique tant que ce point
n’est pas réconcilié. Le nouveau bootstrap ne doit jamais être exécuté sur Hostinger.

## Recette avant clôture

1. Installer un build de développement Expo SDK 57 sur un téléphone, avec
   `EXPO_PUBLIC_API_URL=https://lyne-restau.alikakonnect.com` (sans `/api` final).
   Les nouveaux modules natifs exigent un build actualisé ; les identifiants EAS
   et la signature ne sont pas configurés ici.
2. Se connecter, vérifier le changement initial obligatoire si applicable et ouvrir
   Personnel. Créer une fiche de recette clairement identifiée, rechercher, modifier,
   associer une fonction/service et un compte. Utiliser « Actualiser » après un retour
   à une liste déjà ouverte.
3. Choisir une photo, annuler le sélecteur puis recommencer ; vérifier les saisies
   conservées et le refus d’un fichier trop grand. Préparer et imprimer la carte
   à 100 % ; contrôler logo/photo/nom/matricule et le format physique.
4. Avec un rôle limité, vérifier l’absence du salaire, des écritures et de l’impression
   non autorisées. Modifier simultanément une fiche sur web/mobile : le deuxième
   enregistrement doit demander un rechargement.
5. Archiver puis restaurer avec un motif ; le compte associé conserve son état.
   Révoquer le compte/rôle depuis le web et vérifier le refus d’accès mobile.
6. Confirmer la recette et traiter la réconciliation des migrations historiques
   avant de passer à la Phase 3.

Le déploiement distant reste non exécuté : le canal SSH de cet environnement
n’était pas utilisable lors de la reprise. Un build EAS signé et une installation
sur appareil restent nécessaires pour la recette mobile finale.
