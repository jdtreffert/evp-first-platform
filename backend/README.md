# EVP First Backend

TypeScript + Express service built on a **Unified-Event architecture**. Every
event category is normalized into a single canonical model, `UnifiedEvent`
([src/types/UnifiedEvents.ts](src/types/UnifiedEvents.ts)).

## Pipeline

```
raw record { id, fields }
  -> detect Event_Type          (src/ingestion/detectEventType.ts)
  -> normalizerRegistry lookup  (src/normalizers/normalizerRegistry.ts)
  -> normalizer -> UnifiedEvent (pure, no I/O, input not mutated)
  -> validate UnifiedEvent      (src/schemas/unifiedEventSchema.ts)
  -> persist via EventRepository (src/persistence/)
  -> response
```

## Layout

```
src/
  app.ts, server.ts, index.ts
  controllers/   services/   routes/   middleware/
  ingestion/     schemas/    persistence/   normalizers/   types/   utils/
```

Conventions: strict TypeScript, named exports only, tests colocated in
`__tests__/` (Jest).

## API

Endpoints (full details, parameters and examples in the [API reference](docs/api.md)):

| Method and path | Purpose |
|-----------------|---------|
| `POST /api/events/ingest` | Normalize, validate and store one event (201 new, 200 replaced) |
| `POST /api/events/batch` | Ingest up to 500 records independently; failures are reported per record |
| `POST /api/events/validate` | Validate a `UnifiedEvent` without storing it |
| `GET /api/events/query` | Filter stored events by `masterId`, `eventType`, date range, with pagination |
| `GET /api/events/:uid` | Fetch one event |
| `POST /api/auth/login` | Request a passwordless email code |
| `POST /api/auth/verify` | Verify a code and establish a cookie session |
| `POST /api/auth/register` | Start invite-bound patient registration |
| `GET /api/auth/me` | Get the current account |
| `POST /api/auth/logout` | Revoke the current session |
| `GET /` | Health check |

All event endpoints require an authenticated session. Roles are enforced by the
backend: administrators have full read/write access, clinical users are read-only,
and patients are restricted to their linked `masterId`. No role can delete events.

## Authentication and configuration

Authentication uses a file-backed account/session repository and a provider-neutral
email interface. To enable OTP delivery, copy `.env.example` to `.env` and configure
the SMTP submission host, verified sender address, and (if required) paired credentials.
Port 587 uses STARTTLS; port 465 uses implicit TLS. TLS is required and limited to
TLS 1.2 or later. SMTP configuration is validated at startup. Without a configured
host and sender, the server starts but code requests fail with HTTP 503; no codes are
printed to logs. Keep provider credentials in an environment secret store in production,
not in source control.

Set `AUTH_SESSION_SECRET` to a random value of at least 32 characters and
`ADMIN_BOOTSTRAP_SECRET` to establish the first administrator once. The bootstrap
endpoint is disabled after an administrator account has been created. Use
`FRONTEND_ORIGIN` for the exact browser origin; cookie credentials are enabled only
for that origin.

OTP codes expire after 10 minutes, allow five failed attempts, and are rate-limited
per email and source IP. Sessions expire after 12 hours or 30 minutes idle and use
HttpOnly, SameSite=Lax cookies (Secure in production). Patient signup requires a
single-use administrator-issued invite bound to one `masterId`.

`EVP_AUTH_FILE` (default `data/auth.json`) configures account/session storage. Both
authentication and event stores contain sensitive data; the default `data/` directory
is git-ignored. See [the API reference](docs/api.md) for the role matrix and endpoints.

Example SMTP submission settings:

```dotenv
SMTP_HOST=smtp.example-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM=EVP First <codes@example.org>
SMTP_USER=provider-issued-username
SMTP_PASSWORD=provider-issued-password
```

Use the exact SMTP host, sender/domain verification, port, and credentials supplied by
your email provider. `SMTP_SECURE` can be omitted; port 465 then defaults to implicit
TLS and other ports default to STARTTLS.

## Persistence

Events are stored through the `EventRepository` interface
([src/persistence/eventRepository.ts](src/persistence/eventRepository.ts)); `uid` is the
identity and saving an existing `uid` replaces the event. The initial `FileEventRepository`
keeps a JSON file; a database store only needs to implement the same interface and be passed to
`createApp({ repository })`.

Configure the location with `EVP_DATA_FILE` (default `data/events.json`, relative to the
working directory). The store contains patient data: `backend/data/` is git-ignored and
should not be committed.

Uploaded documents are stored through the `DocumentStore` interface
([src/documents/documentStore.ts](src/documents/documentStore.ts)). `FileDocumentStore` keeps them
on local disk under `EVP_DOCUMENT_DIR` (default `data/documents`, also git-ignored). This is
development storage only: real patient documents from other people need encrypted storage,
backups, audit logging and malware scanning first.

## Documentation

- [Architecture](docs/architecture.md), including known limitations
- [Ingestion pipeline](docs/ingestion-pipeline.md)
- [Normalizer registry](docs/normalizer-registry.md)
- [API reference](docs/api.md)
- [UnifiedEvent specification](src/schemas/UnifiedEventSpec.md)

## Scripts

- `npm run dev` — run with tsx
- `npm test` — Jest
- `npm run build` / `npm start` — compile to `dist/` and run

`PORT` (default 3000) is read from the environment / `.env`.
