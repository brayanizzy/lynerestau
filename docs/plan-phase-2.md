# Phase 2 — plan de reprise

La récupération et la correction du socle sont autorisées le 6 octobre 2026.
Le 8 octobre, l'utilisateur demande la reprise depuis les archives du serveur
et le versionnement dans GitHub. Cette décision remplace la suspension des commits.

1. Récupérer et sauvegarder les sources, configuration et schéma : réalisé.
2. Réparer la compilation, les contrats et le connecteur DB ; tester les autorisations et CRUD : réalisé.
3. Mettre le web/API à disposition pour recette, vérifier HTTPS et les parcours : en cours.
4. Réconcilier le SQL original manquant de la migration Personnel sans changer silencieusement l'historique.
5. Compléter le Personnel mobile et la recette Android réelle, tester photos privées et impression des cartes.
6. Rapport et validation utilisateur avant Phase 3.

Voir rapport-reprise-20261006.md.

Reprise cloud du 8 octobre : sources importées, dépendances installées, compilation
web, typages web/mobile, lints et 54 tests vérifiés. La génération Prisma depuis
zéro attend l'accès réseau à son moteur officiel ; les tests ont réutilisé le
client généré de la release, après comparaison du schéma. Les contrôles d'intégration
de la release passent sur une base locale isolée. Voir
`rapport-reprise-cloud-20261008.md` avant toute migration ou publication serveur.
