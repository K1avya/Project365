-- CreateTable
CREATE TABLE "capacity_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "grossMinutes" INTEGER NOT NULL,
    "commitmentMinutes" INTEGER NOT NULL,
    "discretionaryMinutes" INTEGER NOT NULL,
    "plannedMinutes" INTEGER NOT NULL,
    "overloadMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capacity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capacity_snapshots_userId_date_idx" ON "capacity_snapshots"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_snapshots_userId_date_key" ON "capacity_snapshots"("userId", "date");

-- AddForeignKey
ALTER TABLE "capacity_snapshots" ADD CONSTRAINT "capacity_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

