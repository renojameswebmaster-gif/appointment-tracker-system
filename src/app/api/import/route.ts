import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import { normalizeStatus, parseDateInput } from "@/lib/appointment";

function value(row: Record<string, string>, names: string[]) {
  const key = Object.keys(row).find((candidate) => names.includes(candidate.trim().toLowerCase()));
  return key ? row[key]?.trim() ?? "" : "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV file first." }, { status: 400 });
    const rows = parse(await file.text(), { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
    const data = rows.flatMap((row, index) => {
      const appointmentDate = parseDateInput(value(row, ["appointment date", "date", "appointment_date"]));
      if (!appointmentDate) return [];
      return [{ appointmentDate, appointmentTime: value(row, ["appointment time", "time", "appointment_time"]), status: normalizeStatus(value(row, ["status", "appointment status"])),
        patientName: value(row, ["patient/client name", "patient name", "client name", "name"]), doctorName: value(row, ["doctor/provider", "doctor", "provider", "provider name"]),
        notes: value(row, ["notes", "comments", "description"]), rawData: Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item ?? ""])), sourceRow: index + 2 }];
    });
    if (!data.length) return NextResponse.json({ error: "No rows with a recognizable appointment date were found." }, { status: 400 });
    const result = await prisma.appointment.createMany({ data, skipDuplicates: false });
    return NextResponse.json({ imported: result.count, skipped: rows.length - data.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Import failed. Confirm the file is a CSV with an appointment date column." }, { status: 500 });
  }
}
