-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactId" TEXT,
    "sequenceStepId" TEXT,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Interaction_sequenceStepId_fkey" FOREIGN KEY ("sequenceStepId") REFERENCES "SequenceStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
