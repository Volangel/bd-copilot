-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "rawContext" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "tags" TEXT,
    "icpScore" INTEGER,
    "mqaScore" INTEGER,
    "bdAngles" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
