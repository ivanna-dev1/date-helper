-- CreateEnum
CREATE TYPE "Party" AS ENUM ('AUTHOR', 'GUEST');

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "lastProposedBy" "Party",
ADD COLUMN     "turnToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_turnToken_key" ON "Invite"("turnToken");
