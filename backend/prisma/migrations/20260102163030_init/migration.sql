-- CreateEnum
CREATE TYPE "IrrigationMode" AS ENUM ('manual', 'auto', 'periodic', 'scheduled');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "roleName" "RoleName" NOT NULL DEFAULT 'user',

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "roleId" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "minTemperature" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "maxTemperature" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "minAirHumidity" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "maxAirHumidity" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "minSoilMoisture" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "maxSoilMoisture" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "deviceCode" VARCHAR(50) NOT NULL,
    "temperature" DOUBLE PRECISION,
    "airHumidity" DOUBLE PRECISION,
    "soilMoisture" DOUBLE PRECISION,
    "isDark" BOOLEAN NOT NULL DEFAULT false,
    "isPumpOn" BOOLEAN NOT NULL DEFAULT false,
    "isLedOn" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gardens" (
    "id" SERIAL NOT NULL,
    "gardenName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "irrigationMode" "IrrigationMode" NOT NULL DEFAULT 'manual',
    "autoIrrigationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "autoIrrigationDuration" INTEGER NOT NULL DEFAULT 60,
    "periodicIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "periodicLastIrrigation" TIMESTAMP(3),
    "ledAutoMode" BOOLEAN NOT NULL DEFAULT false,
    "alertMinTemperature" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "alertMaxTemperature" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "alertMinSoilMoisture" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "userId" INTEGER NOT NULL,
    "plantId" INTEGER,
    "deviceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gardens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_logs" (
    "id" SERIAL NOT NULL,
    "gardenId" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION,
    "airHumidity" DOUBLE PRECISION,
    "soilMoisture" DOUBLE PRECISION,
    "isDark" BOOLEAN,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "irrigation_logs" (
    "id" SERIAL NOT NULL,
    "gardenId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "mode" "IrrigationMode" NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "note" TEXT,

    CONSTRAINT "irrigation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "irrigations" (
    "id" SERIAL NOT NULL,
    "gardenId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TIMESTAMP(3),
    "mode" "IrrigationMode",

    CONSTRAINT "irrigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "gardenId" INTEGER NOT NULL,
    "time" VARCHAR(5) NOT NULL,
    "daysOfWeek" VARCHAR(20) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_roleName_key" ON "roles"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceCode_key" ON "devices"("deviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "gardens_deviceId_key" ON "gardens"("deviceId");

-- CreateIndex
CREATE INDEX "sensor_logs_gardenId_recordedAt_idx" ON "sensor_logs"("gardenId", "recordedAt");

-- CreateIndex
CREATE INDEX "irrigation_logs_gardenId_startTime_idx" ON "irrigation_logs"("gardenId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "irrigations_gardenId_key" ON "irrigations"("gardenId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_logs" ADD CONSTRAINT "sensor_logs_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "gardens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "irrigation_logs" ADD CONSTRAINT "irrigation_logs_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "gardens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "irrigations" ADD CONSTRAINT "irrigations_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "gardens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "gardens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
