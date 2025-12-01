-- AlterTable
ALTER TABLE "Project" ADD COLUMN "bdAngles" TEXT;
ALTER TABLE "Project" ADD COLUMN "discord" TEXT;
ALTER TABLE "Project" ADD COLUMN "github" TEXT;
ALTER TABLE "Project" ADD COLUMN "medium" TEXT;
ALTER TABLE "Project" ADD COLUMN "mqaReasons" TEXT;
ALTER TABLE "Project" ADD COLUMN "mqaScore" INTEGER;
ALTER TABLE "Project" ADD COLUMN "telegram" TEXT;
ALTER TABLE "Project" ADD COLUMN "twitter" TEXT;

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
