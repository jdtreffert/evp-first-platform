EVP First Backend — README
Overview
The EVP First backend is a TypeScript + Express service that integrates with Airtable to manage patient onboarding, longitudinal events, diagnosis, treatment, and master records. The backend exposes a clean REST API, uses a layered architecture (routes → controllers → services → integrations), and includes middleware for error handling and validation.

This backend is designed for clarity, maintainability, and incremental expansion as the EVP First platform grows.

Tech Stack
Node.js + Express — HTTP server and routing

TypeScript — static typing and maintainability

Airtable API — primary data store

Zod — schema validation (optional, added after initial testing)

dotenv — environment variable management

Project Structure
Code
src/
  server.ts
  routes/
  controllers/
  services/
  integrations/
    airtable/
  middleware/
  utils/
  types/
    schemas/
      params/
config/
.env
package.json
tsconfig.json
Key Directories
routes/ — Defines API endpoints

controllers/ — Handles request/response logic

services/ — Business logic + Airtable operations

integrations/airtable/ — Airtable client + table references

middleware/ — Error handler, body validation, parameter validation

types/ — TypeScript interfaces + Zod schemas

utils/ — Small helpers (UID generation, etc.)

config/ — Centralized Airtable configuration

Environment Variables
Create a .env file in the project root:

Code
PORT=3000
NODE_ENV=development

AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

AIRTABLE_TABLE_ACCOUNTS=Accounts
AIRTABLE_TABLE_MASTER=Master
AIRTABLE_TABLE_DIAGNOSIS=Diagnosis
AIRTABLE_TABLE_TREATMENT=Treatment
AIRTABLE_TABLE_EVENTS=Events

LOG_LEVEL=debug
ENABLE_STACK_TRACE=true

JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
Airtable Configuration
Located at:

Code
src/config/airtable.ts
This module loads Airtable environment variables and exposes them to the Airtable client.

Running the Backend
Install dependencies
Code
npm install
Start the server
Code
npm run dev
Server runs at:

Code
http://localhost:3000
Health check:

Code
GET /
API Structure
All API routes are mounted under:

Code
/api
Account
POST /api/account/create

POST /api/account/update

Master
GET /api/master/:masterId

POST /api/master/update

Diagnosis
GET /api/diagnosis/:masterId

GET /api/diagnosis/record/:id

Treatment
GET /api/treatment/:masterId

GET /api/treatment/record/:id

Events
GET /api/events/:masterId

GET /api/events/record/:id

Event Ingestion
POST /api/ingest/ingest

Onboarding
POST /api/onboarding/submit

Middleware
Error Handler
Automatically catches and formats errors:

Code
src/middleware/errorHandler.ts
Registered last in server.ts.

Body Validation (Zod)
Used for POST routes once payload shapes are confirmed:

Code
src/middleware/validate.ts
Parameter Validation
Optional for GET routes:

Code
src/middleware/validateParams.ts
Services Layer
Each service encapsulates Airtable operations and business logic:

AccountService

MasterService

DiagnosisService

TreatmentService

EventService

EventIngestionService

OnboardingEventMapper

This keeps controllers thin and logic centralized.

Development Workflow
Build routes, controllers, services

Test all endpoints with Postman

Confirm Airtable connectivity

Validate payload shapes

Add Zod validation

Harden error handling

Expand features incrementally

Future Enhancements
Authentication (JWT)

Role-based access

Audit logging

Bulk ingestion endpoints

Scheduled tasks (e.g., nightly sync)

Migration to PostgreSQL or DynamoDB if needed

License
Internal project — no public license.
