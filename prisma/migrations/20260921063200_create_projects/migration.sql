-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('setup', 'design', 'development', 'test');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('notStarted', 'doing', 'stopped', 'completed', 'canceled');

-- CreateTable
CREATE TABLE "('projects)" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startTime" DATE NOT NULL,
    "endTime" DATE NOT NULL,
    "realStartTime" DATE,
    "realEndTime" DATE,
    "stage" "ProjectStage" NOT NULL DEFAULT 'setup',
    "status" "WorkStatus" NOT NULL DEFAULT 'notStarted',
    "principalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "('projects)_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "('projects)_principalId_idx" ON "('projects)"("principalId");

-- AddForeignKey
ALTER TABLE "('projects)" ADD CONSTRAINT "('projects)_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
