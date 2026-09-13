import { prisma } from "../src/lib/prisma";

async function main() {
  const appointments = await prisma.appointment.findMany({
    select: { id: true, rawData: true },
  });
  let updated = 0;
  for (const appointment of appointments) {
    const raw = appointment.rawData as Record<string, unknown>;
    const sourceKey =
      raw.sourceSheet === "2026" ? "Date of Appt" : "Date of Appointment";
    const date = new Date(String(raw[sourceKey] || ""));
    if (!Number.isNaN(date.getTime())) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { appointmentDate: date },
      });
      updated += 1;
    }
  }
  console.log(
    `Corrected ${updated} appointment dates from the original workbook fields.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
