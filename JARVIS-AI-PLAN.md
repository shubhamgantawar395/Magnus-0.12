# J.A.R.V.I.S. — Implementation Plan
## Making Aaniry VMS AI "Extremely Smart and Useful in Real Life"

---

## What Was Just Fixed (This Session)

### Problem 1 — "I was unable to process that request"
The frontend `catch {}` fires when the backend returns an HTTP error. This happened because:
- `getSnapshot()` could throw uncaught exceptions → fixed with try/catch wrapper
- The 8-minute cache meant a freshly-added part wasn't in the snapshot at all, so the bot
  fell through to Claude API → if no API key set, threw instead of falling back gracefully

### Problem 2 — Part 16706 (or any fresh data) not found
Root cause: snapshot cache was 8 minutes old. Part added after last cache build = invisible to bot.

**Fixes applied right now:**

| Fix | File | What it does |
|-----|------|--------------|
| Cache TTL: 8 min → 2 min | `ai-context.service.ts` | Snapshot stays fresh within 2 minutes |
| Direct DB fallback | `ai.service.ts` — `directDbLookup()` | When snapshot misses a code, queries Postgres live — **bypasses cache entirely** |
| Auto cache bust | `ai.service.ts` | When direct DB finds data, invalidates the stale snapshot so next query gets fresh snapshot |
| Conversation history | `ai.service.ts` | Bot remembers last 5 exchanges (30 min idle window) — can reference prior context |

---

## The Full Roadmap

### Phase 1 — Core Reliability (Ready for Production)

**1.1 Set your Anthropic API key**
The bot falls back to the local summary engine if no key is set. To unlock Claude:
1. Log in as `superadmin@aaniry.com`
2. Go to Admin → Settings → System Settings
3. Set key: `ANTHROPIC_API_KEY` = your key (starts with `sk-ant-...`)

Or set it as an environment variable: `ANTHROPIC_API_KEY=sk-ant-...` before starting the backend.

**1.2 Cache invalidation on mutations (Next step to implement)**
Currently the 2-minute TTL + direct DB fallback handles freshness. For true zero-latency,
add `aiContextService.invalidateCache(orgId)` calls in:
- `ChallansService.create()` after challan is created
- `TrayService.setTrayCapacity()` after part is added
- `PurchaseOrdersService.create()` after PO is created

This requires exporting `AiContextService` into a standalone `AiCacheModule` to avoid
circular dependencies. Skip for now — 2-min TTL + directDbLookup already solves real-time.

**1.3 Vendor AI panel**
Currently the J.A.R.V.I.S. panel only exists at `/dashboard/executive/page.tsx`.
Vendors need the same widget at `/dashboard/vendor`. The backend already handles vendor
role correctly — just needs the frontend component copy-pasted into the vendor dashboard.

---

### Phase 2 — True Intelligence

**2.1 Conversation memory (DONE ✓)**
The bot now remembers the last 5 exchanges (10 turns) per user, cleared after 30 minutes idle.
This enables:
- "Show me that challan again" → references the challan from last reply
- "Create a PO for the same vendor" → Claude knows which vendor from context
- "What was the quantity?" → Claude can look back in history

**2.2 Richer intent detection**
Current system: keyword matching → fast-paths → Claude API.
Problem: "how much material has Sharma processed this month?" doesn't hit any keyword.

**Plan:** Add an intent classification step before the fast-paths:
```
INTENT TYPES:
  STATUS_QUERY   → find something specific (current)
  OVERVIEW       → summary/briefing (current)
  ACTION_REQUEST → do something (partial — via Claude)
  ANALYTICS      → trend/comparison (missing)
  UNKNOWN        → let Claude handle
```

For ANALYTICS queries, fetch aggregate data from DB and pass to Claude:
- "Sharma's throughput last 3 months" → query JobProcess grouped by month + vendor
- "Which parts are most delayed?" → aggregate daysOut by partNumber
- "Compare vendor performance" → rejection rate + avg processing time per vendor

**2.3 Smarter action confirmation**
Currently Claude executes actions immediately from the tag. This is risky:
"Create a challan for 1000 parts" → executed instantly, no undo.

**Plan:** Two-step flow:
1. Claude proposes: "I'll create Challan for 1000× 16705 to Sharma for Eaton. Confirm? (yes/no)"
2. Frontend shows a confirm button — user clicks Yes
3. Second API call with `confirm=true` actually executes the action

```typescript
// In ai.controller.ts — add confirm parameter
@Post('chat')
async chat(@Body() { prompt, confirm }: { prompt: string; confirm?: boolean }, @Req() req) { ... }

// In ai.service.ts — store pending actions per user
private pendingActions = new Map<string, PendingAction>();
```

