-- CreateTable
CREATE TABLE "PlayerSeasonStat" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "onRoster" BOOLEAN NOT NULL DEFAULT false,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "advancedStats" JSONB,

    CONSTRAINT "PlayerSeasonStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLock" (
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncLock_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "PlayerSeasonStat_seasonId_idx" ON "PlayerSeasonStat"("seasonId");

-- CreateIndex
CREATE INDEX "PlayerSeasonStat_teamId_seasonId_idx" ON "PlayerSeasonStat"("teamId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonStat_playerId_seasonId_teamId_key" ON "PlayerSeasonStat"("playerId", "seasonId", "teamId");

-- CreateIndex
CREATE INDEX "Match_seasonId_status_kickoff_idx" ON "Match"("seasonId", "status", "kickoff");

-- CreateIndex
CREATE INDEX "PushSubscription_teamIds_idx" ON "PushSubscription" USING GIN ("teamIds");

-- CreateIndex
CREATE INDEX "PushSubscription_matchIds_idx" ON "PushSubscription" USING GIN ("matchIds");

-- CreateIndex
CREATE INDEX "Standing_teamId_idx" ON "Standing"("teamId");

-- CreateIndex
CREATE INDEX "Transfer_counterTeamId_idx" ON "Transfer"("counterTeamId");

-- AddForeignKey
ALTER TABLE "PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

