# Documentation API

## Phase 1 — disponible en recette

- Contrats REST versionnés sous `/api/v1`.
- OpenAPI/Swagger généré depuis les schémas Fastify + Zod de `packages/shared`.
- Swagger : `/api/docs/` ; schéma : `/api/v1/openapi.json`.
  Accès authentifié avec `permissions.read`, après changement initial du mot de passe.
- Santé sans authentification : `/health` et alias `/api/health` ; vérifie la base.
- Authentification : `POST /api/v1/auth/login`, `GET /api/v1/auth/me`,
  `POST /api/v1/auth/password`, `POST /api/v1/auth/logout`.
- Consultations autorisées : `GET /api/v1/users`, `/api/v1/roles`,
  `/api/v1/permissions`, `/api/v1/audit-logs`.
- Web : `X-Lyne-Client: web`, cookie HttpOnly/Secure en HTTPS et origine
  autorisée pour les mutations. Aucun jeton renvoyé dans le JSON de connexion web.
- Mobile : `X-Lyne-Client: mobile`, jeton opaque à la connexion, puis
  `Authorization: Bearer <jeton>` ; stockage client SecureStore.
- Pas de création/modification/suppression du personnel en Phase 1.

Serveur de recette : https://lyne-restau.alikakonnect.com ; voir
`../rapport-phase-1.md` pour les contrôles et limites.

## Domaines prévus dans les phases suivantes (spec §8)

Les domaines suivants ne sont pas des routes disponibles en Phase 1 :

  `/employees`, `/menu/*`, `/orders`, `/payments`, `/cash-sessions`,
  `/stock/*`, `/suppliers`, `/purchases`, `/expenses`, `/finance/summary`,
  `/reports`, `/notifications`, `/settings`, `/files`.
