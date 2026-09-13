# Appointment Desk

Persistent appointment management for the existing Google Sheets workflow. This is a Next.js full-stack application with local XAMPP MySQL through Prisma. Appointment status values remain `Missed`, `Held`, and `Sold`; imported spreadsheet columns are retained in `rawData` alongside normalized fields used by the dashboard.

## Local setup

1. Install XAMPP and start **MySQL** in the XAMPP Control Panel.
2. The local database `appointment_tracker` and `.env` connection have already been configured for the default XAMPP root account.
3. Install dependencies and synchronize the schema:

```bash
npm install
npm run db:push
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

The provided workbook `Appointment Tracker - PH (1).xlsx` has been imported from its `2023`, `2024`, `2025`, and `2026` sheets. The import created 3,914 records in XAMPP. To repeat the import with another workbook:

```bash
$env:DATABASE_URL='mysql://root@127.0.0.1:3306/appointment_tracker'
npm run db:import-workbook -- "C:\path\to\Appointment Tracker.xlsx"
```

The importer keeps the original workbook values in `rawData`. `Held` maps to Held, `SOLD` maps to Sold, and other original statuses are retained in `rawData` while contributing to Missed dashboard totals.

## Local database details

The app connects to:

```text
mysql://root@127.0.0.1:3306/appointment_tracker
```

The API is available at `/api/appointments`, `/api/appointments/:id`, and `/api/import`. Dashboard totals are calculated from the filtered database query on every refresh and status update. No fake appointment records are created.

If you set a MySQL root password in XAMPP, update `DATABASE_URL` in `.env` to `mysql://root:YOUR_PASSWORD@127.0.0.1:3306/appointment_tracker`.

## Deployment

The full application should run on a Node-compatible host with a reachable MySQL database. GitHub Pages can host the static browser-only version in `docs/`, but cannot run the API or database.

```bash
npm run db:generate
npm run db:migrate
npm run build
npm start
```

## Validation

```bash
npm run lint
npm run build
```
