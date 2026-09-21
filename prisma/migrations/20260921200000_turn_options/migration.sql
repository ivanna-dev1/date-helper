-- CreateTable
CREATE TABLE "TurnTime" (
    "id" SERIAL NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnPlace" (
    "id" SERIAL NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "TurnPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TurnTime_inviteId_idx" ON "TurnTime"("inviteId");

-- CreateIndex
CREATE INDEX "TurnPlace_inviteId_idx" ON "TurnPlace"("inviteId");

-- AddForeignKey
ALTER TABLE "TurnTime" ADD CONSTRAINT "TurnTime_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnPlace" ADD CONSTRAINT "TurnPlace_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
