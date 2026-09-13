import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRange, normalizeStatus, parseDateInput } from "@/lib/appointment";

function getWhere(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date");
  const year = params.get("year");
  const month = params.get("month");
  const status = params.get("status");
  const doctor = params.get("doctor");
  const q = params.get("q");
  const where: Record<string, unknown> = {};

  if (date) {
    const start = getRange(date);
    const end = getRange(date, true);
    if (start && end) where.appointmentDate = { gte: start, lt: end };
  } else if (year) {
    const start = new Date(
      Date.UTC(Number(year), month ? Number(month) - 1 : 0, 1),
    );
    const end = month
      ? new Date(Date.UTC(Number(year), Number(month), 1))
      : new Date(Date.UTC(Number(year) + 1, 0, 1));
    where.appointmentDate = { gte: start, lt: end };
  }
  if (status && ["MISSED", "HELD", "SOLD"].includes(status))
    where.status = status;
  if (doctor) where.doctorName = { contains: doctor, mode: "insensitive" };
  if (q)
    where.OR = [
      { patientName: { contains: q, mode: "insensitive" } },
      { sdrName: { contains: q, mode: "insensitive" } },
      { doctorName: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  return where;
}

export async function GET(request: NextRequest) {
  try {
    const sort = request.nextUrl.searchParams.get("sort") || "date-desc";
    const orderBy =
      sort === "booked-by"
        ? [{ sdrName: "asc" as const }, { appointmentDate: "desc" as const }]
        : sort === "name"
          ? [
              { patientName: "asc" as const },
              { appointmentDate: "desc" as const },
            ]
          : sort === "status"
            ? [{ status: "asc" as const }, { appointmentDate: "desc" as const }]
            : [
                { appointmentDate: "desc" as const },
                { appointmentTime: "asc" as const },
              ];
    const appointments = await prisma.appointment.findMany({
      where: getWhere(request),
      orderBy,
    });
    const stats = appointments.reduce(
      (result, appointment) => {
        result.total += 1;
        result[
          appointment.status.toLowerCase() as "missed" | "held" | "sold"
        ] += 1;
        return result;
      },
      { total: 0, missed: 0, held: 0, sold: 0 },
    );
    return NextResponse.json({ appointments, stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Database unavailable. Set DATABASE_URL and run prisma migrate.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const appointmentDate = parseDateInput(body.appointmentDate);
    if (!appointmentDate || !body.patientName?.trim())
      return NextResponse.json(
        { error: "Appointment date and patient/client name are required." },
        { status: 400 },
      );
    const appointment = await prisma.appointment.create({
      data: {
        appointmentDate,
        appointmentTime: body.appointmentTime ?? "",
        status: normalizeStatus(body.status),
        patientName: body.patientName.trim(),
        sdrName: body.sdrName?.trim() ?? "",
        doctorName: body.doctorName?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        rawData: body.rawData ?? {},
      },
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to create appointment." },
      { status: 500 },
    );
  }
}
