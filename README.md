# Appointment Desk

Persistent appointment management for the existing Google Sheets workflow. This is a Next.js full-stack application with PostgreSQL through Prisma. Appointment status values remain `Missed`, `Held`, and `Sold`; imported spreadsheet columns are retained in `rawData` alongside normalized fields used by the dashboard.

## Local setup

1. Create a PostgreSQL database and copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the database connection string.
3. Install dependencies and create the first migration:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000`.

## Import the existing records

The supplied Google Sheets URL currently requires Google authentication, so the application does not guess or fabricate those records. In Google Sheets, open the source tab (`gid=1071544471`), choose **File > Download > Comma-separated values (.csv)**, then use **Import CSV** in Appointment Desk.

The importer:

- imports every row with a recognizable appointment date;
- maps common date, time, status, patient/client, provider, and notes headers;
- preserves every original header/value pair in `rawData`;
- reports rows that could not be imported because they had no recognizable date.

For a private sheet, the CSV export is the reliable one-time migration path. No Google credentials are stored in the browser.

## Production deployment

Deploy the Next.js app to Vercel, Azure App Service, or another Node-compatible host with a managed PostgreSQL database. Configure `DATABASE_URL` as a server-side environment variable, run the build, and apply migrations during release:

```bash
npm run db:generate
npm run db:migrate
npm run build
npm start
```

The API is available at `/api/appointments`, `/api/appointments/:id`, and `/api/import`. Dashboard totals are calculated from the filtered database query on every refresh and status update; no browser-only storage or hardcoded appointment counts are used.

## Validation

```bash
npm run lint
npm run build
```
