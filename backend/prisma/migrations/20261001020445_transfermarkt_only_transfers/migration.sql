-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'kff',
ADD COLUMN     "tmPlayerId" INTEGER,
ALTER COLUMN "playerExternalId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_seasonId_teamId_direction_tmPlayerId_key" ON "Transfer"("seasonId", "teamId", "direction", "tmPlayerId");

