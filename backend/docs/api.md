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
| 413 | Request body over 5 MB (25 MB for document uploads) |
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
| `masterId`, `eventType`, `encounterUid` | Exact match |
| `withdrawn` | Events withdrawn as entered in error are left out by default. `only` lists just those (so they can be restored); `exclude` is the default |
| `from`, `to` | Inclusive `YYYY-MM-DD` range on the event's recorded calendar date; `from` must not be after `to`. Undated events never match a range |
| `order` | `asc` (default) or `desc` by event date. Undated events are always last; ties are broken by `uid` |
| `limit` | 1 to 500, default 50 |
| `offset` | Default 0 |

Response: `{ "events": [UnifiedEvent], "total": number, "limit": number, "offset": number }`.
`total` counts all matches before pagination.

## GET /api/events/:uid/history

Earlier versions of an event, oldest first: `{ "uid": string, "versions": [{ "event": UnifiedEvent, "supersededAt": string, "supersededByRole": string }] }`.
Patients can read the history of their own events only; other uids respond `404`.

Editing is done by posting the event again with the same `Event_UID`. The previous version is
kept in the history, `recordedAt` is preserved, and `lastModifiedAt` and `lastModifiedByRole` are
set. Versions are never removed, and an existing event cannot be moved to a different patient (`422`).
Clinical accounts cannot edit.

## POST /api/events/:uid/withdraw and /restore

Events cannot be deleted. An event entered in error, such as a duplicate, is **withdrawn** instead: it is kept,
with its history, but left out of queries unless `withdrawn=only` is asked for, so timelines, views and counts do
not show it. `POST /api/events/:uid/withdraw` takes an optional `{ "reason": string }` (at most 500 characters);
`POST /api/events/:uid/restore` undoes it. Administrators and patients (their own record only) may use them;
clinical accounts are read-only (`403`), and another patient's event responds `404`.

The server stamps `withdrawnAt`, `withdrawnByRole` and `withdrawnReason` on the event and `lastModifiedAt` and
`lastModifiedByRole`, and adds the previous version to the history, so who withdrew or restored an event, and
when, stays on record. Repeating a change already in effect does nothing. While withdrawn, an event cannot be
edited (`409`) and a new event cannot name it in `Event_Related_UID` (`422`); restore it first. Links that
already point to it are left as they are. Both return the updated `UnifiedEvent`.

## GET /api/events/:uid

Any authenticated role may read, including a withdrawn event. Returns one `UnifiedEvent`: 200, 404 if no such event
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

## Documents

Uploaded files are stored privately (never served statically) and linked to an event through
`Document_Attachment`, a list of document ids. Documents are immutable: no role can replace or
delete one, and attaching a corrected file creates a new document.

| Endpoint | Roles | Description |
|----------|-------|-------------|
| `POST /api/documents?masterId=...&filename=...` | administrator, patient | Body is the raw file with `Content-Type: application/octet-stream`. Patients always upload to their own record; the `masterId` query is required for administrators. Responds `201` with `{ id, originalName, contentType, size, uploadedAt }` |
| `GET /api/documents?masterId=...` | all | Metadata of every document stored for a patient, newest upload first: `{ "documents": [{ id, originalName, contentType, size, uploadedAt }] }`. `masterId` is required except for patients, who always get their own. Used to attach an existing document |
| `GET /api/documents/:id/meta` | all | The same metadata |
| `GET /api/documents/:id` | all | The file, sent as an attachment with `nosniff` and a locked-down content security policy |

Only PDF, PNG and JPEG files are accepted, identified from their content rather than the
file name, up to 25 MB (`415` for other types, `413` for larger files). Patients can read only
their own documents; other ids respond `404`. The server records the SHA-256 hash, the
uploader's role and the upload time with each document. Saving an event whose
`Document_Attachment` lists a document that does not exist for the same patient is rejected
with `422`. Files are kept under `EVP_DOCUMENT_DIR` (default `data/documents`).

## Encounters

An Encounter is a healthcare interaction that events arose from or were recorded in. It is a separate
lightweight entity, not an event type: it is never stored as an event and never replaces or duplicates
one. Its `Encounter_Date` is independent of the `Event_Date` of any event linked to it. Encounters follow
the same role rules as events (administrator and patient write, clinical read-only, patients confined to
their own record) and are never deleted.

| Endpoint | Roles | Description |
|----------|-------|-------------|
| `POST /api/encounters` | administrator, patient | Body `{ "id": string, "fields": {...} }`. `201` when created, `200` when an existing `Encounter_UID` is replaced. Responds with the stored encounter |
| `GET /api/encounters/query` | all | Optional `masterId`, `order` (`asc` or `desc`, default `desc` by date), `limit` (1 to 500, default 100) and `offset`. Responds `{ "encounters": [...], "total", "limit", "offset" }`. Patients are always limited to their own record |
| `GET /api/encounters/:uid` | all | One encounter; `404` for an unknown uid or another patient's encounter |
| `GET /api/encounters/:uid/history` | all | Earlier versions, oldest first, in the same shape as event history |

Fields: `Encounter_UID` (defaults to the record `id`), `Master_ID` and `Encounter_Date` (a real
`YYYY-MM-DD` or an ISO 8601 date-time) are required; `Encounter_Type` (a defined option) and
`Encounter_Summary` are optional. Any other field is dropped. A patient's `Master_ID` is set by the
server. The encounter is stored as `{ uid, masterId, encounterDate, encounterType, encounterSummary,
documentAttachment, documentType, documentRedactionStatus, payload }` with the same server-set `recordedAt`,
`recordedByRole`, `lastModifiedAt` and
`lastModifiedByRole` as events. Editing is a repeat post with the same `Encounter_UID`: the earlier
version is kept, `recordedAt` is preserved, and the encounter cannot be moved to another patient (`422`).

