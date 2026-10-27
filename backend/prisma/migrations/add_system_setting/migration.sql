-- CreateTable: Platform-wide key-value system settings (e.g. ANTHROPIC_API_KEY)
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "key"       TEXT         NOT NULL,
    "value"     TEXT         NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);
