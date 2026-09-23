ALTER TABLE "public"."('projects)"
RENAME TO "projects";

ALTER TABLE "public"."projects"
RENAME COLUMN "updateAt" TO "updatedAt";

ALTER TABLE "public"."projects"
RENAME CONSTRAINT "('projects)_pkey"
TO "projects_pkey";

ALTER TABLE "public"."projects"
RENAME CONSTRAINT "('projects)_principalId_fkey"
TO "projects_principalId_fkey";

ALTER INDEX "public"."('projects)_principalId_idx"
RENAME TO "projects_principalId_idx";