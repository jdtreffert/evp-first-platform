# API Reference

Base path: `/api`. Request and response bodies are JSON. The health check `GET /` returns
plain text. The server listens on `PORT` (default 3000).

Except for `POST /auth/login`, `/auth/register`, `/auth/bootstrap`, and `/auth/verify`,
all API endpoints require the `evp_session` HttpOnly cookie. The browser must send
credentials (`credentials: "include"`). Cookie sessions last up to 12 hours and expire
after 30 minutes idle.

| Role | Events | Account administration |
|------|--------|------------------------|
| `administrator` | Read and write all patient records | Create patient invites; provision administrator and clinical accounts |
| `clinical` | Read all events; no writes | None |
| `patient` | Read/create/edit only linked patient record; cannot delete | None |

Patient `masterId` filters and ingestion fields are overridden by the server using the
account's linked patient record. Cross-patient uid replacement is rejected. No role may
delete events. Requests with an `Origin` header must match `FRONTEND_ORIGIN`.

## Errors

Errors use `{ "error": string, "details"?: [...] }`. Validation details are
`{ "path": string, "message": string }` entries.

| Status | When |
|--------|------|
| 400 | Malformed JSON, invalid request shape, or invalid query parameters |
| 404 | Event not found |
| 413 | Request body over 5 MB |
| 422 | Valid request, but the event cannot be accepted (unsupported type, normalization or validation failure) |
| 429 | Authentication request rate limit exceeded |
| 500 | Unexpected error; the body is always `{ "error": "Internal server error" }` |

## POST /api/events/ingest

Administrator and patient only. Normalizes, validates, and stores one event.

Request: `{ "id": string, "fields": { "Event_Type": string, ... } }`

```json
{ "id": "rec1", "fields": { "Event_Type": "ctDNA", "Event_UID": "E1", "Master_ID": "M1", "Event_Date": "2024-03-01", "ctDNA_Value": 0 } }
```

| Status | Meaning |
|--------|---------|
| 201 | Stored as a new event; body is the `UnifiedEvent` |
| 200 | An event with the same `uid` existed and was replaced; body is the `UnifiedEvent` |
| 400 | Invalid record shape, or missing `Event_Type` |
| 422 | Unsupported `Event_Type`, a select field value outside the schema options or a non-numeric number field (`details`), normalization failure, or the normalized event failed validation (`details`) |

`Master_ID` is required; `Event_Date` is optional but must be a real date if present.
See the [pipeline](./ingestion-pipeline.md).

The browser event-entry form currently covers diagnosis, TURBT/pathology, cytology,
imaging and response, cystoscopy and biopsy, somatic/germline testing, ctDNA/utDNA,
treatment start/change/response/outcome/regimen details, recurrence, progression,
quality of life, symptoms, labs, decisions, notes, other events, and document metadata.
File upload/storage is not implemented yet; document metadata does not attach a file.

## POST /api/events/batch

Administrator and patient only. Ingests up to 500 records independently. Valid records
are stored; invalid ones are reported. Patient records are forced to their linked `masterId`.

Request: `{ "records": [ { "id", "fields" }, ... ] }`

```json
{
  "summary": { "received": 3, "created": 1, "updated": 1, "failed": 1 },
  "results": [
    { "index": 0, "status": "created", "uid": "A" },
    { "index": 1, "status": "updated", "uid": "B" },
    { "index": 2, "status": "failed", "error": "Normalized event failed validation",
      "details": [{ "path": "eventDate", "message": "Invalid date: ..." }] }
  ]
}
```

| Status | Meaning |
|--------|---------|
| 200 | Batch processed. **Check `summary.failed`**; per-record failures do not change the status |
| 400 | Body is not `{ records: [...] }`, is empty, or exceeds 500 records; nothing stored |
| 413 | Body over 5 MB |

A failed `Storage error` entry means the record was not saved. Retrying is safe because saves
are upserts by `uid`; resend only the failures.

## POST /api/events/validate

Any authenticated role can check a `UnifiedEvent` without storing it. Always 200 for a
valid JSON request body; inspect `valid`.

```json
{ "valid": false, "errors": [{ "path": "uid", "message": "Invalid uid: ..." }] }
```

The body is a `UnifiedEvent`, not a raw record. See the [specification](../src/schemas/UnifiedEventSpec.md).

## GET /api/events/query

