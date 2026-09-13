CREATE TYPE "AppointmentStatus" AS ENUM ('MISSED', 'HELD', 'SOLD');

CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentTime" TEXT NOT NULL DEFAULT '',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'MISSED',
    "patientName" TEXT NOT NULL DEFAULT '',
    "doctorName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "sourceRow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX "Appointment_doctorName_idx" ON "Appointment"("doctorName");