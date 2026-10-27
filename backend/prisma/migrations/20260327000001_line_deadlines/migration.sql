-- CreateTable: LineDeadline — monthly per-line (customer) per-part targets
CREATE TABLE "LineDeadline" (
    "id"               TEXT NOT NULL,
    "organizationId"   TEXT NOT NULL,
    "customerId"       TEXT NOT NULL,
    "partNumber"       TEXT NOT NULL,
    "month"            INTEGER NOT NULL,
    "year"             INTEGER NOT NULL,
    "monthlyTarget"    INTEGER NOT NULL DEFAULT 0,
    "week1Target"      INTEGER NOT NULL DEFAULT 0,
    "week2Target"      INTEGER NOT NULL DEFAULT 0,
    "week3Target"      INTEGER NOT NULL DEFAULT 0,
    "week4Target"      INTEGER NOT NULL DEFAULT 0,
    "readyForDispatch" INTEGER NOT NULL DEFAULT 0,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineDeadline_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one row per (org, customer, part, month, year)
CREATE UNIQUE INDEX "LineDeadline_organizationId_customerId_partNumber_month_year_key"
    ON "LineDeadline"("organizationId", "customerId", "partNumber", "month", "year");

-- Indexes for common query patterns
CREATE INDEX "LineDeadline_organizationId_month_year_idx"
    ON "LineDeadline"("organizationId", "month", "year");

CREATE INDEX "LineDeadline_customerId_idx"
    ON "LineDeadline"("customerId");

-- Foreign keys
ALTER TABLE "LineDeadline"
    ADD CONSTRAINT "LineDeadline_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LineDeadline"
    ADD CONSTRAINT "LineDeadline_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
