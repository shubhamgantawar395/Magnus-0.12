-- CreateTable: AiConversation — persistent per-user chat history

CREATE TABLE "AiConversation" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "role"      TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConversation_userId_createdAt_idx" ON "AiConversation"("userId", "createdAt");
