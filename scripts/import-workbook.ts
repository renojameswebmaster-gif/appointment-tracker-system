import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma";
import { normalizeStatus } from "../src/lib/appointment";

const workbookPath = process.argv[2] ?? "C:\\Users\\Reno James\\Downloads\\Appointment Tracker - PH (1).xlsx";
const workbook = XLSX.readFile(workbookPath, { cellDates: true });
const appointmentSheets = ["2023", "2024", "2025", "2026"];

type Row = Record<string, unknown>;

function text(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? "" : String(value).trim();
}

function find(row: Row, names: string[]) {
  const key = Object.keys(row).find((candidate) => names.includes(candidate.trim().toLowerCase()));
  return key ? text(row[key]) : "";
}

function parseDate(value: string, sheetYear: string) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const withYear = new Date(`${value} ${sheetYear}`);
  return Number.isNaN(withYear.getTime()) ? null : withYear;
}

function normalizeTime(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

async function main() {
  const data: Array<{
    appointmentDate: Date;
    appointmentTime: string;
    status: ReturnType<typeof normalizeStatus>;
    patientName: string;
    doctorName: string;
    notes: string;
    rawData: Record<string, string | number>;
    sourceRow: number;
  }> = [];

  for (const sheetName of appointmentSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const dateText = find(row, ["date of appointment", "date of appt", "appointment date", "date"]);
      const appointmentDate = parseDate(dateText, sheetName);
      if (!appointmentDate) continue;
      const rawRow = Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, text(cell)]));
      const originalStatus = find(row, ["status", "status ", "appointment status"]).toUpperCase();
      data.push({
        appointmentDate,
        appointmentTime: normalizeTime(find(row, ["time of appointment (est)", "time of appt", "appointment time", "time"])),
        status: normalizeStatus(originalStatus),
        patientName: find(row, ["practice name", "clinic", "patient/client name", "patient name", "client name", "name"]),
        doctorName: find(row, ["name of doctor", "doctor's name", "doctor/provider", "doctor", "provider"]),
        notes: [find(row, ["notes", "remarks"]), find(row, ["sdr name"]), originalStatus && `Original status: ${originalStatus}`].filter(Boolean).join(" | "),
        rawData: { sourceSheet: sheetName, sourceRow: index + 2, ...rawRow },
        sourceRow: index + 2,
      });
    }
  }

  if (!data.length) throw new Error("No dated appointment rows were found in the workbook.");
  const result = await prisma.appointment.createMany({ data, skipDuplicates: false });
  console.log(`Imported ${result.count} appointment records from ${appointmentSheets.join(", ")}.`);
  console.log("Original workbook values are preserved in rawData; non-standard statuses were retained there and mapped to MISSED for dashboard totals.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
