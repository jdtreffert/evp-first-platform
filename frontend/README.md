# EVP First Frontend

React, TypeScript, and Vite client for the EVP First backend.

## Local development

1. Start the backend from `backend/` with `npm run dev`.
2. Set `VITE_API_BASE_URL` if the API is not at `http://localhost:3000/api`.
3. Start the client from `frontend/` with `npm run dev`.

The backend must allow the frontend origin through `FRONTEND_ORIGIN`. Authenticated
requests use the HttpOnly session cookie (`credentials: include`); the browser does
not receive or store OTP/session secrets in JavaScript.

## Patient journey

The Timeline tab loads persisted UnifiedEvents through the authenticated query API.
Patients are automatically scoped to their linked patient record; administrators and
clinical users must enter a patient master ID before loading a timeline. Patients and
administrators can submit events; clinical users are read-only.

The event-entry form maps its fields to registered backend normalizers for diagnosis,
TURBT/pathology, cytology, imaging and response, cystoscopy and biopsy, somatic and
germline testing, ctDNA and utDNA, treatment subtypes, recurrence, progression, quality
of life, symptoms, labs, decisions, notes, other events, document metadata, and event
measures. The backend remains authoritative for normalization, validation, ownership,
and persistence. Document metadata can be entered, but document file upload/storage is
not yet available.

## Checks

- `npm run build` — TypeScript project build and Vite production bundle
- `npm run lint` — ESLint
