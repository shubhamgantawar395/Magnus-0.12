import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GatePassStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class GatePassesService {
    constructor(private prisma: PrismaService) { }

    // ── Auto-generate pass number: GP/2026/03/001 ─────────────────────────────
    private async generatePassNumber(): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startOfMonth = new Date(year, now.getMonth(), 1);
        const count = await this.prisma.gatePass.count({
            where: { createdAt: { gte: startOfMonth } },
        });
        const seq = String(count + 1).padStart(3, '0');
        return `GP/${year}/${month}/${seq}`;
    }

    async create(dto: any, issuedById: string, organizationId: string) {
        const passNumber = await this.generatePassNumber();
        return this.prisma.gatePass.create({
            data: {
                ...dto,
                passNumber,
                organizationId,
                issuedById,
                status: GatePassStatus.active,
            },
            include: { issuedBy: { select: { firstName: true, lastName: true } } },
        });
    }

    async findAll(
        organizationId: string,
        filters: { status?: string; search?: string; date?: string } = {},
    ) {
        const where: any = { organizationId };
        if (filters.status && filters.status !== 'all') {
            where.status = filters.status as GatePassStatus;
        }
        if (filters.search) {
            where.OR = [
                { visitorName: { contains: filters.search, mode: 'insensitive' } },
                { visitorCompany: { contains: filters.search, mode: 'insensitive' } },
                { passNumber: { contains: filters.search, mode: 'insensitive' } },
                { vehicleNumber: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        if (filters.date) {
            const d = new Date(filters.date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            where.entryTime = { gte: start, lte: end };
        }
        return this.prisma.gatePass.findMany({
            where,
            include: { issuedBy: { select: { firstName: true, lastName: true } } },
            orderBy: { entryTime: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const pass = await this.prisma.gatePass.findFirst({
            where: { id, organizationId },
            include: { issuedBy: { select: { firstName: true, lastName: true } } },
        });
        if (!pass) throw new NotFoundException('Gate pass not found');
        return pass;
    }

    // ── Security guard marks exit ─────────────────────────────────────────────
    async markExit(id: string, organizationId: string, remarks?: string) {
        await this.findOne(id, organizationId);
        return this.prisma.gatePass.update({
            where: { id },
            data: {
                exitTime: new Date(),
                status: GatePassStatus.closed,
                ...(remarks ? { remarks } : {}),
            },
        });
    }

    async update(id: string, dto: any, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.gatePass.update({ where: { id }, data: dto });
    }

    // ── Dashboard stats ───────────────────────────────────────────────────────
    async getStats(organizationId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [active, todayTotal, todayClosed] = await Promise.all([
            this.prisma.gatePass.count({ where: { organizationId, status: GatePassStatus.active } }),
            this.prisma.gatePass.count({ where: { organizationId, entryTime: { gte: today } } }),
            this.prisma.gatePass.count({
                where: { organizationId, status: GatePassStatus.closed, entryTime: { gte: today } },
            }),
        ]);
        return { active, todayTotal, todayExited: todayClosed };
    }

    // ── Visitor's Register ────────────────────────────────────────────────────
    private dateRange(startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : new Date(start);
        end.setHours(23, 59, 59, 999);
        return { gte: start, lte: end };
    }

    async getVisitorRegister(organizationId: string, startDate?: string, endDate?: string) {
        return this.prisma.gatePass.findMany({
            where: { organizationId, entryTime: this.dateRange(startDate, endDate) },
            include: { issuedBy: { select: { firstName: true, lastName: true } } },
            orderBy: { entryTime: 'asc' },
        });
    }

    async exportVisitorRegisterExcel(organizationId: string, startDate?: string, endDate?: string): Promise<Buffer> {
        const passes = await this.getVisitorRegister(organizationId, startDate, endDate);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Aaniry VMS';
        const ws = wb.addWorksheet("Visitor's Register");

        // Title row
        ws.mergeCells('A1:N1');
        const titleCell = ws.getCell('A1');
        titleCell.value = "VISITOR'S REGISTER";
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center' };

        const rangeLabel = `${startDate || 'Today'} to ${endDate || startDate || 'Today'}`;
        ws.mergeCells('A2:N2');
        ws.getCell('A2').value = `Date: ${rangeLabel}`;
        ws.getCell('A2').alignment = { horizontal: 'center' };
        ws.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };

        ws.addRow([]);

        // Header
        const headers = [
            'S.No', 'Pass #', 'Visitor Name', 'Company / Org', 'Phone',
            'ID Proof', 'ID Number', 'Purpose', 'Person to Meet',
            'Vehicle #', 'Entry Time', 'Exit Time', 'Duration (min)', 'Status', 'Issued By', 'Remarks'
        ];
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            };
        });

        // Data rows
        passes.forEach((p, idx) => {
            const entryTime = new Date(p.entryTime);
            const exitTime = p.exitTime ? new Date(p.exitTime) : null;
            const durationMin = exitTime
                ? Math.round((exitTime.getTime() - entryTime.getTime()) / 60000)
                : null;

            const row = ws.addRow([
                idx + 1,
                p.passNumber,
                p.visitorName,
                p.visitorCompany || '',
                p.visitorPhone || '',
                p.idProofType || '',
                p.idProofNumber || '',
                p.purpose,
                p.personToMeet || '',
                p.vehicleNumber || '',
                entryTime.toLocaleString('en-IN'),
                exitTime ? exitTime.toLocaleString('en-IN') : 'Still Inside',
                durationMin !== null ? durationMin : '',
                p.status.toUpperCase(),
                `${p.issuedBy.firstName} ${p.issuedBy.lastName}`,
                p.remarks || '',
            ]);
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                };
                if (idx % 2 === 1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            });
            // Color status cell
            const statusCell = row.getCell(14);
            statusCell.font = { bold: true, color: { argb: p.status === 'active' ? 'FF059669' : 'FF64748B' } };
        });

        // Column widths
        ws.columns = [
            { width: 6 }, { width: 16 }, { width: 22 }, { width: 22 }, { width: 14 },
            { width: 16 }, { width: 16 }, { width: 18 }, { width: 20 },
            { width: 14 }, { width: 20 }, { width: 20 }, { width: 14 }, { width: 12 }, { width: 18 }, { width: 24 }
        ];

        ws.getRow(4).height = 22;

        const buffer = await wb.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    // ── Material In / Out Register ─────────────────────────────────────────────
    async getMaterialRegister(organizationId: string, startDate?: string, endDate?: string) {
        const range = this.dateRange(startDate, endDate);

        const [incoming, outgoing] = await Promise.all([
            // Material IN: vendor invoices gate-approved in range
            this.prisma.vendorInvoice.findMany({
                where: {
                    customer: { organizationId },
                    status: { in: ['gate_approved', 'approved', 'paid'] as any },
                    gateApprovedAt: range,
                },
                include: {
                    vendor: { select: { companyName: true, vendorCode: true } },
                    items: {
                        select: {
                            partNumber: true, partDescription: true,
                            invoiceQuantity: true, gateReceivedQty: true, unitPrice: true,
                        }
                    },
                    gateApprovedBy: { select: { firstName: true, lastName: true } },
                },
                orderBy: { gateApprovedAt: 'asc' },
            }),
            // Material OUT: challans issued to customers in range
            this.prisma.deliveryChallan.findMany({
                where: {
                    organizationId,
                    challanDate: range,
                    status: { notIn: ['draft', 'cancelled'] as any },
                },
                include: {
                    vendor: { select: { companyName: true, vendorCode: true } },
                    customer: { select: { companyName: true } },
                    items: {
                        select: { partNumber: true, partDescription: true, quantityIssued: true }
                    },
                    createdBy: { select: { firstName: true, lastName: true } },
                },
                orderBy: { challanDate: 'asc' },
            }),
        ]);

        return { incoming, outgoing };
    }

    async exportMaterialRegisterExcel(organizationId: string, startDate?: string, endDate?: string): Promise<Buffer> {
        const { incoming, outgoing } = await this.getMaterialRegister(organizationId, startDate, endDate);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Aaniry VMS';

        const rangeLabel = `${startDate || 'Today'}${endDate && endDate !== startDate ? ' to ' + endDate : ''}`;

        // ── Sheet 1: Material IN ──────────────────────────────────────────────
        const wsIn = wb.addWorksheet('Material IN (Tax Invoices)');
        wsIn.mergeCells('A1:J1');
        wsIn.getCell('A1').value = 'MATERIAL INWARD REGISTER';
        wsIn.getCell('A1').font = { bold: true, size: 14 };
        wsIn.getCell('A1').alignment = { horizontal: 'center' };
        wsIn.mergeCells('A2:J2');
        wsIn.getCell('A2').value = `Date: ${rangeLabel}`;
        wsIn.getCell('A2').alignment = { horizontal: 'center' };
        wsIn.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
        wsIn.addRow([]);

        const inHeaders = ['S.No', 'Date', 'Invoice #', 'Vendor', 'Part Number', 'Description', 'Invoice Qty', 'Gate Rcvd Qty', 'Unit Price (₹)', 'Gate Approved By'];
        const inHeaderRow = wsIn.addRow(inHeaders);
        inHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        let inSno = 1;
        incoming.forEach(inv => {
            inv.items.forEach((item, itemIdx) => {
                const row = wsIn.addRow([
                    inSno++,
                    inv.gateApprovedAt ? new Date(inv.gateApprovedAt).toLocaleDateString('en-IN') : '',
                    inv.invoiceNumber,
                    inv.vendor.companyName,
                    item.partNumber,
                    item.partDescription || '',
                    item.invoiceQuantity,
                    item.gateReceivedQty ?? item.invoiceQuantity,
                    item.unitPrice,
                    inv.gateApprovedBy ? `${inv.gateApprovedBy.firstName} ${inv.gateApprovedBy.lastName}` : '',
                ]);
                row.eachCell(cell => {
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                    if (inSno % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
                });
            });
        });

        wsIn.columns = [{ width: 6 }, { width: 14 }, { width: 18 }, { width: 24 }, { width: 18 }, { width: 28 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 20 }];

        // ── Sheet 2: Material OUT ─────────────────────────────────────────────
        const wsOut = wb.addWorksheet('Material OUT (Challans)');
        wsOut.mergeCells('A1:J1');
        wsOut.getCell('A1').value = 'MATERIAL OUTWARD REGISTER';
        wsOut.getCell('A1').font = { bold: true, size: 14 };
        wsOut.getCell('A1').alignment = { horizontal: 'center' };
        wsOut.mergeCells('A2:J2');
        wsOut.getCell('A2').value = `Date: ${rangeLabel}`;
        wsOut.getCell('A2').alignment = { horizontal: 'center' };
        wsOut.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
        wsOut.addRow([]);

        const outHeaders = ['S.No', 'Date', 'Challan #', 'Vendor (Job Work)', 'Customer', 'Part Number', 'Description', 'Qty Issued', 'Vehicle #', 'Issued By'];
        const outHeaderRow = wsOut.addRow(outHeaders);
        outHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        let outSno = 1;
        outgoing.forEach(challan => {
            challan.items.forEach(item => {
                const row = wsOut.addRow([
                    outSno++,
                    new Date(challan.challanDate).toLocaleDateString('en-IN'),
                    challan.challanNumber,
                    challan.vendor.companyName,
                    challan.customer.companyName,
                    item.partNumber,
                    item.partDescription || '',
                    item.quantityIssued,
                    challan.vehicleNumber || '',
                    `${challan.createdBy.firstName} ${challan.createdBy.lastName}`,
                ]);
                row.eachCell(cell => {
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                    if (outSno % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
                });
            });
        });

        wsOut.columns = [{ width: 6 }, { width: 14 }, { width: 18 }, { width: 24 }, { width: 22 }, { width: 18 }, { width: 28 }, { width: 12 }, { width: 14 }, { width: 20 }];

        // ── Sheet 3: Combined Summary ─────────────────────────────────────────
        const wsSummary = wb.addWorksheet('Summary');
        wsSummary.mergeCells('A1:D1');
        wsSummary.getCell('A1').value = `MATERIAL IN / OUT SUMMARY — ${rangeLabel}`;
        wsSummary.getCell('A1').font = { bold: true, size: 13 };
        wsSummary.getCell('A1').alignment = { horizontal: 'center' };
        wsSummary.addRow([]);

        const summaryHeaders = ['Type', 'Count (Docs)', 'Total Items', 'Total Qty'];
        const summaryHeaderRow = wsSummary.addRow(summaryHeaders);
        summaryHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        const totalInItems = incoming.reduce((s, i) => s + i.items.length, 0);
        const totalInQty = incoming.reduce((s, i) => s + i.items.reduce((ss, it) => ss + (it.gateReceivedQty ?? it.invoiceQuantity), 0), 0);
        const totalOutItems = outgoing.reduce((s, c) => s + c.items.length, 0);
        const totalOutQty = outgoing.reduce((s, c) => s + c.items.reduce((ss, it) => ss + it.quantityIssued, 0), 0);

        wsSummary.addRow(['Material IN (Tax Invoices)', incoming.length, totalInItems, totalInQty]);
        wsSummary.addRow(['Material OUT (Challans)', outgoing.length, totalOutItems, totalOutQty]);
        wsSummary.columns = [{ width: 30 }, { width: 16 }, { width: 14 }, { width: 14 }];

        const buffer = await wb.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
