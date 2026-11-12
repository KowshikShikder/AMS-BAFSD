# Application Tracking System

A Next.js (JavaScript, App Router) + MongoDB prototype for an application-tracking desk
with color-coded statuses, role-based admin access, PDF receipts, Excel export, and
SMS notifications on status change.

## Stack
- Next.js 14 (App Router, JavaScript — no TypeScript)
- MongoDB + Mongoose
- JWT auth via `jose` (httpOnly cookie), passwords hashed with `bcryptjs`
- `pdfkit` for per-application PDF receipts
- `exceljs` for admin Excel export
- Pluggable SMS sender (logs to console in demo mode; wire up a real gateway via `.env`)

## What's new in this update (v3)

1. **Admission by default** – the admin/staff list opens on Admission applications (change the Type filter for others).
2. **Serial ordering** – Bangla Version KG→X, then English Version KG→X (XI/XII follow X); inside each class: applications with **Reference** first, then those with **Remarks**, then the rest (oldest first). Done in MongoDB aggregation, paginated.
3. **Clickable headline cards** – only *Approved*, *Short Listed*, *Applied* are shown; click one to filter the list (click again to clear).
4. **New Entry has document upload** – pick a document type + file, queue several, they upload when you submit.
5. **Any file, auto-converted to < 200 KB** – images are resized/re-encoded; big PDFs are turned into images (one JPEG per page, max 10 pages). Small PDFs stay PDFs. pdf.js is vendored in `public/vendor/pdfjs/`.
6. **Seat view** – Class column is fixed (sticky) while scrolling on mobile, *Section* is left of *Sup(+) Vac(-)*; negative = green (deeper as it gets more negative), positive = red (deeper as it grows), zero = white (`seatStatusStyle()` in `lib/constants.js`).
7. **One serial number** – no separate Tracking ID. Format `<session><0001>`, e.g. `270001` (session from `APP_SESSION` in `.env`, default `27`). The serial is also the tracking number.
8. **BV / EV** shown in the list.

**Existing database?** Run `npm run migrate:serial` (dry run) then `npm run migrate:serial -- --yes` once: it drops the old `trackingId` index and renumbers old records to the new serial format (old ids are kept in `legacy`).

## Earlier update

- **Detail popup reorganized**: Name / Reference, Version / Shift, Class /
  Category, Exam Marks up top; Seat & Section box (bordered, centered,
  negative = green, positive = red — matches internal convention); then
  Update Status → Status Timeline → Documents → Update Exam Marks, in that
  order.
- **"Find & Update by ID"** box on the dashboard — look up any application by
  Serial Number and it opens the same rich detail popup (status,
  marks, documents all editable there), replacing the old marks-only batch
  button for one-off edits.
- **Batch Import is now an upsert**: a row with a Serial No that
  matches an existing application **updates** it (including Status and Exam
  Marks); a row with no match **creates** a new one. Status is taken from the
  sheet when given (not forced to "Applied").
- **Downloadable import template** (Super Admin → "Download Import Template")
  — an .xlsx with the correct headers and dropdown validation on every
  fixed-choice column (Type, Class, Version, Shift, Group, Category, Status),
  so batch import stops failing on case/spelling mismatches.

## What's new in the previous update

- **More statuses**: Called For Exam, Attended Exam, Absent on Exam, Selected For
  Re-Exam (internal-only, same as Seen/Short Listed — public tracker still only
  ever shows Applied/Approved/Declined).
- **Pagination** on the admin dashboard (20 per page).
- **Fixed status counts** — the "Applied" (etc.) numbers now come from a real
  aggregation over the full filtered set, not just the current page.
- **Fixed the batch import bug** — the exported sheet's Type column prints the
  human label ("Admission"), but the old importer only accepted the raw value
  ("admission"). `resolveApplicationType()` / `resolveStatus()` in
  `lib/constants.js` now accept either, case/spacing-insensitive.
- **Guardian Name** field on Admission / Shift Change / Version Change.
- **Exam marks** shown on the application profile, editable in the detail popup.
- **"Marks-wise list"** checkbox on the dashboard sorts by marks descending.
- **Seat & Section capacity** — `/admin/seats` grid to enter Status and
  Section counts for every Version × Shift × Class combination, surfaced in
  each application's detail popup.

## Roles & permissions

| Role | Can | Sees |
|---|---|---|
| `super_admin` | Everything, incl. Excel import/export | All applications |
| `admin_principal` | Change status (Seen/Short Listed/Approved/Declined) | All applications |
| `admin_office` | Change status | All applications |
| `admin_officer` | View only, no status changes | All applications |
| `entry` | Create applications | Only what they personally entered |

