import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalizeStatus, parseDateInput } from "@/lib/appointment";

function value(row: Record<string, string>, names: string[]) {
  const key = Object.keys(row).find((candidate) =>
    names.includes(candidate.trim().toLowerCase()),
  );
  return key ? (row[key]?.trim() ?? "") : "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "Choose a CSV file first." },
        { status: 400 },
      );
    const isWorkbook =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");
    const data = isWorkbook
      ? workbookAppointments(await file.arrayBuffer())
      : csvAppointments(await file.text());
    if (!data.length)
      return NextResponse.json(
        { error: "No rows with a recognizable appointment date were found." },
        { status: 400 },
      );
    const result = await prisma.appointment.createMany({
      data,
      skipDuplicates: false,
    });
    return NextResponse.json({ imported: result.count });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "Import failed. Confirm the file is a CSV with an appointment date column.",
      },
      { status: 500 },
    );
  }
}

function normalizedRecord(
  row: Record<string, unknown>,
  index: number,
  sourceSheet = "CSV",
) {
  const dateNames =
    sourceSheet === "2026"
      ? ["date of appt", "date of appointment", "appointment date"]
      : [
          "appointment date",
          "date of appointment",
          "date of appt",
          "appointment_date",
        ];
  const appointmentDate = parseDateInput(
    value(row as Record<string, string>, dateNames),
  );
  if (!appointmentDate) return null;
  const originalStatus = value(row as Record<string, string>, [
    "status",
    "status ",
    "appointment status",
  ]);
  return {
    appointmentDate,
    appointmentTime: value(row as Record<string, string>, [
      "appointment time",
      "time of appointment (est)",
      "time of appt",
      "time",
    ]),
    status: normalizeStatus(originalStatus),
    patientName: value(row as Record<string, string>, [
      "patient/client name",
      "patient name",
      "client name",
      "practice name",
      "clinic",
      "name",
    ]),
    sdrName: value(row as Record<string, string>, [
      "sdr name",
      "appointment setter",
      "booked by",
    ]),
    doctorName: value(row as Record<string, string>, [
      "doctor/provider",
      "name of doctor",
      "doctor's name",
      "doctor",
      "provider",
    ]),
    notes: [
      value(row as Record<string, string>, ["notes", "remarks", "activity"]),
      originalStatus && `Original status: ${originalStatus}`,
    ]
      .filter(Boolean)
      .join(" | "),
    rawData: { sourceSheet, sourceRow: index + 2, ...row },
    sourceRow: index + 2,
  };
}

function csvAppointments(contents: string) {
  const rows = parse(contents, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, string>[];
  return rows.flatMap((row, index) => {
    const record = normalizedRecord(row, index);
    return record ? [record] : [];
  });
}

function workbookAppointments(contents: ArrayBuffer) {
  const workbook = XLSX.read(contents, {
    type: "array",
    cellDates: true,
    raw: false,
  });
  return ["2023", "2024", "2025", "2026"].flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    return rows.flatMap((row, index) => {
      const record = normalizedRecord(row, index, sheetName);
      return record ? [record] : [];
    });
  });
}