Lists stored events. All parameters are optional; unknown or invalid ones return 400.

| Parameter | Meaning |
|-----------|---------|
| `masterId`, `eventType` | Exact match |
| `from`, `to` | Inclusive `YYYY-MM-DD` range on the event's recorded calendar date; `from` must not be after `to`. Undated events never match a range |
| `order` | `asc` (default) or `desc` by event date. Undated events are always last; ties are broken by `uid` |
| `limit` | 1 to 500, default 50 |
| `offset` | Default 0 |

Response: `{ "events": [UnifiedEvent], "total": number, "limit": number, "offset": number }`.
`total` counts all matches before pagination.

## GET /api/events/:uid

Any authenticated role may read. Returns one `UnifiedEvent`: 200, 404 if no such event
(or if a patient requests an event belonging to another patient), 400 if `uid` is malformed.

## Authentication

All auth responses avoid revealing whether a login email or patient invite exists.

OTP email delivery requires SMTP configuration. `SMTP_HOST` and `SMTP_FROM` must be
configured together; `SMTP_USER` and `SMTP_PASSWORD` must also be paired. Submission
port 587 uses required STARTTLS, and port 465 uses implicit TLS. Without SMTP, login
request endpoints return their generic accepted response, but delivery to a registered
account fails with HTTP 503. Configure provider credentials through deployment secrets,
not committed environment files.

### POST /api/auth/login

Request `{ "email": "person@example.org" }`; returns 202 with a generic message. A
registered email receives a six-digit code. Codes expire after 10 minutes, allow five
incorrect attempts, and can be requested at most once per minute per email.

### POST /api/auth/register

Request `{ "email": "patient@example.org", "inviteCode": "..." }`; returns 202 with a
generic message. A valid, unused administrator-issued invite sends an OTP. The invite
is bound to one patient `masterId` and expires after seven days. The account is created
only after OTP verification; the invite is single-use.

### POST /api/auth/bootstrap

For first-administrator setup only. Request `{ "email": "...", "secret": "..." }`,
where `secret` matches `ADMIN_BOOTSTRAP_SECRET`. Returns 202 and sends an OTP. Once the
first administrator verifies the code, bootstrap is disabled.

### POST /api/auth/verify

Request `{ "email": "...", "code": "123456" }`. On success, returns `{ "user": ... }`
and sets the HttpOnly `evp_session` cookie. The session lasts 12 hours maximum and
expires after 30 minutes idle.

### GET /api/auth/me and POST /api/auth/logout

`GET /auth/me` returns the current public account or 401. `POST /auth/logout` revokes
that session and clears the cookie.

### POST /api/auth/invites (administrator)

Request `{ "masterId": "M123" }`; returns a single-use invite code and its expiry.

### POST /api/auth/accounts (administrator)

Request `{ "email": "...", "role": "clinical" }` or `"administrator"`. Creates the
account and sends a sign-in code. Patient accounts are created only by invite redemption.

## Example session

```sh
# Authenticate first; then send the evp_session cookie with event requests.
```

## Field schema

Field names, kinds and allowed values come from `UnifiedEventsSchema` and are kept in
`src/schemas/eventFieldCatalog.ts`; `src/schemas/eventTypeFields.ts` lists the fields entered for each
event type. Ingestion rejects select values that are not defined options. Normalizers read the schema
field names (for example `TURBT_Histology`) and still accept the earlier names (`Pathology_Histology`).
The web form is generated from the same two files.

Regenerate the catalog after editing the schema spreadsheet: export it as Excel "Unicode Text" and run
`node scripts/generateFieldCatalog.mjs <path to UnifiedEventsSchema.txt>` in `backend/`. Then update
`src/schemas/eventTypeFields.ts` if event types or their fields changed.

Any event may also carry one optional measurement: `Event_Measure_Type` (a schema option), a numeric
`Numeric_Value` and free-text `Numeric_Units`. Type and value must be given together; units are optional.
They are stored as `eventMeasureType`, `eventMeasureValue` and `eventMeasureUnits`.

Any event may also carry `Event_Related_UID` and `Event_Relationship` (`Produced_By`, `Triggered_By`,
`Assessed_By`, `Derived_From`, `Related_To`) to link it to another event, for example a Pathology
event produced by a TURBT. They are stored as `relatedEventUid` and `eventRelationship`.
