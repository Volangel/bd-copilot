-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boosts" TEXT,
    "penalties" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistUrl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatchlistUrl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opportunity" (
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
    "leadScore" INTEGER,
    "leadReasons" TEXT,
    "signalStrength" INTEGER,
    "recencyScore" INTEGER,
    "playbookMatches" TEXT,
    "icpProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_icpProfileId_fkey" FOREIGN KEY ("icpProfileId") REFERENCES "ICPProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Opportunity" ("bdAngles", "createdAt", "icpScore", "id", "mqaScore", "projectId", "rawContext", "sourceLabel", "sourceType", "status", "tags", "title", "updatedAt", "url", "userId") SELECT "bdAngles", "createdAt", "icpScore", "id", "mqaScore", "projectId", "rawContext", "sourceLabel", "sourceType", "status", "tags", "title", "updatedAt", "url", "userId" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
