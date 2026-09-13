import { prisma } from "../src/lib/prisma";

async function main() {
  const appointments = await prisma.appointment.findMany({
    select: { id: true, rawData: true },
  });
  let updated = 0;
  for (const appointment of appointments) {
    const raw = appointment.rawData as Record<string, unknown>;
    const key = Object.keys(raw).find(
      (candidate) => candidate.trim().toLowerCase() === "sdr name",
    );
    const sdrName = key ? String(raw[key] ?? "").trim() : "";
    if (sdrName) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { sdrName },
      });
      updated += 1;
    }
  }
  console.log(`Backfilled ${updated} appointment setter names.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
