import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function parseBookedDate(value: unknown, yearValue: unknown) {
  const text = String(value ?? "").trim();
  const year = Number(yearValue);
  if (!text || !Number.isInteger(year)) return null;

  const numericMatch = text.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (numericMatch) {
    const month = Number(numericMatch[1]);
    const day = Number(numericMatch[2]);
    const parsedYear = numericMatch[3]
      ? Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3])
      : year;
    return new Date(Date.UTC(parsedYear, month - 1, day));
  }

  const namedMatch = text.toLowerCase().match(/^([a-z]+)\s+(\d{1,2})$/);
  if (!namedMatch) return null;
  const month = monthNames.indexOf(namedMatch[1]);
  const day = Number(namedMatch[2]);
  return month >= 0 ? new Date(Date.UTC(year, month, day)) : null;
}

async function main() {
  const records = await prisma.appointment.findMany({
    where: { bookedDate: null },
    select: { id: true, rawData: true },
  });
  let updated = 0;

  for (const record of records) {
    const rawData = record.rawData as Record<string, unknown>;
    const bookedDate = parseBookedDate(rawData.Date, rawData.sourceSheet);
    if (!bookedDate || Number.isNaN(bookedDate.getTime())) continue;
    await prisma.appointment.update({
      where: { id: record.id },
      data: { bookedDate },
    });
    updated += 1;
  }

  console.log(`Backfilled ${updated} booked dates out of ${records.length} records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
