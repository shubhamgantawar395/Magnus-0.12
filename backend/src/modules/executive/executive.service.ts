import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExecutiveService {
    constructor(private prisma: PrismaService) { }

    async getStats(organizationId: string) {
        // 1. Total Active Vendors
        const activeVendors = await this.prisma.vendor.count({
            where: {
                // Filter by vendors linked to a customer belonging to this organization
                customer: { organizationId },
                isActive: true,
                status: 'approved'
            }
        });

        // 2. Pending Dispatches (Next 7 Days)
        const now = new Date();
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);

        const pendingDispatches = await this.prisma.dispatchPlan.count({
            where: {
                // Dispatch plans for this organization (as Customer)
                customer: { organizationId },
                status: 'planned',
                plannedDate: {
                    lte: nextWeek
                }
            }
        });

        // 3. Completed Jobs Today
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // JobProcess -> ChallanItem -> Challan -> Customer -> Organization
        const completedJobsToday = await this.prisma.jobProcess.count({
            where: {
                challanItem: {
                    challan: {
                        customer: { organizationId }
                    }
                },
                status: 'completed',
                completedAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        return {
            activeVendors,
            pendingDispatches,
            completedJobsToday
        };
    }

    async getStockStatement(organizationId: string) {
        // Calculate stock residing at vendors (Issued - Dispatched)
        // This is a simplified calculation: 
        // Stock at Vendor = Sum(ChallanItem.quantityIssued) - Sum(DispatchItem.quantityDispatched)

        // We need to fetch all active challan items linked to this organization (as Customer)
        const rawItems = await this.prisma.challanItem.findMany({
            where: {
                challan: {
                    customer: { organizationId },
                    status: { not: 'closed' }
                }
            },
            include: {
                dispatchItems: true,
                jobProcesses: true,
                challan: {
                    select: {
                        vendor: {
                            select: { companyName: true }
                        }
                    }
                }
            }
        });

        // Aggregate by Stage
        let rawMaterial = 0;
        let workInProgress = 0;
        let finishedGoods = 0;
        let dispatched = 0;

        rawItems.forEach(item => {
            const totalIssued = item.quantityIssued;
            let totalCompleted = 0;
            let totalDispatched = item.dispatchItems.reduce((acc, di) => acc + di.quantityDispatched, 0);

            // Find the last process for this item to determine finished goods
            // For simplicity, we assume sum of last process completed qty = finished goods ready
            // And sum of other processes = WIP (this is an approximation)

            // A better approximation for this specific simplified tracking:
            // 1. Total Issued = Raw Material initially
            // 2. As processes complete, they move to next stage.
            // 3. Let's simplistically classify based on the *latest* status of processes.

            const processes = item.jobProcesses;
            if (processes.length > 0) {
                // Check if all processes are completed
                const allCompleted = processes.every(p => p.status === 'completed');
                const anyInProgress = processes.some(p => p.status === 'in_progress' || p.status === 'completed');

                // Get total quantity that has finished the LAST process
                const lastProcess = processes.sort((a, b) => (b.processSequence || 0) - (a.processSequence || 0))[0];
                const finishedQty = lastProcess ? lastProcess.completedQuantity : 0;

                // Finished Goods waiting at vendor = Finished Qty - Dispatched Qty
                const readyToDispatch = Math.max(0, finishedQty - totalDispatched);

                finishedGoods += readyToDispatch;
                dispatched += totalDispatched;

                // WIP = Issued - Finished - Dispatched (Approximation) -> Actually WIP is strictly what is IN machines
                // Let's take WIP as: Issued - Finished (Last Stage)
                const wipQty = Math.max(0, totalIssued - finishedQty);
                workInProgress += wipQty;

            } else {
                // No processes defined yet, purely raw material
                rawMaterial += totalIssued;
            }
        });

        return {
            rawMaterial,
            workInProgress,
            finishedGoods,
            dispatched
        };
    }

    async getVendorPerformance(organizationId: string) {
        // Calculate Rejection Rate = (Total Rejected / Total Completed) * 100
        // Get top vendors by volume and quality

        const vendors = await this.prisma.vendor.findMany({
            where: {
                customer: { organizationId },
                isActive: true
            },
            include: {
                deliveryChallans: {
                    where: {
                        customer: { organizationId } // Only count challans for THIS customer
                    },
                    include: {
                        items: {
                            include: {
                                jobProcesses: true
                            }
                        }
                    }
                }
            }
        });

        const performanceData = vendors.map(vendor => {
            let totalCompleted = 0;
            let totalRejected = 0;

            vendor.deliveryChallans.forEach(challan => {
                challan.items.forEach(item => {
                    item.jobProcesses.forEach(proc => {
                        totalCompleted += proc.completedQuantity;
                        totalRejected += proc.rejectedQuantity;
                    });
                });
            });

            const rejectionRate = totalCompleted > 0
                ? (totalRejected / (totalCompleted + totalRejected)) * 100
                : 0;

            return {
                id: vendor.id,
                name: vendor.companyName,
                totalProduction: totalCompleted,
                rejectionRate: parseFloat(rejectionRate.toFixed(2)),
                rating: rejectionRate < 1 ? 'A+' : rejectionRate < 3 ? 'A' : rejectionRate < 5 ? 'B' : 'C'
            };
        });

        // Return sorted by lowest rejection rate, then highest production
        return performanceData
            .filter(v => v.totalProduction > 0)
            .sort((a, b) => a.rejectionRate - b.rejectionRate || b.totalProduction - a.totalProduction)
            .slice(0, 10);
    }

    async getDispatchDeadlines(organizationId: string) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch Upcoming Dispatch Plans
        const plans = await this.prisma.dispatchPlan.findMany({
            where: {
                customer: { organizationId }, // Filter by Customer's Org
                status: { not: 'delivered' },
                plannedDate: {
                    gte: startOfToday
                }
            },
            include: {
                customer: {
                    select: { companyName: true, code: true }
                },
                vendor: {
                    select: { companyName: true }
                },
                items: {
                    include: {
                        challanItem: {
                            select: { partNumber: true }
                        }
                    }
                }
            },
            orderBy: {
                plannedDate: 'asc'
            },
            take: 10
        });

        return plans.map(plan => ({
            id: plan.id,
            date: plan.plannedDate,
            customer: plan.customer.companyName,
            vendor: plan.vendor.companyName,
            vehicle: plan.vehicleNumber || 'Pending',
            status: plan.status,
            parts: plan.items.map(i => i.challanItem.partNumber).join(', '),
            totalQty: plan.items.reduce((sum, i) => sum + i.quantityDispatched, 0) // Note: this is actually planned items usually, but strictly items here are dispatched ones.
            // If DispatchPlan is created BEFORE dispatch, we might need a plannedItems structure. 
            // For now, assuming DispatchPlan is created at active dispatch time or we use the linked items.
        }));
    }
    async getSpendAnalysis(organizationId: string) {
        // Calculate monthly spend for the last 6 months
        const start = new Date();
        start.setMonth(start.getMonth() - 5);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const invoices = await this.prisma.vendorInvoice.findMany({
            where: {
                customer: { organizationId },
                status: 'paid', // Or 'submitted'/'approved' depending on definition of spend
                invoiceDate: {
                    gte: start
                }
            },
            select: {
                invoiceDate: true,
                totalAmount: true
            }
        });

        // Group by month
        const monthlySpend: Record<string, number> = {};

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const d = new Date(start);
            d.setMonth(d.getMonth() + i);
            const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlySpend[key] = monthlySpend[key] || 0;
        }

        invoices.forEach(inv => {
            const key = new Date(inv.invoiceDate).toLocaleString('default', { month: 'short', year: 'numeric' });
            if (monthlySpend[key] !== undefined) {
                monthlySpend[key] += inv.totalAmount;
            }
        });

        return Object.entries(monthlySpend).map(([month, amount]) => ({
            month,
            amount
        }));
    }

    async getVendorPerformanceTrends(organizationId: string) {
        // Mocking trend data for now as we need historical snapshots
        // In a real system, we would have a daily/weekly job capturing snapshots

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(month => ({
            month,
            quality: 85 + Math.random() * 10,
            delivery: 80 + Math.random() * 15,
            cost: 90 + Math.random() * 5
        }));
    }

    async createDispatchDeadline(data: any) {
        return this.prisma.dispatchPlan.create({
            data: {
                customerId: data.customerId,
                vendorId: data.vendorId,
                plannedDate: new Date(data.plannedDate),
                notes: data.notes,
                status: 'planned'
            }
        });
    }

    async getVendorDetails(organizationId: string, vendorId: string) {
        // 1. Basic Profile
        const vendor = await this.prisma.vendor.findFirst({
            where: { id: vendorId, customer: { organizationId } }
        });

        if (!vendor) {
            throw new Error('Vendor not found or access denied');
        }

        // 2. Order Statistics (POs)
        const pos = await this.prisma.purchaseOrder.findMany({
            where: { vendorId, organizationId },
            include: { items: true }
        });

        const totalOrders = pos.length;
        const totalValue = pos.reduce((sum, po) => sum + po.items.reduce((s, i) => s + (i.amount || 0), 0), 0);
        const openOrders = pos.filter(po => ['approved', 'in_progress'].includes(po.status)).length;

        // 3. Quality & Delivery Metrics
        // Reuse logic from getVendorPerformance but filter for this vendor
        const challans = await this.prisma.deliveryChallan.findMany({
            where: { vendorId, customer: { organizationId } },
            include: {
                items: {
                    include: { jobProcesses: true }
                }
            }
        });

        let totalCompleted = 0;
        let totalRejected = 0;
        let onTimeDeliveries = 0; // Placeholder logic

        challans.forEach(challan => {
            challan.items.forEach(item => {
                item.jobProcesses.forEach(proc => {
                    totalCompleted += proc.completedQuantity;
                    totalRejected += proc.rejectedQuantity;
                });
            });
        });

        const totalProduction = totalCompleted + totalRejected;
        const rejectionRate = totalProduction > 0 ? (totalRejected / totalProduction) * 100 : 0;
        const qualityScore = 100 - rejectionRate;

        // 4. Quality Trend (Last 6 Months)
        const qualityTrend = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            // Mock random variation around the current metrics
            qualityTrend.push({
                month: monthName,
                quality: Math.min(100, Math.max(0, qualityScore + (Math.random() * 10 - 5))),
                delivery: Math.min(100, Math.max(0, 85 + (Math.random() * 15 - 5))), // Mock baseline 85
                cost: Math.min(100, Math.max(0, 92 + (Math.random() * 8 - 4)))       // Mock baseline 92
            });
        }

        return {
            profile: {
                id: vendor.id,
                name: vendor.companyName,
                code: vendor.vendorCode,
                email: vendor.email,
                phone: vendor.phone,
                rating: rejectionRate < 1 ? 'A+' : rejectionRate < 3 ? 'A' : rejectionRate < 5 ? 'B' : 'C',
                address: vendor.city ? `${vendor.city}, ${vendor.state}` : 'N/A'
            },
            stats: {
                totalOrders,
                totalValue,
                openOrders,
                totalDeliveredQty: totalCompleted,
                rejectionRate: parseFloat(rejectionRate.toFixed(2)),
                qualityScore: parseFloat(qualityScore.toFixed(2))
            },
            qualityTrend
        };
    }

    async getVendorComparison(organizationId: string) {
        const vendors = await this.prisma.vendor.findMany({
            where: {
                customer: { organizationId },
                isActive: true
            },
            include: {
                purchaseOrders: {
                    where: { status: 'completed' }
                },
                deliveryChallans: {
                    include: {
                        items: {
                            include: {
                                jobProcesses: true
                            }
                        }
                    }
                }
            }
        });

        return vendors.map(vendor => {
            // Quality Calculation
            let totalCompleted = 0;
            let totalRejected = 0;
            vendor.deliveryChallans.forEach(c => c.items.forEach(i => i.jobProcesses.forEach(j => {
                totalCompleted += j.completedQuantity;
                totalRejected += j.rejectedQuantity;
            })));
            const qualityScore = totalCompleted > 0
                ? ((totalCompleted / (totalCompleted + totalRejected)) * 100)
                : 100; // Default to 100 if no production yet

            // Delivery Calculation (Mocked for now as we lack detailed delivery tracking in schema)
            const deliveryScore = 85 + (Math.random() * 15);

            // Cost Calculation (Mocked relative to market rate)
            const costScore = 90 + (Math.random() * 10);

            return {
                id: vendor.id,
                name: vendor.companyName,
                metrics: {
                    quality: parseFloat(qualityScore.toFixed(1)),
                    delivery: parseFloat(deliveryScore.toFixed(1)),
                    cost: parseFloat(costScore.toFixed(1)),
                    overall: parseFloat(((qualityScore + deliveryScore + costScore) / 3).toFixed(1))
                },
                totalSpend: vendor.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)
            };
        }).sort((a, b) => b.metrics.overall - a.metrics.overall);
    }

    async getCostAnalysis(organizationId: string) {
        // Aggregate spend by vendor
        const spendByVendor = await this.prisma.purchaseOrder.groupBy({
            by: ['vendorId'],
            where: {
                organizationId,
                status: { in: ['completed', 'approved', 'in_progress'] }
            },
            _sum: {
                totalAmount: true
            }
        });

        // Get vendor names
        const vendorIds = spendByVendor.map(s => s.vendorId);
        const vendors = await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, companyName: true }
        });

        const vendorMap = new Map(vendors.map(v => [v.id, v.companyName]));

        return spendByVendor.map(item => ({
            name: vendorMap.get(item.vendorId) || 'Unknown Vendor',
            value: item._sum.totalAmount || 0
        })).sort((a, b) => b.value - a.value);
    }

    /**
     * War Room Overview: Per-customer health cards + global KPIs
     * Returns at-risk, on-track, ready-to-dispatch, and WIP counts
     */
    async getPartStatusOverview(organizationId: string) {
        const now = new Date();
        const atRiskThreshold = new Date(now);
        atRiskThreshold.setDate(now.getDate() + 3);

        // Fetch ALL customers for this org (show even those with no active challans)
        const [allCustomers, challanItems] = await Promise.all([
            this.prisma.customer.findMany({
                where: { organizationId, isActive: true },
                select: { id: true, companyName: true, code: true }
            }),
            this.prisma.challanItem.findMany({
                where: {
                    challan: {
                        customer: { organizationId },
                        status: { notIn: ['closed', 'rejected'] }
                    }
                },
                include: {
                    challan: {
                        include: {
                            customer: { select: { id: true, companyName: true, code: true } },
                            vendor: { select: { id: true, companyName: true } }
                        }
                    },
                    jobProcesses: { orderBy: { processSequence: 'asc' } },
                    dispatchItems: true,
                    poItem: { select: { deliverySchedule: true } }
                }
            })
        ]);

        // Pre-populate customerMap with ALL customers (even those with 0 parts)
        const globalKPIs = { atRisk: 0, overdue: 0, onTrack: 0, readyToDispatch: 0, wip: 0, rawMaterial: 0 };
        const customerMap: Record<string, {
            id: string; name: string; code: string;
            total: number; atRisk: number; overdue: number; onTrack: number; readyToDispatch: number;
        }> = {};
        for (const c of allCustomers) {
            customerMap[c.id] = { id: c.id, name: c.companyName, code: c.code, total: 0, atRisk: 0, overdue: 0, onTrack: 0, readyToDispatch: 0 };
        }

        for (const item of challanItems) {
            const { customer } = item.challan;
            const processes = item.jobProcesses;
            const dispatched = item.dispatchItems.reduce((s, d) => s + d.quantityDispatched, 0);
            // Use executiveDeadline first, fall back to PO item delivery schedule
            const deadline = (item as any).executiveDeadline ?? item.poItem?.deliverySchedule ?? null;

            let stage: 'raw' | 'wip' | 'finished' | 'dispatched';
            if (dispatched >= item.quantityIssued) stage = 'dispatched';
            else if (processes.length === 0) stage = 'raw';
            else {
                const allDone = processes.every(p => p.status === 'completed');
                stage = allDone ? 'finished' : 'wip';
            }

            let health: 'overdue' | 'at_risk' | 'on_track' | 'no_deadline' = 'no_deadline';
            if (deadline && stage !== 'dispatched') {
                if (deadline < now) health = 'overdue';
                else if (deadline <= atRiskThreshold) health = 'at_risk';
                else health = 'on_track';
            }

            if (stage === 'finished') globalKPIs.readyToDispatch++;
            else if (stage === 'wip') globalKPIs.wip++;
            else if (stage === 'raw') globalKPIs.rawMaterial++;
            if (health === 'overdue') globalKPIs.overdue++;
            else if (health === 'at_risk') globalKPIs.atRisk++;
            else if (health === 'on_track') globalKPIs.onTrack++;

            const cm = customerMap[customer.id];
            if (cm) {
                cm.total++;
                if (stage === 'finished') cm.readyToDispatch++;
                if (health === 'overdue') cm.overdue++;
                else if (health === 'at_risk') cm.atRisk++;
                else if (health === 'on_track') cm.onTrack++;
            }
        }

        return {
            kpis: globalKPIs,
            customers: Object.values(customerMap)
        };
    }

    /**
     * Part Tracker: Per-part data with full process pipeline
     * Supports filtering by customerId, vendorId, partNumber, status
     */
    async getPartTracker(organizationId: string, filters: {
        customerId?: string;
        vendorId?: string;
        partNumber?: string;
        status?: 'raw' | 'wip' | 'finished' | 'dispatched' | 'overdue' | 'at_risk';
    } = {}) {
        const now = new Date();
        const atRiskThreshold = new Date(now);
        atRiskThreshold.setDate(now.getDate() + 3);

        const where: any = {
            challan: {
                customer: { organizationId },
                status: { notIn: ['closed', 'rejected'] }
            }
        };

        if (filters.customerId) {
            where.challan.customerId = filters.customerId;
        }
        if (filters.vendorId) {
            where.challan.vendorId = filters.vendorId;
        }
        if (filters.partNumber) {
            where.partNumber = { contains: filters.partNumber, mode: 'insensitive' };
        }

        const challanItems = await this.prisma.challanItem.findMany({
            where,
            include: {
                challan: {
                    include: {
                        customer: { select: { id: true, companyName: true } },
                        vendor: { select: { id: true, companyName: true, vendorCode: true } }
                    }
                },
                jobProcesses: { orderBy: { processSequence: 'asc' } },
                dispatchItems: true,
                poItem: { select: { deliverySchedule: true, operations: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const results = challanItems.map(item => {
            const processes = item.jobProcesses;
            const dispatched = item.dispatchItems.reduce((s, d) => s + d.quantityDispatched, 0);
            // executiveDeadline takes priority over PO item delivery schedule
            const executiveDeadline = (item as any).executiveDeadline ?? null;
            const deadline = executiveDeadline ?? item.poItem?.deliverySchedule ?? null;
            const deadlineSource: 'executive' | 'po' | null = executiveDeadline ? 'executive' : item.poItem?.deliverySchedule ? 'po' : null;

            let stage: string;
            if (dispatched >= item.quantityIssued) stage = 'dispatched';
            else if (processes.length === 0) stage = 'raw';
            else {
                const allDone = processes.every(p => p.status === 'completed');
                stage = allDone ? 'finished' : 'wip';
            }

            let scheduleHealth = 'no_deadline';
            let daysRemaining: number | null = null;
            if (deadline && stage !== 'dispatched') {
                daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (deadline < now) scheduleHealth = 'overdue';
                else if (deadline <= atRiskThreshold) scheduleHealth = 'at_risk';
                else scheduleHealth = 'on_track';
            }

            // Build pipeline for display
            const pipeline = processes.map(p => ({
                id: p.id,
                sequence: p.processSequence,
                name: p.processName,
                status: p.status,
                target: p.targetQuantity,
                completed: p.completedQuantity,
                rejected: p.rejectedQuantity,
                rework: p.reworkQuantity,
                startedAt: p.startedAt,
                completedAt: p.completedAt
            }));

            return {
                id: item.id,
                partNumber: item.partNumber,
                partDescription: item.partDescription,
                challanNumber: item.challan.challanNumber,
                customer: item.challan.customer,
                vendor: item.challan.vendor,
                quantityIssued: item.quantityIssued,
                quantityDispatched: dispatched,
                stage,
                scheduleHealth,
                deadline,
                deadlineSource,
                deadlineNote: (item as any).deadlineNote ?? null,
                daysRemaining,
                pipeline
            };
        });

        const statusFilter = filters.status;
        const filtered = statusFilter
            ? results.filter(r => r.stage === statusFilter || r.scheduleHealth === statusFilter)
            : results;

        return {
            data: filtered,
            summary: {
                total: filtered.length,
                byStage: {
                    raw: filtered.filter(r => r.stage === 'raw').length,
                    wip: filtered.filter(r => r.stage === 'wip').length,
                    finished: filtered.filter(r => r.stage === 'finished').length,
                    dispatched: filtered.filter(r => r.stage === 'dispatched').length
                }
            }
        };
    }

    /**
     * Get all parts for a specific OEM customer (drill-down)
     */
    async getCustomerParts(organizationId: string, customerId: string) {
        return this.getPartTracker(organizationId, { customerId });
    }

    /**
     * Director Morning Briefing — everything in one call
     */
    async getMorningBriefing(organizationId: string) {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        const [
            pendingApprovalPOs,
            approvedPOs,
            allDraftPOs,
            issuedChallans,
            customers,
            activeVendors,
            completedToday,
        ] = await Promise.allSettled([
            this.prisma.purchaseOrder.findMany({
                where: { organizationId, status: 'pending_approval' },
                include: { vendor: { select: { companyName: true, vendorCode: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            this.prisma.purchaseOrder.aggregate({
                where: { organizationId, status: 'approved' },
                _sum: { totalAmount: true },
                _count: true,
            }),
            this.prisma.purchaseOrder.count({ where: { organizationId, status: 'draft' } }),
            this.prisma.deliveryChallan.findMany({
                where: { customer: { organizationId }, status: 'issued' },
                include: {
                    vendor: { select: { companyName: true, vendorCode: true } },
                    _count: { select: { items: true } },
                },
                orderBy: { challanDate: 'asc' },
                take: 20,
            }),
            this.prisma.customer.findMany({
                where: { organizationId },
                select: { id: true, companyName: true, code: true },
            }),
            this.prisma.vendor.count({ where: { customer: { organizationId }, isActive: true, status: 'approved' } }),
            this.prisma.jobProcess.count({
                where: {
                    status: 'completed',
                    completedAt: { gte: todayStart, lte: todayEnd },
                    challanItem: { challan: { customer: { organizationId } } },
                },
            }),
        ]);

        const pending = pendingApprovalPOs.status === 'fulfilled' ? pendingApprovalPOs.value : [];
        const approved = approvedPOs.status === 'fulfilled' ? approvedPOs.value : { _sum: { totalAmount: null }, _count: 0 };
        const drafts = allDraftPOs.status === 'fulfilled' ? allDraftPOs.value : 0;
        const inTransit = issuedChallans.status === 'fulfilled' ? issuedChallans.value : [];
        const customerList = customers.status === 'fulfilled' ? customers.value : [];
        const vendorCount = activeVendors.status === 'fulfilled' ? activeVendors.value : 0;
        const doneToday = completedToday.status === 'fulfilled' ? completedToday.value : 0;

        const aged = inTransit.map((c: any) => ({
            ...c,
            daysOut: Math.floor((now.getTime() - new Date(c.challanDate).getTime()) / 86400000),
        }));

        return {
            generatedAt: now.toISOString(),
            kpis: {
                pendingApprovals: pending.length,
                approvedPOValue: approved._sum?.totalAmount ?? 0,
                approvedPOCount: approved._count ?? 0,
                draftPOs: drafts,
                materialAtVendor: inTransit.length,
                overdueChallans: aged.filter((c: any) => c.daysOut > 7).length,
                activeVendors: vendorCount,
                jobsCompletedToday: doneToday,
            },
            pendingApprovalPOs: pending,
            materialInTransit: aged,
            customers: customerList,
        };
    }

    /**
     * Executive sets a custom deadline on a ChallanItem (overrides PO delivery schedule)
     */
    async setPartDeadline(challanItemId: string, organizationId: string, data: { deadline: string; note?: string }) {
        // Verify the challan item belongs to this org
        const item = await this.prisma.challanItem.findFirst({
            where: {
                id: challanItemId,
                challan: { customer: { organizationId } }
            }
        });
        if (!item) throw new Error('Part not found or access denied');

        return this.prisma.challanItem.update({
            where: { id: challanItemId },
            data: {
                executiveDeadline: new Date(data.deadline),
                deadlineNote: data.note ?? null
            },
            select: {
                id: true,
                partNumber: true,
                executiveDeadline: true,
                deadlineNote: true
            }
        });
    }

    /**
     * Executive War Room — all live KPIs in one call
     */
    async getWarRoom(organizationId: string) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [openChallans, overdueChallans, pendingPOs, recentDispatches, topOverdueVendors] = await Promise.all([
            this.prisma.deliveryChallan.count({
                where: { customer: { organizationId }, status: { in: ['issued', 'received'] as any } }
            }),
            this.prisma.deliveryChallan.count({
                where: {
                    customer: { organizationId },
                    status: { in: ['issued', 'received'] as any },
                    challanDate: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
                }
            }),
            this.prisma.purchaseOrder.count({
                where: { organizationId, status: 'pending_approval' as any }
            }),
            this.prisma.deliveryChallan.groupBy({
                by: ['challanDate'],
                where: {
                    customer: { organizationId },
                    challanDate: { gte: sevenDaysAgo }
                },
                _count: true,
                _sum: { totalQuantity: true }
            }),
            this.prisma.deliveryChallan.groupBy({
                by: ['vendorId'],
                where: {
                    customer: { organizationId },
                    status: 'issued' as any,
                    challanDate: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
                },
                _count: true,
                orderBy: { _count: { vendorId: 'desc' } },
                take: 5
            })
        ]);

        // Build dispatch volume trend (last 7 days)
        const dispatchVolume = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
            const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const row = recentDispatches.find(r => new Date(r.challanDate).toDateString() === d.toDateString());
            return { date: label, challans: row?._count ?? 0, qty: row?._sum?.totalQuantity ?? 0 };
        });

        // Resolve vendor names for top overdue vendors
        const vendorIds = topOverdueVendors.map(v => v.vendorId);
        const vendors = await this.prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, companyName: true, vendorCode: true }
        });
        const vendorMap = new Map(vendors.map(v => [v.id, v]));
        const overdueVendors = topOverdueVendors.map(v => ({
            ...vendorMap.get(v.vendorId),
            overdueChallans: v._count
        }));

        return {
            generatedAt: now.toISOString(),
            kpis: { openChallans, overdueChallans, pendingPOs },
            dispatchVolume,
            topOverdueVendors: overdueVendors
        };
    }
}
