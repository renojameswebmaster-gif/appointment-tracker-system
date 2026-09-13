import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeStatus, parseDateInput } from "@/lib/appointment";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const appointmentDate = body.appointmentDate
      ? parseDateInput(body.appointmentDate)
      : undefined;
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentDate ? { appointmentDate } : {}),
        ...(body.appointmentTime !== undefined
          ? { appointmentTime: body.appointmentTime }
          : {}),
        ...(body.status ? { status: normalizeStatus(body.status) } : {}),
        ...(body.patientName !== undefined
          ? { patientName: body.patientName.trim() }
          : {}),
        ...(body.sdrName !== undefined ? { sdrName: body.sdrName.trim() } : {}),
        ...(body.doctorName !== undefined
          ? { doctorName: body.doctorName.trim() }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}),
        ...(body.rawData !== undefined ? { rawData: body.rawData } : {}),
      },
    });
    return NextResponse.json(appointment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update appointment." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await prisma.appointment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to delete appointment." },
      { status: 500 },
    );
  }
}
