# Reprise du projet — 6 octobre 2026

## Décision utilisateur

Reprendre les corrections et la récupération, privilégier SSH pour le développement et les interventions serveur, suspendre temporairement les commits Git. La Phase 2 reste le périmètre autorisé ; validation avant la phase suivante.

## Récupération et sauvegardes

- Sauvegarde locale préalable : .tmp/recovery-20261006-346be2f7/ (sources présentes et historique).
- 74 fichiers suivis absents récupérés sans écraser les fichiers présents ; rapport du lot connexion récupéré.
- Charte rouge/noir/blanc et contrats Personnel récupérés depuis les états conservés.
- API Personnel reconstituée depuis la release compilée avec annotations TypeScript et schéma Prisma retrouvé dans le client généré.
- Configuration MySQL locale récupérée par SFTP depuis le fichier privé serveur, sans affichage de valeurs. Aucun secret SSH enregistré dans le projet.
- Backup serveur DB : /home/u748819186/lyne-app/backups/recovery-20261006-bcb2e96a.sql (20 595 octets, mode 600).
- Backup web/config API : /home/u748819186/lyne-app/backups/web-api-before-recovery-20261006.tar.gz.

## Corrections

- Client web : réponses JSON invalides traitées en français ; affichage de session révoqué sur HTTP 401, même sans JSON.
- Personnel : retour à une page valide après réduction du nombre de fiches.
- Connecteur Prisma/MariaDB : protocole texte paramétré activé après diagnostic réel. Le protocole binaire échouait avec LIKE (erreur MariaDB 1267), le protocole texte passe. Aucune collation de table modifiée.
- Changement de mot de passe : incrément de version de compte conservé.
- Photos : dossier privé hors public_html configuré dans le chargeur serveur.
- Outils npm 11.19.1 récupérés depuis le registre officiel avec intégrité SHA-512 contrôlée. Dépendances réinstallées et scripts natifs nécessaires autorisés par version.
- source-map-js mis à jour de 1.2.1 à 1.2.2.

## Vérifications

- Build shared/UI/API/admin-web et typage mobile : réussi.
- Typage complet, lint racine et mobile : réussis.
- Schéma Prisma : valide.
- 54 tests Vitest réussis (authentification, réponses API, login, permissions Personnel, conflits de version, protection administrateur et photos invalides).
- Intégration réelle sur serveur : CRUD personnel/comptes/rôles, fonctions/services, confidentialité salaire, unicités, versions, archivage/restauration, cartes, réinitialisation et révocation, audit. Transaction annulée ; compte réel inchangé et aucune donnée de démonstration persistante.
- Contrôle responsive local de la connexion : desktop et 390 px, logo chargé et aucun débordement horizontal. Le preview statique n'a pas d'API ; sa réponse initiale inattendue ne constitue pas un défaut du service public.

## Base et réserve obligatoire

La base possède déjà la migration 20260928170000_personnel appliquée le 28 septembre. Aucune migration, modification de permissions ou seed n'a été exécuté dans cette reprise. Le SQL original de cette migration reste manquant. Son checksum serveur est conservé ; la reconstruction est isolée dans database/recovery/ et ne doit pas être appliquée une deuxième fois. db:deploy est désormais précédé d'un contrôle des SQL et empreintes de migrations déjà appliquées. Une réconciliation explicite est nécessaire avant une migration suivante ou une installation neuve complète.

## Dépendances et limites

Audit du verrouillage API de la release : aucun avis connu. L'audit complet conserve trois avis racines : braces et node-forge (élevés), decode-uri-component (modéré), propagés à 22 paquets (19 élevés, 3 modérés). Les versions stables courantes de braces et node-forge sont encore signalées ; aucun override incompatible n'a été forcé.

Le mobile récupéré reste le socle d'authentification de Phase 1 ; son Personnel, une recette Android réelle, l'impression physique, les sauvegardes automatisées et la restauration testée restent à réaliser. La Phase 2 n'est pas clôturée.

## Release de recette

Release privée : /home/u748819186/lyne-app/phase2-recovery-20261006. Archive finale SHA-256 : 3c5ea8f935d8c0a5c9942c5bcec4a7995a2413a67489ce3df068cd47409cb4ff. Activation HTTPS en cours de vérification ; ne pas considérer la seule modification de .htaccess comme une preuve de bascule.
