-- CreateTable
CREATE TABLE "project_members" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateIndex
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BackfillProjectMembers
INSERT INTO "project_members" ("projectId", "userId")
SELECT "id", "principalId"
FROM "projects"

UNION

SELECT "projectId", "principalId"
FROM "tasks"
WHERE "projectId" IS NOT NULL

ON CONFLICT ("projectId", "userId") DO NOTHING;