**Encounter documents.** An encounter may carry `Document_Attachment` (a list of document ids, each listed
once), `Document_Type` and `Document_Redaction_Status`, using the same options as events. Every id must name
an existing document stored for the same patient, otherwise the encounter is rejected with `422`. These
documents document the encounter itself, for example a visit summary, so one file is attached once instead of
to every event. They are kept separate from the documents attached to individual events and are never copied
onto them; a view shows both, labelled. Replacing the list is an ordinary edit with history, and the documents
themselves are never changed or deleted.

### Linking an event to an encounter

Any event may carry an optional `Encounter_UID`, stored as `encounterUid`. It means the event was
performed, collected, assessed or recorded as part of that encounter. It must refer to an existing
encounter for the same patient, otherwise the event is rejected with `422`. An event has at most one
encounter, and a missing `Encounter_UID` means unknown, not "no encounter occurred". Membership is never
inferred from matching dates. `GET /api/events/query?encounterUid=...` lists an encounter's events.
Encounters are stored in `EVP_ENCOUNTER_FILE` (default `data/encounters.json`).

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

A few event types require a field: `requiredEventTypeFields` in `eventTypeFields.ts` (today only
`Disease_Status`, which requires `Disease_Status_Category`). A record without it is rejected with `422` by
`/ingest` and `/batch`, and `/validate` reports it; every other event type has no required fields, so events that
were valid before stay valid. The generated `EventTypeFields` table lists the required fields.

Regenerate the catalog after editing the schema spreadsheet: export it as Excel "Unicode Text" and run
`node scripts/generateFieldCatalog.mjs <path to UnifiedEventsSchema.txt>` in `backend/`. Then update
`src/schemas/eventTypeFields.ts` if event types or their fields changed.

Any event may also carry one optional measurement: `Event_Measure_Type` (a schema option), a numeric
`Numeric_Value` and free-text `Numeric_Units`. Type and value must be given together; units are optional.
They are stored as `eventMeasureType`, `eventMeasureValue` and `eventMeasureUnits`.

Any event may also carry `Event_Related_UID` and `Event_Relationship` (`Produced_By`, `Triggered_By`,
`Assessed_By`, `Derived_From`, `Follow_up_to`, `Related_To`) to link it to another event, for example a Pathology
event derived from a TURBT. They are stored as `relatedEventUid` and `eventRelationship`.
`Event_Related_UID` must refer to an existing event for the same patient, otherwise the event is
rejected with `422`. The entry form offers events for the same patient, by event type (the full table is in
[schema-tables.md](schema-tables.md)). The date rule is either a number of days either side of the event's
date, a number of days before it, or every event on or before it (the 100 most recent of each type):

- Imaging offers Imaging (default relationship `Follow_up_to`), Symptom, Pathology, Decision, Recurrence, Progression and Treatment_Response, on or up to 180 days before.
- Imaging_Response offers Imaging, on or up to 30 days before.
- Disease_Status offers Imaging, Imaging_Response, Cystoscopy, Cystoscopy_Biopsy, Cytology, Pathology, ctDNA, utDNA, Treatment_Response, Recurrence, Progression and Disease_Status, on or before the event date (default relationship `Derived_From`, `Follow_up_to` for an earlier Disease_Status). Only one supporting event can be named, because an event has a single `Event_Related_UID`; the other evidence stays as its own events.
- Recurrence and Progression each offer Imaging, Cystoscopy, Cystoscopy_Biopsy, Cytology, Pathology, ctDNA and utDNA, on or up to 90 days before (default relationship `Derived_From`): the evidence the finding was recognised from.
- Cystoscopy offers Symptom and Imaging, within 90 days.
- TURBT offers Cystoscopy, and Pathology offers TURBT and Cystoscopy_Biopsy, within 30 days.
- Diagnosis offers Cystoscopy, Cystoscopy_Biopsy, Pathology and Imaging; Decision offers Diagnosis; Treatment_Start offers Decision and Diagnosis; all within 90 days.
- Treatment_Delivery offers Treatment_Start and Treatment_Change; Treatment_Change offers Treatment_Start, Treatment_Change, Symptom and Treatment_Response; Symptom offers Diagnosis, Treatment_Start, Treatment_Change, Treatment_Delivery and Procedure; ctDNA offers Diagnosis, Treatment_Start, Treatment_Delivery, Treatment_Response, Recurrence and Progression; Procedure offers Procedure, TURBT, Symptom, Imaging, Diagnosis, Treatment_Start and Treatment_Change; all on or before the event date.

The default relationship is `Derived_From` for Pathology, Diagnosis, Imaging_Response, Recurrence, Progression and Disease_Status and `Related_To` for the rest.
Other event types offer no picker.

## Recorded-at provenance

`Event_Created_At` is the full timestamp at which an event entered the repository. It is set by the server (ISO 8601) when the event is first saved and preserved on later replacement; client-supplied `Event_Created_At` and `Event_ID` values are ignored. The stored event also carries `recordedByRole`, plus `lastModifiedAt` and `lastModifiedByRole` after a replacement. `Event_Date` remains the clinical or report date. `Pathology_Report_Date` was removed; a Pathology event's `Event_Date` is its report date.
