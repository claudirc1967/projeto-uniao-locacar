-- Catálogo curado de marcas e modelos de veículos.
CREATE TABLE "VehicleBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleBrand_name_key" ON "VehicleBrand"("name");

CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleModel_brandId_vehicleType_idx" ON "VehicleModel"("brandId", "vehicleType");

CREATE UNIQUE INDEX "VehicleModel_brandId_name_vehicleType_key" ON "VehicleModel"("brandId", "name", "vehicleType");

ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VehicleBrand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleModel" ENABLE ROW LEVEL SECURITY;
