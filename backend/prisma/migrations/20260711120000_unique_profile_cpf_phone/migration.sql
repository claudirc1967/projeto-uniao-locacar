-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_cpfCnpj_key" ON "OwnerProfile"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_phone_key" ON "OwnerProfile"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_cpf_key" ON "DriverProfile"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_phone_key" ON "DriverProfile"("phone");
