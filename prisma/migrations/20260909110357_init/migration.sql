-- CreateEnum
CREATE TYPE "DateFormat" AS ENUM ('COFFEE', 'WALK', 'DINNER', 'MOVIE', 'SURPRISE');

-- CreateEnum
CREATE TYPE "WhoPays" AS ENUM ('MY_TREAT', 'SPLIT', 'DECIDE_LATER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'COUNTER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('YES', 'NO', 'COUNTER');

-- CreateTable
CREATE TABLE "Invite" (
    "id" SERIAL NOT NULL,
    "publicToken" TEXT NOT NULL,
    "secretToken" TEXT NOT NULL,
    "friendToken" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "format" "DateFormat" NOT NULL,
    "whoPays" "WhoPays",
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOption" (
    "id" SERIAL NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceOption" (
    "id" SERIAL NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "PlaceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" SERIAL NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "type" "ResponseType" NOT NULL,
    "respondentName" TEXT NOT NULL,
    "message" TEXT,
    "chosenTimeId" INTEGER,
    "chosenPlaceId" INTEGER,
    "proposedTime" TIMESTAMP(3),
    "proposedPlace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_publicToken_key" ON "Invite"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_secretToken_key" ON "Invite"("secretToken");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_friendToken_key" ON "Invite"("friendToken");

-- CreateIndex
CREATE INDEX "TimeOption_inviteId_idx" ON "TimeOption"("inviteId");

-- CreateIndex
CREATE INDEX "PlaceOption_inviteId_idx" ON "PlaceOption"("inviteId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_inviteId_key" ON "Response"("inviteId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_chosenTimeId_key" ON "Response"("chosenTimeId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_chosenPlaceId_key" ON "Response"("chosenPlaceId");

-- AddForeignKey
ALTER TABLE "TimeOption" ADD CONSTRAINT "TimeOption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOption" ADD CONSTRAINT "PlaceOption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_chosenTimeId_fkey" FOREIGN KEY ("chosenTimeId") REFERENCES "TimeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_chosenPlaceId_fkey" FOREIGN KEY ("chosenPlaceId") REFERENCES "PlaceOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
