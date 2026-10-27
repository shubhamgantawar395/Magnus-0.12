import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiContextService, OrgSnapshot } from './ai-context.service';
import { AiActionsService } from './ai-actions.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Role groups ────────────────────────────────────────────────────────────────
// Executives: get line-deadline intel, full visibility, strategic briefings
const EXECUTIVE_ROLES = new Set(['director', 'gm', 'executive', 'admin', 'plant_head']);
const PPC_ROLES = new Set(['ppc_manager', 'production_manager']);
const STORE_ROLES = new Set(['store_keeper']);
const VENDOR_ROLES = new Set(['vendor', 'vendor_owner', 'vendor_ppc', 'vendor_supervisor', 'vendor_user']);
const ACCOUNTS_ROLES = new Set(['accounts_manager']);
const CAN_ACT = new Set([...EXECUTIVE_ROLES, ...PPC_ROLES, ...VENDOR_ROLES]);

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

// ── Per-user conversation history (DB-persisted, last 10 turns) ───────────────
interface ConvTurn { role: 'user' | 'assistant'; content: string; }
const CONV_MAX_TURNS = 3;   // keep last 3 turns per user — ~200 tokens, stays lean

// Token budgets — kept tight to stay under 10K input tokens/min
// System prompt ~400t + History ~150t + Snapshot = well under 3,000 tokens total
const SNAPSHOT_MAX_CHARS_EXEC = 5_000;    // ~1,250 tokens — still gives full operational view
const SNAPSHOT_MAX_CHARS_DEFAULT = 3_000; // ~750 tokens — focused ops slice

// ── Action keywords per role ──────────────────────────────────────────────────
const EXEC_ACTIONS = ['add part', 'create part', 'issue challan', 'create challan', 'new challan',
    'create po', 'new po', 'raise po', 'stock statement', 'add vendor', 'create vendor'];
const PPC_ACTIONS = ['create challan', 'new challan', 'issue challan', 'edit challan', 'delete challan',
    'create po', 'raise po', 'new po', 'add vendor', 'update challan'];
const VENDOR_ACTIONS = ['mark ready', 'update dispatch', 'dispatch ready', 'units ready', 'completed',
    'mark complete', 'create invoice', 'raise invoice', 'generate invoice', 'new invoice'];

// ── Snapshot budget guard ───────────────────────────────────────────────────────
// Shrinks the raw contextString when it would push the system prompt over budget.
// Executives get a much larger window so Claude sees the full org picture.
function compressSnapshot(raw: string, isExec = false): string {
    const limit = isExec ? SNAPSHOT_MAX_CHARS_EXEC : SNAPSHOT_MAX_CHARS_DEFAULT;
    if (raw.length <= limit) return raw;

    // Split on the section dividers (── SECTION ──)
    const sections = raw.split(/(?=\n──|\n╚)/);
    const kept: string[] = [];
    let budget = limit;

    for (const section of sections) {
        if (section.length <= budget) {
            kept.push(section);
            budget -= section.length;
        } else {
            // For sections that exceed remaining budget, keep the header line
            // and add a summary note so Claude knows data was trimmed
            const firstLine = section.split('\n').slice(0, 2).join('\n');
            const trimNote = `\n  [${Math.round(section.length / 4)} tokens trimmed — ask specifically to get full detail]`;
            kept.push(firstLine + trimNote);
            budget -= firstLine.length + trimNote.length;
            if (budget <= 0) break;
        }
    }

    return kept.join('');
}

