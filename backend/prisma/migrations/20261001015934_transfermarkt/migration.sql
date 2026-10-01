-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "contractUntil" TIMESTAMP(3),
ADD COLUMN     "marketValue" INTEGER,
ADD COLUMN     "tmId" INTEGER;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "squadValue" INTEGER,
ADD COLUMN     "tmId" INTEGER;

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "feeAmount" INTEGER,
ADD COLUMN     "feeType" TEXT,
ADD COLUMN     "marketValue" INTEGER,
ADD COLUMN     "tmTransferId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Player_tmId_key" ON "Player"("tmId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tmId_key" ON "Team"("tmId");

