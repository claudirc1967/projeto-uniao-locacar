-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'DRIVER');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('PENDING_OWNER', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalSituation" AS ENUM ('ATIVA', 'LIBERADA', 'PENDENTE');

-- CreateEnum
CREATE TYPE "RentalInspectionType" AS ENUM ('CHECKOUT', 'CHECKIN');

-- CreateEnum
CREATE TYPE "FuelLevel" AS ENUM ('EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL');

-- CreateEnum
CREATE TYPE "RentalPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalFinancialEntryType" AS ENUM ('RENT_PAYMENT', 'SECURITY_DEPOSIT', 'DISCOUNT', 'EXTRA_CHARGE', 'REFUND');

-- CreateEnum
CREATE TYPE "RentalPaymentMethod" AS ENUM ('PIX', 'CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractTime" AS ENUM ('DIARIO', 'SEMANAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "PartnerCategory" AS ENUM ('INSURANCE', 'WORKSHOP', 'BODYSHOP', 'PARTS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewDirection" AS ENUM ('OWNER_TO_DRIVER', 'DRIVER_TO_OWNER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "privacyPolicyVersion" TEXT NOT NULL DEFAULT '',
    "privacyPolicyAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PartnerCategory" NOT NULL DEFAULT 'OTHER',
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nomeRazaoSocial" TEXT NOT NULL DEFAULT '',
    "emailLocador" TEXT NOT NULL DEFAULT '',
    "contractTemplateText" TEXT,
    "cpfCnpj" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "logradouro" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "complemento" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT '',
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "fullName" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "cnh" TEXT,
    "cnhCategory" TEXT,
    "cnhValidity" TEXT,
    "cnhYears" INTEGER,
    "cnhHasEar" BOOLEAN,
    "criminalAttestation" BOOLEAN,
    "uberRegistered" BOOLEAN,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2010,
    "cor" TEXT,
    "portas" INTEGER NOT NULL DEFAULT 4,
    "lugares" INTEGER NOT NULL DEFAULT 5,
    "contractTime" "ContractTime" NOT NULL DEFAULT 'DIARIO',
    "kmLivre" BOOLEAN NOT NULL DEFAULT false,
    "kmPorContrato" INTEGER NOT NULL DEFAULT 0,
    "insuranceMaintenanceIncluded" BOOLEAN NOT NULL DEFAULT true,
    "insurerPolicy" TEXT,
    "insurancePartnerId" TEXT,
    "workshopPartnerId" TEXT,
    "bodyshopPartnerId" TEXT,
    "partsPartnerId" TEXT,
    "dailyRateCents" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "requirementsJson" TEXT,
    "paymentNotes" TEXT,
    "caucao" TEXT,
    "pickupCity" TEXT,
    "pickupUf" TEXT,
    "pickupCep" TEXT,
    "pickupLogradouro" TEXT,
    "pickupNumero" TEXT,
    "pickupComplemento" TEXT,
    "pickupBairro" TEXT,
    "pickupSameAsOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDriverBlock" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverUserId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDriverBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePhoto" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverUserId" TEXT NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'PENDING_OWNER',
    "motivoRecusa" TEXT,
    "pickupInstructions" TEXT,
    "contractText" TEXT,
    "contractS3Key" TEXT,
    "contractUrl" TEXT,
    "returnDate" TIMESTAMP(3),
    "situation" "RentalSituation" NOT NULL DEFAULT 'ATIVA',
    "pendingReason" TEXT,
    "pendingResolutionExpectedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalFinancialSummary" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "agreedAmountCents" INTEGER NOT NULL,
    "securityDepositCents" INTEGER,
    "status" "RentalPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalFinancialSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalFinancialEntry" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "type" "RentalFinancialEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "RentalPaymentMethod",
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalFinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalInspection" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "type" "RentalInspectionType" NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "fuelLevel" "FuelLevel" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "ownerAckAt" TIMESTAMP(3),
    "ownerAckUserId" TEXT,
    "driverAckAt" TIMESTAMP(3),
    "driverAckUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalInspectionPhoto" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalInspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReview" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "direction" "ReviewDirection" NOT NULL,
    "stars" INTEGER NOT NULL,
    "tagsJson" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Partner_ownerUserId_idx" ON "Partner"("ownerUserId");

-- CreateIndex
CREATE INDEX "Partner_ownerUserId_category_idx" ON "Partner"("ownerUserId", "category");

-- CreateIndex
CREATE INDEX "Partner_ownerUserId_name_idx" ON "Partner"("ownerUserId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_userId_key" ON "OwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDriverBlock_vehicleId_driverUserId_key" ON "VehicleDriverBlock"("vehicleId", "driverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePhoto_key_key" ON "VehiclePhoto"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RentalFinancialSummary_rentalId_key" ON "RentalFinancialSummary"("rentalId");

-- CreateIndex
CREATE INDEX "RentalFinancialSummary_status_idx" ON "RentalFinancialSummary"("status");

-- CreateIndex
CREATE INDEX "RentalFinancialEntry_rentalId_idx" ON "RentalFinancialEntry"("rentalId");

-- CreateIndex
CREATE INDEX "RentalFinancialEntry_type_idx" ON "RentalFinancialEntry"("type");

-- CreateIndex
CREATE INDEX "RentalFinancialEntry_paidAt_idx" ON "RentalFinancialEntry"("paidAt");

-- CreateIndex
CREATE INDEX "RentalInspection_rentalId_idx" ON "RentalInspection"("rentalId");

-- CreateIndex
CREATE INDEX "RentalInspection_createdByUserId_idx" ON "RentalInspection"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalInspection_rentalId_type_key" ON "RentalInspection"("rentalId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "RentalInspectionPhoto_key_key" ON "RentalInspectionPhoto"("key");

-- CreateIndex
CREATE INDEX "RentalInspectionPhoto_inspectionId_idx" ON "RentalInspectionPhoto"("inspectionId");

-- CreateIndex
CREATE INDEX "RentalReview_toUserId_idx" ON "RentalReview"("toUserId");

-- CreateIndex
CREATE INDEX "RentalReview_fromUserId_idx" ON "RentalReview"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReview_rentalId_direction_key" ON "RentalReview"("rentalId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerProfile" ADD CONSTRAINT "OwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_insurancePartnerId_fkey" FOREIGN KEY ("insurancePartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_workshopPartnerId_fkey" FOREIGN KEY ("workshopPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_bodyshopPartnerId_fkey" FOREIGN KEY ("bodyshopPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_partsPartnerId_fkey" FOREIGN KEY ("partsPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriverBlock" ADD CONSTRAINT "VehicleDriverBlock_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriverBlock" ADD CONSTRAINT "VehicleDriverBlock_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalFinancialSummary" ADD CONSTRAINT "RentalFinancialSummary_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalFinancialEntry" ADD CONSTRAINT "RentalFinancialEntry_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalInspection" ADD CONSTRAINT "RentalInspection_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalInspection" ADD CONSTRAINT "RentalInspection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalInspectionPhoto" ADD CONSTRAINT "RentalInspectionPhoto_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "RentalInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReview" ADD CONSTRAINT "RentalReview_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReview" ADD CONSTRAINT "RentalReview_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReview" ADD CONSTRAINT "RentalReview_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
