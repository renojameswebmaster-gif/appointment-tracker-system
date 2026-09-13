import { prisma } from "../src/lib/prisma";

function originalStatus(raw: Record<string, unknown>) {
  const key = Object.keys(raw).find((candidate) => {
    const normalized = candidate.trim().toLowerCase();
    return normalized === "status" || normalized === "status ";
  });
  return key
    ? String(raw[key] ?? "")
        .trim()
        .toUpperCase()
    : "";
}

async function main() {
  const appointments = await prisma.appointment.findMany({
    select: { id: true, status: true, rawData: true },
  });
  let pending = 0;
  for (const appointment of appointments) {
    if (
      !["", "-", "N/A"].includes(
        originalStatus(appointment.rawData as Record<string, unknown>),
      )
    )
      continue;
    if (appointment.status !== "PENDING") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "PENDING" },
      });
      pending += 1;
    }
  }
  console.log(
    `Marked ${pending} blank-status records as Pending / Unassigned.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