---

### Phase 3 — Proactive AI (Alerts Without Being Asked)

**3.1 Daily operations digest**
Every morning at 8 AM, the bot pushes a summary to each user's notification bell:
- Overdue challans
- POs awaiting your approval
- Dispatch-ready parts not yet shipped
- Vendors who haven't submitted invoices in 14+ days

Implementation: Add a NestJS `@Cron('0 8 * * *')` scheduled task that calls `buildSmartSummary()`
for each active org and pushes to the existing `NotificationCenter` on the frontend.

**3.2 Real-time alerts on thresholds**
- Challan crosses 7 days → alert PPC + exec: "Sharma's challan DC/2026/03/001 is now OVERDUE (8 days)"
- PO raised > ₹50,000 → alert exec for approval
- Vendor submission rate drops → alert accounts team

Trigger: Add Prisma middleware hooks that fire on relevant model updates and push via the
existing WebSocket (`useWebSocket.tsx` is already in the frontend).

**3.3 Vendor-initiated alerts**
When a vendor marks 500/800 units complete, the bot auto-notifies the PPC:
"Sharma has completed 500/800 units of part 16705. Challan DC/2026/03/001 is 62.5% done."

---

### Phase 4 — Deep Analytics (Business Intelligence)

**4.1 Vendor performance dashboard**
The frontend already has `VendorComparisonMatrix.tsx` and `PerformanceTrendChart.tsx`.
Connect these to AI-generated analysis via a new `/ai/analytics` endpoint:

```
GET /ai/analytics/vendor-performance?vendorId=X&months=3
→ { on_time_rate, avg_processing_days, rejection_rate, throughput_by_month }
```

The bot can answer: "How has Sharma performed vs last quarter?" with real numbers.

**4.2 Predictive dispatch**
Based on historical completion times per vendor + part type, predict when material will be ready:
"Sharma typically takes 6 days for part 16705. Current challan is 4 days old → expected ready: 2 days."

**4.3 Demand forecasting**
Eaton orders 2500 parts, split across challans of 800/700/1000. The bot tracks:
- Average order cycle time per customer
- Typical lot sizes
- Seasonal patterns

Answers: "Based on Eaton's order history, next order is likely in ~18 days."

---

## CMD Commands to Run Right Now

**Step 1 — Kill old backend (if port 3001 stuck):**
```
for /f "tokens=5" %a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %a
```

**Step 2 — Start backend:**
```
cd "C:\Users\user\Desktop\aaniry vms\backend" && npm run start:dev
```

**Step 3 — Start frontend (new CMD window):**
```
cd "C:\Users\user\Desktop\aaniry vms\frontend" && npm run dev
```

**Step 4 — Reset passwords (if needed):**
```
cd "C:\Users\user\Desktop\aaniry vms\backend" && node reset-passwords.js
```

**Step 5 — Test the AI fix:**
After backend compiles, log in as `tk@orgA.com` (password: `Test@1234`) and type:
- `16706` → should find the part via direct DB lookup instantly
- `status of 16706` → same result
- `parts` → should list all parts including 16706

---

## Test Scenarios for Each Role

| Role | Login | Test Query | Expected |
|------|-------|-----------|---------|
| GM/Exec | tk@orgA.com | `briefing` | Full operations summary |
| GM/Exec | tk@orgA.com | `16706` | Part found in catalogue |
| GM/Exec | tk@orgA.com | `add part 16707 Rotor Bearing` | Action tag executed, part created |
| PPC | ppc@orgA.com | `open challans` | All issued challans with vendor names |
| PPC | ppc@orgA.com | `issue challan for 16706 qty 500 to Sharma for Eaton` | Challan created |
| Vendor | (vendor login) | `my challans` | Only their challans, no customer names |
| Vendor | (vendor login) | `mark 400 units of 16706 ready` | Job process updated |

---

## Architecture Summary

```
User → Frontend (Next.js) → /api/ai/chat
                              ↓
                         AiService.processChat()
                              ↓
                    ┌─────────────────────┐
                    │  AiContextService    │  ← 2-min cache
                    │  getSnapshot()       │
                    └─────────────────────┘
                              ↓
                    Fast-paths (no API key needed):
                    • Help  • Challans  • Parts
                    • Dispatch  • POs  • Overview
                              ↓ (miss)
                    directDbLookup() ← BYPASSES CACHE
                    queries Postgres live
                              ↓ (miss)
                    Claude API (haiku-4-5)
                    + conversation history
                              ↓
                    AiActionsService.processResponse()
                    → parse [ACTION:...] tags
                    → execute via service layer
                              ↓
                    Response → Frontend
```

---

*Last updated: March 2026 — J.A.R.V.I.S. v2.0*