// ── J.A.R.V.I.S. System Prompt ─────────────────────────────────────────────────
function buildSystemPrompt(user: any, snap: OrgSnapshot, userMemory?: string): string {
    const roleTitle = {
        director: 'Director', gm: 'General Manager', executive: 'Executive',
        ppc_manager: 'PPC Manager', production_manager: 'Production Manager',
        plant_head: 'Plant Head', store_keeper: 'Store Keeper',
        accounts_manager: 'Accounts Manager',
        quality_head: 'Quality Head', quality_supervisor: 'Quality Supervisor',
        vendor: 'Vendor Contact', vendor_owner: 'Vendor Owner', vendor_ppc: 'Vendor PPC',
        vendor_supervisor: 'Vendor Supervisor', vendor_user: 'Vendor User',
    }[user.role] ?? user.role;

    const isExec = EXECUTIVE_ROLES.has(user.role);
    const isVendor = VENDOR_ROLES.has(user.role);
    const isPPC = PPC_ROLES.has(user.role);
    const isStore = STORE_ROLES.has(user.role);

    // Role-specific capabilities
    let actionInstructions = '';
    if (isExec) {
        actionInstructions = `
ACTIONS YOU CAN EXECUTE:
When this ${roleTitle} asks you to DO something, use these action tags in your response.
State what you're doing naturally, then append the tag on its own line.

ADD A PART:           [ACTION:ADD_PART|partNumber=X|description=X|capacity=N|unit=NOS]
ISSUE A CHALLAN:      [ACTION:CREATE_CHALLAN|customerId=<id from snapshot>|vendorId=<id from snapshot>|partNumber=X|qty=N|date=YYYY-MM-DD]
CREATE A PO:          [ACTION:CREATE_PO|vendorId=<id from snapshot>|partNumber=X|qty=N|rate=R|description=X]
UPDATE CHALLAN STATUS:[ACTION:UPDATE_CHALLAN_STATUS|challanNumber=X|status=received]

Use IDs from the snapshot [id:...] fields. If multiple customers/vendors match, ask which one.
Always confirm the action in natural language BEFORE the tag.`;
    } else if (isPPC) {
        actionInstructions = `
ACTIONS YOU CAN EXECUTE:
ISSUE A CHALLAN:      [ACTION:CREATE_CHALLAN|customerId=<id>|vendorId=<id>|partNumber=X|qty=N|date=YYYY-MM-DD]
CREATE A PO:          [ACTION:CREATE_PO|vendorId=<id>|partNumber=X|qty=N|rate=R]
UPDATE CHALLAN STATUS:[ACTION:UPDATE_CHALLAN_STATUS|challanNumber=X|status=received]

Use IDs from the snapshot [id:...] fields.`;
    } else if (isVendor) {
        actionInstructions = `
ACTIONS YOU CAN EXECUTE:
MARK PARTS READY:     [ACTION:UPDATE_DISPATCH|partNumber=X|completedQty=N]
CREATE INVOICE:       [ACTION:CREATE_INVOICE|challanNumber=X]

IMPORTANT: Never reveal customer company names. Say "your OEM customer" instead.`;
    }

    const dataScope = isVendor
        ? 'You only see data for this vendor — their challans, POs, and parts. NEVER share customer company names.'
        : isStore
            ? 'Focus on dispatch-ready items, incoming material, and stock levels.'
            : isPPC
                ? 'Focus on challans, POs, vendor performance, and production status.'
                : 'You have full visibility into all operations data including line-wise deadlines.';

    // Executive-specific job pipeline instructions
    let jobPipelineInstructions = '';
    if (isExec || isPPC) {
        const jp = snap.jobPipeline;
        const stuckCount = snap.stuckJobs?.length ?? 0;
        jobPipelineInstructions = `
JOB PIPELINE AWARENESS:
- The snapshot contains live job counts: Pending (${jp.pending}) · In Progress (${jp.in_progress}) · Completed (${jp.completed})${jp.rejected > 0 ? ` · Rejected (${jp.rejected})` : ''}.
- A "job" = one operation on a challan item at a vendor (e.g. machining, welding, assembly).
- ${stuckCount > 0 ? `⚠ ${stuckCount} job(s) are STUCK — no update in 5+ days. Flag these first when asked about pipeline.` : 'No stuck jobs right now.'}
- "In progress" = vendor has started but not completed. "Pending" = challan issued, work not started yet.
- When asked "how many jobs are where" or "pipeline", use JOB PIPELINE section in snapshot. Never guess counts.`;
    }

    // Executive-specific line intelligence instructions
    let lineIntelInstructions = '';
    if (isExec && snap.lineStatus && snap.lineStatus.length > 0) {
        const criticalLines = snap.lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'critical'));
        const linesWithRisk = snap.lineStatus.filter(l => l.atRiskParts.length > 0);
        lineIntelInstructions = `
LINE INTELLIGENCE (your top priority as ${roleTitle}):
- A "line" means a customer/OEM (e.g. Eaton, JCB, Porsche). Each line has monthly dispatch targets per part number.
- When asked about a line: always lead with target vs dispatched %, then flag at-risk parts immediately.
- 🔴 CRITICAL = part will almost certainly miss its monthly target. Escalate immediately.
- 🟡 WARNING = part is running behind but recoverable. Recommend action.
- ${criticalLines.length > 0 ? `RIGHT NOW — ${criticalLines.length} line(s) have CRITICAL parts. Proactively flag these even if not asked.` : linesWithRisk.length > 0 ? `${linesWithRisk.length} line(s) have warning parts. Monitor closely.` : 'All lines currently on track.'}
- When a line is mentioned by name (e.g. "Eaton", "JCB"), pull its specific data from the LINE DEADLINES section.
- For WIP = 0 on a critical part: this means work hasn't even started at vendor level — this is a red flag. Say so.`;
    } else if (isExec) {
        lineIntelInstructions = `
LINE INTELLIGENCE: No monthly targets have been set yet this month. When asked about lines, recommend setting targets in the Line Deadlines module first.`;
    }

    const firstName = user.firstName?.trim() || '';
    const honorific = (isExec || isPPC) ? `${firstName} sir` : firstName;
    const addressAs = firstName ? honorific : roleTitle;

    // Tight Director instructions — plain, no examples, token-efficient
    const directorInstructions = user.role === 'director' ? `
DIRECTOR MODE: Answer the question first. Then surface 1 other urgent thing they should know. End with one clear action. Proactively flag: overdue vendors, at-risk lines, pending PO approvals, stuck quality holds. Never use symbols or special characters.` : '';

    return `You are J.A.R.V.I.S., ops intelligence for ${snap.orgName}. Role: ${roleTitle}${firstName ? ` (${firstName})` : ''}. ${dataScope}

SPEAK like a senior ops manager — natural sentences, no bullets, no symbols, no reference numbers. Use rupees for amounts. Address as "${addressAs}" where natural.
${directorInstructions}
RULES: Numbers must come from snapshot only. Responses under 150 words. No markdown. Plain readable English — this will be read aloud.${isExec ? ' Never read doc reference codes. Answer only what was asked.' : ''}
${jobPipelineInstructions}
${lineIntelInstructions}
${actionInstructions}
TODAY: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
${userMemory ? `\nCONTEXT: ${userMemory}` : ''}
${compressSnapshot(snap.contextString, isExec)}`;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // ── Conversation history helpers (DB-persisted) ───────────────────────────
    private async getHistory(userId: string): Promise<ConvTurn[]> {
        try {
            const rows = await this.prisma.aiConversation.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: CONV_MAX_TURNS,
                select: { role: true, content: true },
            });
            // DB returns newest-first, reverse to get chronological order
            return rows.reverse().map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }));
        } catch (err: any) {
            this.logger.warn('getHistory DB error: ' + err.message);
            return [];
        }
    }

    private async pushHistory(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
        try {
            await this.prisma.aiConversation.create({
                data: { userId, role, content },
            });
            // Trim: keep only the last CONV_MAX_TURNS rows per user
            const rows = await this.prisma.aiConversation.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: CONV_MAX_TURNS,
                select: { id: true },
            });
            if (rows.length > 0) {
                await this.prisma.aiConversation.deleteMany({
                    where: { id: { in: rows.map(r => r.id) } },
                });
            }
        } catch (err: any) {
            this.logger.warn('pushHistory DB error: ' + err.message);
        }
    }

    constructor(
        private readonly aiContextService: AiContextService,
        private readonly aiActionsService: AiActionsService,
        private readonly prisma: PrismaService,
    ) { }

    /** Resolve API key: DB first, env var fallback */
    private async getApiKey(): Promise<string | null> {
        try {
            const rows: any[] = await this.prisma.$queryRawUnsafe(
                `SELECT value FROM "SystemSetting" WHERE key = 'OPENAI_API_KEY' LIMIT 1`
            );
            const dbKey = rows[0]?.value as string | undefined;
            if (dbKey && !dbKey.includes('PASTE')) return dbKey;
        } catch { }
        const envKey = process.env.OPENAI_API_KEY;
        if (envKey && !envKey.includes('PASTE')) return envKey;
        return null;
    }

    async processChat(prompt: string, user: any) {
        this.logger.log(`Chat [${user.role}]: "${prompt}"`);

        // Guard: platform_admin with no org context can't use JARVIS
        // But director/gm/plant_head who also have admin flags should be allowed
        if ((user.role === 'admin' || user.role === 'platform_admin') && !user.organizationId) {
            throw new BadRequestException('Use the admin panel directly.');
        }

        // Build snapshot — never crash the request if this fails
        let snap: OrgSnapshot;
        try {
            snap = await this.aiContextService.getSnapshot(user);
        } catch (err: any) {
            this.logger.error('Snapshot build failed: ' + err.message);
            return { response: `J.A.R.V.I.S. hit a data error loading your snapshot. Try again in a moment. (${err.message})`, toolsCalled: ['error'] };
        }

        const q = prompt.toLowerCase().trim();
        const isVendor = VENDOR_ROLES.has(user.role);
        const isExec = EXECUTIVE_ROLES.has(user.role);
        const isPPC = PPC_ROLES.has(user.role);
        const isStore = STORE_ROLES.has(user.role);

        // ── All queries → Claude (no fast-paths for code lookups) ──────────────
        // For Director/Exec: Claude sees the full org snapshot. For all roles,
        // the DB lookup enriches the conversation naturally through Claude's reasoning.
        // If Claude can't find something in the snapshot, it says so clearly.
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            this.logger.warn('No API key found in DB or env — falling back to local summary');
            return { response: `[JARVIS: API key not configured — contact your platform admin] ${this.buildSmartSummary(snap, user.role)}`, toolsCalled: ['fallback'] };
        }

        this.logger.log(`Calling OpenAI GPT-4o for [${user.role}] at ${snap.orgName}`);

        try {
            // Build messages with conversation history for multi-turn context
            const history = await this.getHistory(user.id);

            // Build per-user memory block (mined from history — no extra DB call)
            const userMemory = this.buildUserMemoryBlock(history);
            const systemPrompt = buildSystemPrompt(user, snap, userMemory);

            const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...history,
                { role: 'user' as const, content: prompt },
            ];

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    max_tokens: 400,
                    messages,
                }),
            });

            if (!res.ok) {
                const errBody = await res.text();
                this.logger.error(`OpenAI API ${res.status}: ${errBody}`);
                // Surface the error clearly so it's visible during debugging
                return { response: `[JARVIS API error ${res.status}: ${errBody.slice(0, 120)}]`, toolsCalled: ['error'] };
            }

            const data = await res.json() as any;
            let text: string = data?.choices?.[0]?.message?.content ?? 'No response.';

            // Process any action tags Claude included
            if (text.includes('[ACTION:') && CAN_ACT.has(user.role)) {
                text = await this.aiActionsService.processResponse(text, user);
            }

            // Store this exchange in conversation history (async, don't block response)
            void this.pushHistory(user.id, 'user', prompt);
            void this.pushHistory(user.id, 'assistant', text);

            return { response: text, toolsCalled: ['claude_api'] };
        } catch (err: any) {
            this.logger.error('OpenAI API fetch error: ' + err.message);
            return { response: `[JARVIS network error: ${err.message}]`, toolsCalled: ['error'] };
        }
    }

    // ── Direct DB lookup (bypasses snapshot cache — guarantees real-time data) ──
    private async directDbLookup(code: string, user: any): Promise<string | null> {
        const orgId = user.organizationId;
        const vendorId = user.vendorId;

        try {
            // 1. Tray configuration (master parts catalogue)
            const part = await this.prisma.trayConfiguration.findFirst({
                where: {
                    partNumber: { contains: code, mode: 'insensitive' },
                    ...(orgId ? { organizationId: orgId } : {}),
                },
                select: { partNumber: true, description: true, capacity: true, unit: true },
            });
            if (part) {
                // Also look for active challan for this part
                const activeChallan = await this.prisma.challanItem.findFirst({
                    where: {
                        partNumber: { contains: code, mode: 'insensitive' },
                        challan: {
                            status: 'issued',
                            ...(orgId ? { customer: { organizationId: orgId } } : { vendorId }),
                        },
                    },
                    select: {
                        quantityIssued: true,
                        challan: { select: { challanNumber: true, challanDate: true, vendor: { select: { companyName: true } } } },
                    },
                });
                const daysAtVendor = activeChallan ? Math.floor((Date.now() - new Date(activeChallan.challan.challanDate).getTime()) / 86400000) : 0;
                const vendorName = activeChallan?.challan.vendor?.companyName ?? 'a vendor';
                if (!activeChallan) {
                    return `${part.partNumber} (${part.description}) isn't at any vendor right now — no active job out.`;
                }
                const overdueNote = daysAtVendor > 7
                    ? ` That's ${daysAtVendor} days — past the standard turnaround, worth a follow-up.`
                    : ` Been there ${daysAtVendor} day${daysAtVendor !== 1 ? 's' : ''} — still within time.`;
                return `${part.partNumber} (${part.description}) — ${activeChallan.quantityIssued} units are with ${vendorName}.${overdueNote}`;
            }

            // 2. Challan by number
            const challan = await this.prisma.deliveryChallan.findFirst({
                where: {
                    challanNumber: { contains: code, mode: 'insensitive' },
                    status: 'issued',
                    ...(orgId ? { customer: { organizationId: orgId } } : { vendorId }),
                },
                select: { challanNumber: true, challanDate: true, vendor: { select: { companyName: true } }, items: { select: { partNumber: true, quantityIssued: true } } },
            });
            if (challan) {
                const daysOut = Math.floor((Date.now() - new Date(challan.challanDate).getTime()) / 86400000);
                const vendorName = challan.vendor?.companyName ?? 'the vendor';
                const partList = challan.items.map((i: any) => `${i.quantityIssued} units of ${i.partNumber}`).join(' and ');
                const overdueNote = daysOut > 7
                    ? ` It's been ${daysOut} days — that's overdue. Worth a call.`
                    : ` It's been ${daysOut} day${daysOut !== 1 ? 's' : ''} — still within time.`;
                return `${vendorName} has ${partList} from that challan.${overdueNote}`;
            }

            // 3. Challan item by part number
            const challanItem = await this.prisma.challanItem.findFirst({
                where: {
                    partNumber: { contains: code, mode: 'insensitive' },
                    challan: {
                        status: 'issued',
                        ...(orgId ? { customer: { organizationId: orgId } } : { vendorId }),
                    },
                },
                select: {
                    partNumber: true, quantityIssued: true,
                    challan: { select: { challanNumber: true, challanDate: true, vendor: { select: { companyName: true } } } },
                },
            });
            if (challanItem) {
                const daysOut = Math.floor((Date.now() - new Date(challanItem.challan.challanDate).getTime()) / 86400000);
                const vendorName = challanItem.challan.vendor?.companyName ?? 'the vendor';
                const overdueNote = daysOut > 7
                    ? ` That's ${daysOut} days out — overdue. Follow up today.`
                    : ` Been there ${daysOut} day${daysOut !== 1 ? 's' : ''}, still within time.`;
                return `${challanItem.partNumber} — ${challanItem.quantityIssued} units are with ${vendorName}.${overdueNote}`;
            }

            // 4. PO item
            const poItem = await this.prisma.pOItem.findFirst({
                where: {
                    partNumber: { contains: code, mode: 'insensitive' },
                    po: { ...(orgId ? { organizationId: orgId } : { vendorId }) },
                },
                select: { partNumber: true, partDescription: true, quantity: true, po: { select: { poNumber: true, status: true } } },
            });
            if (poItem) {
                const desc = poItem.partDescription || poItem.partNumber;
                const status = poItem.po.status === 'in_progress' ? 'approved and active'
                    : poItem.po.status === 'pending_approval' ? 'waiting on approval'
                    : poItem.po.status === 'draft' ? 'still in draft'
                    : poItem.po.status;
                return `${poItem.partNumber} (${desc}) — ${poItem.quantity} units on order, PO is ${status}.`;
            }
        } catch (err: any) {
            this.logger.warn('directDbLookup error: ' + err.message);
        }
        return null;
    }

    // ── Smart lookup: any code/number against all data ─────────────────────────
    private smartLookup(code: string, snap: OrgSnapshot): string | null {
        const lc = code.toLowerCase();
        const isExec = EXECUTIVE_ROLES.has(snap.userRole);

        // Check challans first
        const challan = snap.openChallans.find(c =>
            c.challanNumber.toLowerCase().includes(lc)
        );
        if (challan) {
            const itemLines = challan.items.map(i => `${i.qty}× ${i.partNumber} (${i.partName})`).join(', ');
            if (isExec) {
                return `At ${challan.vendorName} — ${challan.daysOut}d out${challan.isOverdue ? ' ⚠ OVERDUE' : ''}. Parts: ${itemLines}.`;
            }
            return `${challan.challanNumber} — at ${challan.vendorName}, ${challan.daysOut} day${challan.daysOut !== 1 ? 's' : ''} out${challan.isOverdue ? ' ⚠ OVERDUE' : ''}. Items: ${itemLines}.`;
        }

        // Check in open challan items (part number in active challans)
        const activeChallanItems = snap.openChallans.filter(c =>
            c.items.some(i => i.partNumber.toLowerCase().includes(lc))
        );
        if (activeChallanItems.length) {
            const lines = activeChallanItems.map(c => {
                const matchItems = c.items.filter(i => i.partNumber.toLowerCase().includes(lc));
                if (isExec) {
                    return `  ${c.vendorName} — ${matchItems.map(i => `${i.qty}× ${i.partNumber}`).join(', ')} · ${c.daysOut}d out${c.isOverdue ? ' ⚠ OVERDUE' : ''}`;
                }
                return `  ${c.challanNumber} at ${c.vendorName} — ${matchItems.map(i => `${i.qty}× ${i.partNumber} (${i.partName})`).join(', ')} | ${c.daysOut}d out${c.isOverdue ? ' ⚠ OVERDUE' : ''}`;
            });
            return `Part ${code} is currently at vendor:\n${lines.join('\n')}`;
        }

        // Check parts catalogue
        const parts = snap.parts.filter(p =>
            p.partNumber.toLowerCase().includes(lc) ||
            p.description.toLowerCase().includes(lc)
        );
        if (parts.length) {
            const dispatchMatch = snap.dispatchReady.find((d: any) => d.partNumber.toLowerCase().includes(lc));
            const partInfo = parts.map(p => `${p.partNumber} — ${p.description}${p.capacity ? ` (tray: ${p.capacity} ${p.unit})` : ''}`).join('\n');
            const dispatchInfo = dispatchMatch ? `\n⚡ ${dispatchMatch.totalQuantityReady} units ready for dispatch.` : '';
            return `${partInfo}${dispatchInfo}\nNo active challan for this part — all returned or not yet issued.`;
        }

        // Check dispatch ready
        const dispatchMatch = snap.dispatchReady.find((d: any) => d.partNumber.toLowerCase().includes(lc));
        if (dispatchMatch) {
            return `${dispatchMatch.partNumber} — ${dispatchMatch.totalQuantityReady} units ready for dispatch.`;
        }

        // Check customers
        if (snap.customers.length) {
            const cust = snap.customers.find(c =>
                c.name.toLowerCase().includes(lc) || c.code.toLowerCase().includes(lc)
            );
            if (cust) return `Customer found: ${cust.name}${cust.code ? ` (${cust.code})` : ''}.`;
        }

        return null; // Not found in fast-path — let Claude handle it
    }

    // ── Job pipeline response ──────────────────────────────────────────────────
    private buildJobPipelineResponse(snap: OrgSnapshot): string {
        const jp = snap.jobPipeline;
        const total = jp.pending + jp.in_progress + jp.completed + jp.rejected;

        if (total === 0 && snap.stuckJobs.length === 0) {
            return `No job processes tracked yet. Once challans are issued and operations assigned, the pipeline will show up here.`;
        }

        const sentences: string[] = [];

        sentences.push(`Across ${snap.orgName}, there are ${total} job processes tracked right now — ${jp.in_progress} in progress, ${jp.pending} pending, and ${jp.completed} completed.${jp.rejected > 0 ? ` ${jp.rejected} were rejected.` : ''}`);

        if (snap.stuckJobs.length > 0) {
            const stuckList = snap.stuckJobs.map(j => `${j.vendorName} on ${j.partNumber} (${j.daysSinceUpdate} days silent)`).join(', ');
            sentences.push(`Worth flagging — ${snap.stuckJobs.length === 1 ? `one job is` : `${snap.stuckJobs.length} jobs are`} stuck with no update in over 5 days: ${stuckList}.`);
        } else if (jp.in_progress > 0) {
            sentences.push(`All in-progress jobs have had recent activity — nothing stuck.`);
        }

        const pos = snap.posByStatus;
        if (pos.approved + pos.in_progress + pos.pending_approval + pos.draft > 0) {
            sentences.push(`On the PO side: ${pos.approved} approved, ${pos.in_progress} running, ${pos.pending_approval} waiting for approval${pos.draft > 0 ? `, and ${pos.draft} still in draft` : ''}.`);
        }

        const co = snap.customerOrderPipeline;
        if (co.active + co.on_hold > 0) {
            sentences.push(`Customer orders: ${co.active} active${co.on_hold > 0 ? `, ${co.on_hold} on hold` : ''}.`);
        }

        if ((snap.openNcrs || 0) > 0 || (snap.pendingInspections || 0) > 0) {
            sentences.push(`Quality note: ${snap.openNcrs || 0} open NCR${(snap.openNcrs || 0) !== 1 ? 's' : ''} and ${snap.pendingInspections || 0} receipt${(snap.pendingInspections || 0) !== 1 ? 's' : ''} pending inspection.`);
        }

        return sentences.join(' ');
    }

    // ── Challan response ───────────────────────────────────────────────────────
    private buildChallanResponse(prompt: string, q: string, snap: OrgSnapshot): string {
        const code = this.extractCode(prompt);

        // Specific challan lookup
        if (code) {
            const match = snap.openChallans.find(c => c.challanNumber.toLowerCase().includes(code.toLowerCase()));
            if (match) {
                const partList = match.items.map(i => `${i.qty} units of ${i.partNumber}`).join(', ');
                const overdueNote = match.isOverdue
                    ? ` That's ${match.daysOut} days — past the 7-day mark, so it's overdue. Worth a follow-up call today.`
                    : ` It's been there ${match.daysOut} day${match.daysOut !== 1 ? 's' : ''} — still within time.`;
                return `${match.vendorName} currently has ${partList}.${overdueNote}`;
            }
            return `No open challan matching "${code}" — it's either already returned or hasn't been issued yet.`;
        }

        // No material out at all
        if (!snap.openChallans.length) {
            return `All clear — nothing at any vendor right now. Every challan is closed.`;
        }

        const overdue = snap.openChallans.filter(c => c.isOverdue);
        const withinTime = snap.openChallans.filter(c => !c.isOverdue);

        // Build advisory summary
        const parts: string[] = [];

        if (overdue.length) {
            const overdueVendors = overdue.map(c => `${c.vendorName} (${c.daysOut}d)`).join(', ');
            parts.push(`${plural(overdue.length, 'job')} ${overdue.length === 1 ? 'is' : 'are'} overdue — ${overdueVendors}. ${overdue.length === 1 ? 'That' : 'These'} need immediate follow-up.`);
        }

        if (withinTime.length) {
            const withinVendors = withinTime.map(c => {
                const partSummary = c.items.map(i => `${i.qty}× ${i.partNumber}`).join(', ');
                return `${c.vendorName} (${c.daysOut}d, ${partSummary})`;
            }).join('; ');
            parts.push(`${plural(withinTime.length, 'job')} ${withinTime.length === 1 ? 'is' : 'are'} on track: ${withinVendors}.`);
        }

        return parts.join(' ');
    }

    // ── Parts response ─────────────────────────────────────────────────────────
    private buildPartsResponse(prompt: string, q: string, snap: OrgSnapshot): string {
        const code = this.extractCode(prompt);
        const isExec = EXECUTIVE_ROLES.has(snap.userRole);

        if (code) {
            const found = snap.parts.filter(p =>
                p.partNumber.toLowerCase().includes(code.toLowerCase()) ||
                p.description.toLowerCase().includes(code.toLowerCase())
            );
            if (found.length) {
                const part = found[0];

                // Find all active challans for this part
                const activeChallans = snap.openChallans.filter(c =>
                    c.items.some(i => i.partNumber.toLowerCase().includes(code.toLowerCase()))
                );
                const dispatchMatch = snap.dispatchReady.find((d: any) =>
                    d.partNumber.toLowerCase().includes(code.toLowerCase())
                );

                if (!activeChallans.length && !dispatchMatch) {
                    return `${part.partNumber} (${part.description}) isn't at any vendor right now — no active challan out. Either it's been returned, or material hasn't been issued yet.`;
                }

                const sentences: string[] = [];

                if (activeChallans.length === 1) {
                    const c = activeChallans[0];
                    const matchItem = c.items.find(i => i.partNumber.toLowerCase().includes(code.toLowerCase()));
                    const qty = matchItem?.qty ?? 0;
                    if (c.isOverdue) {
                        sentences.push(`${part.partNumber} (${part.description}) — ${qty} units are with ${c.vendorName} and have been there ${c.daysOut} days, which is past the standard turnaround. That one needs a follow-up.`);
                    } else {
                        sentences.push(`${part.partNumber} (${part.description}) — ${qty} units are with ${c.vendorName}, ${c.daysOut} day${c.daysOut !== 1 ? 's' : ''} out. Still within time.`);
                    }
                } else if (activeChallans.length > 1) {
                    const vendorList = activeChallans.map(c => {
                        const item = c.items.find(i => i.partNumber.toLowerCase().includes(code.toLowerCase()));
                        return `${item?.qty ?? 0} at ${c.vendorName} (${c.daysOut}d${c.isOverdue ? ', overdue' : ''})`;
                    }).join(', ');
                    const overdueCount = activeChallans.filter(c => c.isOverdue).length;
                    sentences.push(`${part.partNumber} is split across ${activeChallans.length} vendors — ${vendorList}.${overdueCount ? ` ${overdueCount} ${overdueCount === 1 ? 'is' : 'are'} overdue.` : ''}`);
                }

                if (dispatchMatch) {
                    sentences.push(`${dispatchMatch.totalQuantityReady} units are finished and ready to dispatch.`);
                }

                return sentences.join(' ');
            }
            return `No part matching "${code}" found across tray config, challans, and POs. It may not be in the system yet.`;
        }

        if (!snap.parts.length) {
            return snap.customers.length
                ? `${plural(snap.customers.length, 'customer')} set up but no parts configured yet. Add them via Admin → Tray Configuration, or they'll appear automatically once POs and challans are raised.`
                : `No parts in the system yet. Start by adding customers and parts in Admin.`;
        }

        const atVendor = snap.openChallans.length;
        const overdue = snap.openChallans.filter(c => c.isOverdue).length;
        const summary = atVendor
            ? ` Right now, ${atVendor} job${atVendor !== 1 ? 's' : ''} ${atVendor !== 1 ? 'are' : 'is'} active at vendors${overdue ? `, ${overdue} overdue` : ''}.`
            : '';

        return `${plural(snap.parts.length, 'part')} in the system.${summary} Ask me about a specific part number for a full status breakdown.`;
    }

    // ── Combined customer + parts response ─────────────────────────────────────
    private buildCustomerPartsResponse(q: string, snap: OrgSnapshot): string {
        const isExec = EXECUTIVE_ROLES.has(snap.userRole);

        // Deduplicate customers by name (keep first occurrence — avoids mock/duplicate entries)
        const seen = new Set<string>();
        const uniqueCustomers = snap.customers.filter(c => {
            const key = c.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (!uniqueCustomers.length) {
            return `No OEM customers set up yet. Add them via Admin → Customers.`;
        }

        // ── Specific customer deep-dive ──────────────────────────────────────
        const code = this.extractCode(q);
        const specificMatch = uniqueCustomers.find(c =>
            c.name.toLowerCase().split(' ').some(word => q.includes(word) && word.length > 2) ||
            (code && (c.name.toLowerCase().includes(code.toLowerCase()) || c.code.toLowerCase().includes(code.toLowerCase())))
        );
        if (specificMatch) {
            const customerChallans = snap.openChallans.filter(c => c.customerId === specificMatch.id);
            const jobsForCustomer = snap.recentJobs.filter(j =>
                customerChallans.some(c => c.vendorName === j.vendorName)
            );
            const challanInfo = customerChallans.length
                ? `\n· ${customerChallans.length} active job${customerChallans.length !== 1 ? 's' : ''} at vendors — ${customerChallans.map(c => `${c.items.reduce((s, i) => s + i.qty, 0)} units at ${c.vendorName}${c.isOverdue ? ' ⚠ OVERDUE' : ''}`).join(', ')}`
                : `\n· No active jobs at vendors right now`;
            return `${specificMatch.name}${challanInfo}.${jobsForCustomer.length ? ` ${jobsForCustomer.length} recent job process${jobsForCustomer.length !== 1 ? 'es' : ''} on record.` : ''}`;
        }

        // ── Just "what are our customers" — list names only ──────────────────
        const askedOnlyCustomers = !this.has(q, ['part', 'component', 'parts and', 'and parts', 'module']);
        if (askedOnlyCustomers) {
            const names = uniqueCustomers.map(c => c.name);
            const last = names.pop();
            const nameList = names.length ? `${names.join(', ')} and ${last}` : last;
            return `You have ${uniqueCustomers.length} OEM customer${uniqueCustomers.length !== 1 ? 's' : ''}: ${nameList}.`;
        }

        // ── Asked for customers + parts together ─────────────────────────────
        const nameList = uniqueCustomers.map(c => c.name).join(', ');
        const partsLine = snap.parts.length
            ? `${snap.parts.length} parts in the system — ask me about a specific part number for details.`
            : `No parts configured yet.`;
        return `${uniqueCustomers.length} customers: ${nameList}.\n${partsLine}`;
    }

    // ── Line status response (executive fast-path) ─────────────────────────────
    private buildLineStatusResponse(specificLine: any | null, snap: OrgSnapshot, q: string): string {
        const { lineStatus } = snap;
        const now = new Date();
        const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
        const monthName = now.toLocaleString('en-IN', { month: 'long' });

        if (specificLine) {
            // Single line deep-dive
            const l = specificLine;
            const pct = l.totalTarget > 0 ? Math.round((l.totalDispatched / l.totalTarget) * 100) : 0;
            let resp = `${l.lineName} line — ${monthName} · ${daysLeft} days left\n`;
            resp += `Target: ${l.totalTarget} · Dispatched: ${l.totalDispatched} (${pct}%) · WIP: ${l.totalWip} · Balance: ${l.totalBalance}\n`;

            if (l.atRiskParts.length === 0) {
                resp += `· All parts on track ✅`;
            } else {
                resp += `\nAT RISK (${l.atRiskParts.length} part${l.atRiskParts.length !== 1 ? 's' : ''}):\n`;
                for (const p of l.atRiskParts) {
                    const wipNote = p.wip === 0 ? ' — NOT started at vendor ⚠' : ` — ${p.wip} at vendor`;
                    resp += `· ${p.riskLevel === 'critical' ? '🔴' : '🟡'} ${p.partNumber}: need ${p.balance} more, ${p.dispatched}/${p.target} done${wipNote}\n`;
                }
            }
            return resp.trim();
        }

        // All-lines summary
        if (lineStatus.length === 0) {
            return `No monthly targets set for ${monthName} yet. Set targets in Line Deadlines module to track progress.`;
        }

        const criticalLines = lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'critical'));
        const warningLines = lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'warning') && !criticalLines.includes(l));
        const onTrackLines = lineStatus.filter(l => l.atRiskParts.length === 0);

        let resp = `${monthName} Line Status — ${daysLeft} days remaining\n\n`;

        for (const l of lineStatus) {
            const pct = l.totalTarget > 0 ? Math.round((l.totalDispatched / l.totalTarget) * 100) : 0;
            const icon = l.totalBalance === 0 ? '✅' : l.atRiskParts.some(p => p.riskLevel === 'critical') ? '🔴' : l.atRiskParts.length > 0 ? '🟡' : '🟢';
            resp += `${icon} ${l.lineName}: ${pct}% done (${l.totalDispatched}/${l.totalTarget}) · bal ${l.totalBalance}`;
            if (l.atRiskParts.length > 0) {
                resp += ` · ${l.atRiskParts.length} part${l.atRiskParts.length !== 1 ? 's' : ''} at risk`;
            }
            resp += '\n';
        }

        if (criticalLines.length > 0) {
            resp += `\n⚠ NEEDS IMMEDIATE ATTENTION: ${criticalLines.map(l => l.lineName).join(', ')} — ask me "Eaton line" for drill-down.`;
        } else if (warningLines.length > 0) {
            resp += `\n🟡 Monitor: ${warningLines.map(l => l.lineName).join(', ')}`;
        }

        return resp.trim();
    }

    // ── PO response ────────────────────────────────────────────────────────────
    private buildPOResponse(snap: OrgSnapshot): string {
        if (!snap.pendingPOs.length && snap.draftPOs === 0) {
            const approvedNote = snap.approvedPOValue > 0
                ? ` ${inr(snap.approvedPOValue)} worth of approved POs are already in motion.`
                : '';
            return `Nothing pending on the procurement side.${approvedNote}`;
        }

        const parts: string[] = [];

        if (snap.pendingApprovals > 0) {
            const total = snap.pendingPOs.reduce((s, p) => s + p.amount, 0);
            const vendorNames = snap.pendingPOs.slice(0, 3).map(p => p.vendorName).join(', ');
            const andMore = snap.pendingApprovals > 3 ? ` and ${snap.pendingApprovals - 3} more` : '';
            parts.push(`${snap.pendingApprovals} purchase order${snap.pendingApprovals !== 1 ? 's are' : ' is'} waiting on your approval — ${inr(total)} in total. ${vendorNames}${andMore} ${snap.pendingApprovals === 1 ? 'is' : 'are'} waiting to get started.`);
        }

        if (snap.draftPOs > 0) {
            const draftVerb = snap.draftPOs !== 1 ? "s haven't" : " hasn't";
            parts.push(`${snap.draftPOs} draft PO${draftVerb} been submitted yet — worth checking if those are still needed.`);
        }

        if (snap.approvedPOValue > 0) {
            parts.push(`${inr(snap.approvedPOValue)} in approved POs already running.`);
        }

        return parts.join(' ');
    }

    // ── Smart summary ──────────────────────────────────────────────────────────
    private buildSmartSummary(snap: OrgSnapshot, role: string): string {
        const sentences: string[] = [];
        const isExec = EXECUTIVE_ROLES.has(role);
        const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();

        // Line deadline alerts — lead with this for executives
        if (isExec && snap.lineStatus && snap.lineStatus.length > 0) {
            const criticalLines = snap.lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'critical'));
            const warningLines = snap.lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'warning') && !criticalLines.includes(l));
            if (criticalLines.length > 0) {
                sentences.push(`🔴 ${criticalLines.map(l => l.lineName).join(' and ')} ${criticalLines.length === 1 ? 'is' : 'are'} in a critical spot — parts will miss the month if nothing moves. Ask me to drill down.`);
            }
            if (warningLines.length > 0) {
                sentences.push(`🟡 ${warningLines.map(l => l.lineName).join(' and ')} ${warningLines.length === 1 ? 'is' : 'are'} running behind — still recoverable but worth watching.`);
            }
            if (criticalLines.length === 0 && warningLines.length === 0) {
                sentences.push(`All ${snap.lineStatus.length} lines are on track with ${daysLeft} days left in the month.`);
            }
        }

        // Overdue material
        if (snap.overdueChallans > 0) {
            const vendors = snap.openChallans.filter(c => c.isOverdue).map(c => `${c.vendorName} (${c.daysOut}d)`).join(', ');
            sentences.push(`Material at ${vendors} is overdue — that's the most urgent thing to follow up on.`);
        }

        // Stuck jobs
        if (snap.stuckJobs && snap.stuckJobs.length > 0) {
            const stuckList = snap.stuckJobs.map(j => `${j.vendorName} on ${j.partNumber}`).join(', ');
            sentences.push(`${snap.stuckJobs.length === 1 ? `${stuckList} hasn't reported` : `${snap.stuckJobs.length} jobs haven't had`} any update in over 5 days — worth a call.`);
        }

        // PO approvals
        if (snap.pendingApprovals > 0) {
            const total = snap.pendingPOs.reduce((s, p) => s + p.amount, 0);
            sentences.push(`There ${snap.pendingApprovals === 1 ? 'is' : 'are'} ${snap.pendingApprovals} purchase order${snap.pendingApprovals !== 1 ? 's' : ''} waiting for your approval — ${inr(total)} in total.`);
        }

        // Vendor invoices
        if (snap.pendingInvoices.length > 0) {
            const total = snap.pendingInvoices.reduce((s, i) => s + i.amount, 0);
            sentences.push(`${snap.pendingInvoices.length} vendor invoice${snap.pendingInvoices.length !== 1 ? 's' : ''} pending — ${inr(total)} sitting in the queue.`);
        }

        // Quality flags
        if ((snap.openNcrs || 0) > 0) {
            sentences.push(`${snap.openNcrs} quality NCR${snap.openNcrs !== 1 ? 's' : ''} still open.`);
        }
        if ((snap.pendingInspections || 0) > 0) {
            sentences.push(`${snap.pendingInspections} incoming receipt${snap.pendingInspections !== 1 ? 's' : ''} need inspection before they can move forward.`);
        }

        // Active material (all fine)
        if (snap.openChallans.length > 0 && snap.overdueChallans === 0) {
            sentences.push(`${snap.openChallans.length} job${snap.openChallans.length !== 1 ? 's' : ''} active at vendors — all within time, nothing overdue.`);
        } else if (snap.openChallans.length === 0) {
            sentences.push(`No material out at vendors right now.`);
        }

        // Dispatch ready
        if (snap.dispatchReady.length > 0) {
            sentences.push(`${snap.dispatchReady.length} part type${snap.dispatchReady.length !== 1 ? 's' : ''} ready to ship when you are.`);
        }

        // Job pipeline snapshot (exec)
        if (isExec) {
            const jp = snap.jobPipeline;
            if (jp && (jp.pending + jp.in_progress) > 0) {
                sentences.push(`Pipeline has ${jp.in_progress} jobs in progress and ${jp.pending} pending — ${jp.completed} wrapped up so far.`);
            }
            if (snap.jobsToday > 0) sentences.push(`${snap.jobsToday} job${snap.jobsToday !== 1 ? 's' : ''} completed today.`);
        }

        if (!sentences.length) return `All clear at ${snap.orgName} — nothing needs your attention right now.`;

        // Join as a flowing paragraph, not a vertical list — advisor gives a briefing, not a report
        return sentences.join(' ');
    }

    // ── Smart todo ─────────────────────────────────────────────────────────────
    private buildSmartTodo(snap: OrgSnapshot, role: string): string {
        const urgent: string[] = [];
        const normal: string[] = [];

        // Overdue material — top urgency
        snap.openChallans.filter(c => c.isOverdue).forEach(c =>
            urgent.push(`Follow up with ${c.vendorName} — material has been there ${c.daysOut} days with no return.`)
        );

        // Stuck jobs
        if (snap.stuckJobs && snap.stuckJobs.length > 0) {
            snap.stuckJobs.forEach(j =>
                urgent.push(`Chase ${j.vendorName} on ${j.partNumber} — no update in ${j.daysSinceUpdate} days.`)
            );
        }

        // PO approvals
        if (snap.pendingApprovals > 0) {
            const vendorNames = snap.pendingPOs.slice(0, 3).map(p => p.vendorName).join(', ');
            normal.push(`Approve ${snap.pendingApprovals} purchase order${snap.pendingApprovals !== 1 ? 's' : ''} — ${vendorNames}${snap.pendingApprovals > 3 ? ' and others' : ''} are waiting.`);
        }

        // Invoices
        const submitted = snap.pendingInvoices.filter(i => i.status === 'submitted');
        if (submitted.length) {
            normal.push(`Review and approve ${submitted.length} vendor invoice${submitted.length !== 1 ? 's' : ''} — ${inr(submitted.reduce((s, i) => s + i.amount, 0))} ready for sign-off.`);
        }

        // Quality
        if ((snap.openNcrs || 0) > 0) {
            normal.push(`${snap.openNcrs} open NCR${snap.openNcrs !== 1 ? 's' : ''} need resolution — quality issues still pending.`);
        }
        if ((snap.pendingInspections || 0) > 0) {
            normal.push(`${snap.pendingInspections} incoming batch${snap.pendingInspections !== 1 ? 'es' : ''} awaiting inspection before they can move forward.`);
        }

        // Draft POs
        if (snap.draftPOs > 0) {
            normal.push(`${snap.draftPOs} draft PO${snap.draftPOs !== 1 ? 's' : ''} haven't been submitted yet.`);
        }

        // Dispatch
        if (snap.dispatchReady.length > 0) {
            normal.push(`${snap.dispatchReady.length} part type${snap.dispatchReady.length !== 1 ? 's' : ''} are ready to dispatch — just needs scheduling.`);
        }

        // On-hold orders
        if (snap.customerOrderPipeline?.on_hold > 0) {
            normal.push(`${snap.customerOrderPipeline.on_hold} customer order${snap.customerOrderPipeline.on_hold !== 1 ? 's' : ''} are on hold and may need a decision.`);
        }

        if (!urgent.length && !normal.length) {
            return `Nothing urgent on your plate right now. ${snap.openChallans.length ? `${snap.openChallans.length} job${snap.openChallans.length !== 1 ? 's' : ''} active at vendors, all within time.` : 'No material out at vendors.'} Clean slate.`;
        }

        const all = [...urgent, ...normal];
        if (all.length === 1) return all[0];
        // Lead with the most urgent, weave the rest into a flowing briefing
        const [first, ...rest] = all;
        return `${first} After that — ${rest.join(' Also, ')}`;
    }

    // ── Help text ──────────────────────────────────────────────────────────────
    private helpText(role: string): string {
        const base = `J.A.R.V.I.S. online — live Postgres access. I can report on challans, invoices, POs, parts, customers, vendors, and dispatch status.`;

        if (VENDOR_ROLES.has(role)) {
            return `${base}\nI can also: · Mark parts ready for dispatch ("mark 300 units of 16705 ready") · Create tax invoices ("create invoice for challan DC/2026/03/001")\nTry: "Show my challans", "What's overdue?", "Create invoice for challan DC/..."`;
        }
        if (PPC_ROLES.has(role)) {
            return `${base}\nI can also: · Issue challans ("issue challan for 16705 qty 500 to vendor Sharma for Eaton") · Create POs ("create PO for Sharma, 16705, qty 1000, rate 45")\nTry: "What's overdue?", "Show open challans", "Issue challan for part 16705 qty 800 to vendor [name]"`;
        }
        if (EXECUTIVE_ROLES.has(role)) {
            return `${base}\nI can also: · Add parts · Issue challans · Create POs · Stock statements\nTry: "Give me a briefing", "What needs my attention?", "Add part 16705 Rotor Hub", "Issue challan for 16705 qty 800 to vendor Sharma for Eaton"`;
        }
        if (STORE_ROLES.has(role)) {
            return `${base}\nFocus: dispatch-ready parts and incoming material. Try: "What's ready for dispatch?", "Show incoming challans"`;
        }
        return base;
    }

    // ── Executive Part Intel ───────────────────────────────────────────────────
    // Runs 2 parallel queries and builds a 4-point natural-language briefing:
    //   1. Deadline        — PO delivery date + ordered qty
    //   2. PPC dispatch    — challans issued to vendor(s) for this part
    //   3. Vendor returns  — how many units shipped back, by whom
    //   4. Needs attention — overdue/stuck/no-PO flags, capped at 3
    private async buildExecutivePartIntel(code: string, orgId: string): Promise<string | null> {
        try {
            const now = Date.now();

            const [pos, challans] = await Promise.all([
                // Q1 — All non-cancelled POs that contain this part
                this.prisma.purchaseOrder.findMany({
                    where: {
                        organizationId: orgId,
                        status: { not: 'cancelled' },
                        items: { some: { partNumber: { contains: code, mode: 'insensitive' } } },
                    },
                    select: {
                        deliveryDate: true, status: true,
                        vendor: { select: { companyName: true } },
                        items: {
                            where: { partNumber: { contains: code, mode: 'insensitive' } },
                            select: { partNumber: true, partDescription: true, quantity: true },
                        },
                    },
                    orderBy: { deliveryDate: 'asc' },
                    take: 5,
                }),

                // Q2 — All challans (any status) that carry this part
                this.prisma.deliveryChallan.findMany({
                    where: {
                        customer: { organizationId: orgId },
                        items: { some: { partNumber: { contains: code, mode: 'insensitive' } } },
                    },
                    select: {
                        challanDate: true, status: true,
                        vendor: { select: { companyName: true } },
                        items: {
                            where: { partNumber: { contains: code, mode: 'insensitive' } },
                            select: {
                                partNumber: true, partDescription: true, quantityIssued: true,
                                jobProcesses: {
                                    select: { status: true, completedQuantity: true, updatedAt: true },
                                    orderBy: { processSequence: 'asc' },
                                },
                            },
                        },
                    },
                    orderBy: { challanDate: 'desc' },
                    take: 20,
                }),
            ]);

            // Nothing in the system for this code → fall through to generic lookup
            if (!pos.length && !challans.length) return null;

            const firstItem = pos[0]?.items[0] ?? challans[0]?.items[0];
            if (!firstItem) return null;

            const partNumber = firstItem.partNumber;
            const partDesc = (firstItem.partDescription || '').trim();

            const sections: string[] = [];
            const flags: string[] = [];

            // ── 1. Deadline ───────────────────────────────────────────────────────
            const activePO = pos.find(p =>
                ['approved', 'in_progress', 'pending_approval'].includes(p.status)
            ) ?? pos[0];

            if (activePO) {
                const totalOrdered = activePO.items.reduce((s, i) => s + i.quantity, 0);
                const vendorName = activePO.vendor?.companyName ?? 'vendor';
                let deadlinePart: string;
                if (activePO.deliveryDate) {
                    const daysLeft = Math.ceil((new Date(activePO.deliveryDate).getTime() - now) / 86400000);
                    const dateStr = new Date(activePO.deliveryDate)
                        .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    if (daysLeft < 0) {
                        deadlinePart = `Deadline was ${dateStr} — overdue by ${Math.abs(daysLeft)}d`;
                        flags.push(`PO deadline missed by ${Math.abs(daysLeft)}d — escalate`);
                    } else if (daysLeft <= 5) {
                        deadlinePart = `Deadline ${dateStr} — only ${daysLeft}d left`;
                        flags.push(`Only ${daysLeft}d to PO deadline`);
                    } else {
                        deadlinePart = `Deadline ${dateStr} (${daysLeft}d remaining)`;
                    }
                } else {
                    deadlinePart = `No delivery date on PO`;
                    flags.push(`PO has no delivery date — set one`);
                }
                sections.push(`Deadline: ${deadlinePart} · ${totalOrdered} units ordered from ${vendorName} [${activePO.status}]`);
            } else {
                sections.push(`Deadline: No active PO for this part`);
                flags.push(`No PO raised — check with procurement`);
            }

            // ── 2. PPC dispatch (challans sent to vendors) ────────────────────────
            const issuedChallans = challans.filter(c => c.status === 'issued');
            const receivedChallans = challans.filter(c => c.status === 'received');
            const totalSent = challans.reduce((s, c) =>
                s + c.items.reduce((ss, i) => ss + i.quantityIssued, 0), 0);
            const currentlyOut = issuedChallans.reduce((s, c) =>
                s + c.items.reduce((ss, i) => ss + i.quantityIssued, 0), 0);
            const totalBack = receivedChallans.reduce((s, c) =>
                s + c.items.reduce((ss, i) => ss + i.quantityIssued, 0), 0);

            if (totalSent === 0) {
                sections.push(`PPC dispatch: No material sent to any vendor yet`);
                flags.push(`PPC hasn't dispatched material — challan needed`);
            } else {
                const byVendorSent = new Map<string, number>();
                for (const c of challans) {
                    const v = c.vendor?.companyName ?? 'Unknown';
                    byVendorSent.set(v, (byVendorSent.get(v) ?? 0) +
                        c.items.reduce((s, i) => s + i.quantityIssued, 0));
                }
                const vSentLines = [...byVendorSent.entries()]
                    .map(([v, q]) => `${q} units → ${v}`).join(', ');
                sections.push(`PPC dispatched: ${totalSent} units total (${vSentLines})`);
            }

            // ── 3. Vendor returns ─────────────────────────────────────────────────
            if (totalSent > 0) {
                if (totalBack === 0) {
                    sections.push(`Vendor shipped back: Nothing received yet — ${currentlyOut} units still at vendor`);
                    for (const c of issuedChallans) {
                        const daysOut = Math.floor((now - new Date(c.challanDate).getTime()) / 86400000);
                        if (daysOut > 7) {
                            flags.push(`${c.vendor?.companyName ?? 'Vendor'} has had material ${daysOut}d — no return`);
                        }
                    }
                } else {
                    const byVendorBack = new Map<string, number>();
                    for (const c of receivedChallans) {
                        const v = c.vendor?.companyName ?? 'Unknown';
                        byVendorBack.set(v, (byVendorBack.get(v) ?? 0) +
                            c.items.reduce((s, i) => s + i.quantityIssued, 0));
                    }
                    const vBackLines = [...byVendorBack.entries()]
                        .map(([v, q]) => `${q} from ${v}`).join(', ');
                    const stillOut = currentlyOut > 0
                        ? ` · ${currentlyOut} still at vendor` : ' · fully returned';
                    sections.push(`Vendor shipped back: ${totalBack} units (${vBackLines})${stillOut}`);
                }
            }

            // ── 4. Job WIP (from issued challans) ────────────────────────────────
            let wipTotal = 0;
            let pendingJobs = 0;
            let inProgressJobs = 0;
            for (const c of issuedChallans) {
                for (const item of c.items) {
                    for (const jp of item.jobProcesses) {
                        if (jp.status === 'pending') pendingJobs++;
                        if (jp.status === 'in_progress') {
                            inProgressJobs++;
                            wipTotal += jp.completedQuantity ?? 0;
                        }
                        const daysSince = Math.floor((now - new Date(jp.updatedAt).getTime()) / 86400000);
                        if (['pending', 'in_progress'].includes(jp.status) && daysSince > 5) {
                            flags.push(`${c.vendor?.companyName ?? 'Vendor'} job silent for ${daysSince}d — follow up`);
                        }
                    }
                }
            }

            if (pendingJobs + inProgressJobs > 0) {
                const jobParts: string[] = [];
                if (inProgressJobs) {
                    jobParts.push(`${inProgressJobs} job${inProgressJobs > 1 ? 's' : ''} in progress` +
                        (wipTotal ? ` (${wipTotal} units done so far)` : ''));
                }
                if (pendingJobs) jobParts.push(`${pendingJobs} not started yet`);
                sections.push(`Job WIP: ${jobParts.join(', ')}`);
            } else if (issuedChallans.length > 0 && currentlyOut > 0) {
                sections.push(`Job WIP: No jobs logged — vendor hasn't updated yet`);
                flags.push(`Material at vendor but no job process recorded`);
            }

            // ── Assemble final response ───────────────────────────────────────────
            const header = partDesc ? `${partNumber} — ${partDesc}` : partNumber;
            const attention = flags.length > 0
                ? `\nNeeds attention: ${flags.slice(0, 3).join(' · ')}`
                : '\nAll looks good on this part.';

            return `${header}\n${sections.join('\n')}${attention}`;
        } catch (err: any) {
            this.logger.warn(`buildExecutivePartIntel error: ${err.message}`);
            return null;
        }
    }

    // ── Per-user topic memory ──────────────────────────────────────────────────
    // Mined from conversation history — no extra DB table or migrations needed.
    // Identifies which operational areas each user cares most about and injects
    // a short "user context" block into the system prompt so JARVIS can proactively
    // surface those topics and tailor its tone for that person.

    private readonly TOPIC_PATTERNS: Array<[RegExp, string]> = [
        [/vendor|machining|welding|sharma|gupta|supplier|job\s*work/i,     'vendor performance'],
        [/part|component|rotor|hub|shaft|gear|bearing|\d{4,}/i,            'part tracking'],
        [/overdue|delay|stuck|not\s*return|pending|waiting|chase/i,        'overdue & delays'],
        [/challan|dc\/|material\s+at|dispatch.*vendor|issued/i,            'material dispatch'],
        [/invoice|billing|payment|inr|amount|dues|vendor.*bill/i,          'invoicing'],
        [/deadline|target|line|eaton|jcb|tata|mahindra|monthly/i,         'line targets'],
        [/dispatch|ship|ready|finished\s+goods|gate/i,                     'dispatch readiness'],
        [/po|purchase\s*order|procure|approval|approve/i,                  'procurement'],
        [/quality|ncr|inspection|rejection|defect/i,                       'quality'],
        [/pipeline|job|wip|in.progress|progress/i,                        'job pipeline'],
    ];

    private extractUserTopics(queries: string[]): string[] {
        const counts = new Map<string, number>();
        for (const q of queries) {
            for (const [re, topic] of this.TOPIC_PATTERNS) {
                if (re.test(q)) counts.set(topic, (counts.get(topic) ?? 0) + 1);
            }
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([t]) => t);
    }

    private buildUserMemoryBlock(history: ConvTurn[]): string {
        if (!history.length) return '';
        const queries = history.filter(h => h.role === 'user').map(h => h.content);
        if (!queries.length) return '';

        const topics = this.extractUserTopics(queries);
        if (!topics.length) return '';

        // Surface the most recent query topic so JARVIS feels continuity-aware
        const lastQuery = queries[queries.length - 1] ?? '';
        const lastTopics = this.extractUserTopics([lastQuery]);
        const recentFocus = lastTopics.length ? ` Most recent focus: ${lastTopics[0]}.` : '';

        return `USER MEMORY: Based on recent conversations, this person regularly asks about ${topics.join(', ')}.${recentFocus} When relevant, proactively connect your answer to these areas — it shows you know what they care about. Do not mention this memory block explicitly.`;
    }

    // ── Utilities ──────────────────────────────────────────────────────────────
    private has(input: string, keywords: string[]): boolean {
        return keywords.some(k => input.includes(k));
    }

    private extractCode(prompt: string): string | undefined {
        const skipWords = new Set(['what', 'show', 'list', 'give', 'tell', 'find', 'have', 'does', 'this', 'that',
            'with', 'from', 'about', 'parts', 'vendors', 'customer', 'customers', 'status', 'ready',
            'dispatch', 'finished', 'total', 'count', 'many', 'help', 'commands', 'challan', 'challans',
            'open', 'material', 'vendor', 'overdue', 'invoice', 'invoices', 'order', 'orders', 'mark',
            'create', 'issue', 'raise', 'add', 'make', 'generate', 'unit', 'units', 'quantity', 'qty']);

        const tokens = prompt.split(/\s+/);

        // Prefer tokens with alphanumeric mix (e.g. DC/2026/03/001, PN-16705, 16705)
        for (const token of tokens) {
            const clean = token.replace(/[^A-Z0-9/\-]/gi, '');
            if (clean.length >= 3 && /\d/.test(clean) && !skipWords.has(clean.toLowerCase())) return clean;
        }
        // Fallback: long alphabetic token
        for (const token of tokens) {
            const clean = token.replace(/[^A-Z]/gi, '');
            if (clean.length >= 6 && !skipWords.has(clean.toLowerCase())) return clean;
        }
        return undefined;
    }
}