All logged-in roles can submit new applications via **New Entry**
(`/admin/dashboard` → `/admin/entry`); only a logged-in user may set a
**Manual App Sl** — the public form never exposes it. Add more users with
`npm run seed:admin` (set `SEED_ADMIN_ROLE`, `SEED_ADMIN_EMAIL`, etc. per user).

## Select-field options

Version, Shift, Class, Group, and Category are fixed dropdowns:
- **Version**: Bangla, English
- **Shift**: Morning, Day
- **Class**: KG, I–XII
- **Group** (Admission only, shown for Class IX/X/XI/XII): Science, B. Studies, Humanities
- **Category**: Civil, BAF, SD, SEMC, Navy, Army

Edit the lists in `lib/constants.js` (`VERSIONS`, `SHIFTS`, `CLASSES`, `GROUPS`, `CATEGORIES`).

## Privacy on the public tracker

The public `/track` page requires **both** the Serial Number and the mobile
number used at submission — this prevents anyone from browsing other
applicants' records with just a serial number. The admin search box also
matches phone numbers.

## 1. Install

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- `MONGODB_URI` — point at your MongoDB instance (local or Atlas)
- `JWT_SECRET` — a long random string
- `SEED_ADMIN_*` — credentials for the first admin account
- `SMS_*` — optional; leave blank to just log SMS messages to the console

## 3. Create the first admin user

```bash
npm run seed:admin
```

This creates one `admin` role user using the `SEED_ADMIN_*` values in `.env`.
Staff accounts can be added the same way (insert directly into the `users`
collection with `role: "staff"`, or extend the seed script).

## 4. Run

```bash
npm run dev
```

- Public application form: `http://localhost:3000/`
- Public tracking page: `http://localhost:3000/track`
- Staff/Admin login: `http://localhost:3000/admin/login`
- Admin dashboard (ledger, filters, status updates, PDF, Excel export):
  `http://localhost:3000/admin/dashboard`

## How it maps to the spec

**Application types** (`lib/constants.js` → `APPLICATION_TYPES`):
1. Admission — version, shift, class, name, category, remarks, reference
2. Shift Change — version, shift, class, reqShift, name, category, remarks, reference
3. Version Change — version, shift, class, reqVersion, reqShift, name, category, remarks, reference
4. Miscellaneous — subject, class, requirement, remarks, category, reference

The public form (`components/ApplicationForm.js`) switches field sets per type;
the admin ledger table and Excel export show all fields side by side.

**Status workflow & colors** (`lib/constants.js` → `STATUS_COLORS`):
| Status | Color |
|---|---|
| Applied | White |
| Seen | Blue |
| Short Listed | Green (light) |
| Approved | Green (solid) |
| Declined | Red |

Rendered via `components/StatusBadge.js` everywhere a status appears (ledger table,
tracking timeline, status-change modal).

**Application model** (`models/Application.js`):
- `appSl` — the single serial number (also the tracking number), format `{APP_SESSION}{0001}` e.g. `270001`
- `type`, `name`, `class`, `version`, `shift`, `reqShift`, `reqVersion`, `subject`,
  `requirement`, `category`, `remarks`, `reference`, `phone`
- `status` + `statusHistory[]` (status workflow trail, each entry has who/when/note)
- `timestamps: true` → `createdAt` / `updatedAt`

**Auth & roles**:
- JWT stored in an httpOnly cookie, verified in `middleware.js` (edge-safe via `jose`)
- Roles: `admin` (full control, incl. Excel export) and `staff` (review + change status)
- Public "Applicant" role has no login — they interact only via the public
  application form and the public tracking-by-ID page, matching "Apply + Track"
  from the spec
- `models/ActivityLog.js` records logins and every status change (who/when/from→to/note)

**Features delivered**:
- ✅ Single auto serial (= tracking number)
- ✅ Status workflow with color badges
- ✅ Public tracking API (`/api/track/[serial]`) + page (`/track`)
- ✅ JWT admin authentication + role-based access control + API protection middleware
- ✅ Admin activity log
- ✅ Applicant application form UI (multi-type)
- ✅ Public tracking page with status timeline
- ✅ PDF auto-generator (`/api/applications/[id]/pdf`)
- ✅ Admin status-change modal
- ✅ Excel export (admin-only, `/api/applications/export`)
- ✅ SMS integration (pluggable — logs in demo mode, sends via configured gateway)
- ✅ Role-based dashboard (admin/staff see the ledger + tools; export is admin-only)

## Notes / next steps for production
- Add a "create staff user" screen (currently via the seed script / direct DB insert)
- Add pagination controls to the dashboard UI (the API already supports `page`/`limit`)
- Wire a real SMS gateway in `lib/sms.js` (the fetch payload is a placeholder —
  match it to your provider's API)
- Consider rate-limiting the public `POST /api/applications` endpoint
#   A M S - B A F S D  
 