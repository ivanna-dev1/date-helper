-- AlterEnum
ALTER TYPE "WhoPays" ADD VALUE 'GUEST_TREAT';

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "lastMessageBy" "Party",
ADD COLUMN     "turnMessage" TEXT;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "proposedPlaceNote" TEXT;
