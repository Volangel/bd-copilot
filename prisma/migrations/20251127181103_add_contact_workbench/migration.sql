-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "channelPreference" TEXT;

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "playbookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sequence_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sequence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sequence_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SequenceStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sequenceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    CONSTRAINT "SequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_contactId_key" ON "Sequence"("contactId");
