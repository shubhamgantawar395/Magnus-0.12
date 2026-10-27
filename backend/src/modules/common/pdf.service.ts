import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');
import { DeliveryChallan, VendorInvoice, Organization, User } from '@prisma/client';

@Injectable()
export class PdfService {

    async generateChallanPdf(challan: any): Promise<Buffer> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const buffers: Buffer[] = [];
            doc.on('data', (b: Buffer) => buffers.push(b));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // ── Page geometry ────────────────────────────────────────────
            const L   = 20;          // left edge
            const R   = 575.28;      // right edge
            const W   = R - L;       // usable width ≈ 555
            const MID = L + W / 2;   // centre x ≈ 297.6
            const B   = 'Helvetica-Bold';
            const N   = 'Helvetica';

            // Helpers
            const hl = (y: number, x1 = L, x2 = R) =>
                doc.moveTo(x1, y).lineTo(x2, y).lineWidth(0.5).strokeColor('#000').stroke();
            const vl = (x: number, y1: number, y2: number) =>
                doc.moveTo(x, y1).lineTo(x, y2).lineWidth(0.5).strokeColor('#000').stroke();
            const t  = (s: string, x: number, y: number, opts: any = {}) =>
                doc.fillColor('#000').text(s, x, y, opts);

            // ── Resolve issuer (plant snapshot preferred) ─────────────────
            const isr = challan.issuerDetails
                ? (typeof challan.issuerDetails === 'string'
                    ? JSON.parse(challan.issuerDetails)
                    : challan.issuerDetails)
                : null;
            const org        = challan.organization || {};
            const isrName    = isr?.name    || org.name    || '';
            const isrGstin   = isr?.gstin   || org.gstin   || '';
            const isrAddr    = isr?.address || org.address || '';
            const isrCity    = isr?.city    || org.city    || '';
            const isrState   = isr?.state   || org.state   || '';
            const isrPincode = isr?.pincode || org.pincode || '';

            // ── Resolve vendor ─────────────────────────────────────────────
            const vendor = challan.vendor || {};

            // ── Dates ──────────────────────────────────────────────────────
            const d = new Date(challan.challanDate || Date.now());
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const dateStr = `${String(d.getDate()).padStart(2,'0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
            const now = new Date();
            const hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();
            const timeStr = `${String(hh % 12 || 12).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}${hh < 12 ? 'AM' : 'PM'}`;

            // ── Totals ─────────────────────────────────────────────────────
            const items: any[] = challan.items || [];
            const totQty = items.reduce((s: number, i: any) => s + (Number(i.quantityIssued) || 0), 0);
            const totAmt = items.reduce((s: number, i: any) => s + (Number(i.totalAmount)    || 0), 0);

            let y = 20;

            // ════════════════════════════════════════════════════════════════
            // 1. HEADER — issuer details + copy-type checkboxes
            // ════════════════════════════════════════════════════════════════
            doc.font(B).fontSize(14);
            t('DELIVERY CHALLAN', L, y + 6, { width: W, align: 'center' });
            y += 26;
            hl(y); y += 5;

            const hdrAddrY = y;
            doc.font(B).fontSize(9); t(isrName, L + 5, y); y += 13;
            doc.font(N).fontSize(8); t(`GSTIN No. :  ${isrGstin}`, L + 5, y); y += 11;
            if (isrAddr)    { t(isrAddr,    L + 5, y); y += 11; }
            if (isrPincode) { t(isrPincode, L + 5, y); y += 11; }
            if (isrCity)    { t(isrCity,    L + 5, y); y += 11; }
            if (isrState)   { t(isrState,   L + 5, y); y += 11; }
            t('India', L + 5, y); y += 11;

            // Copy-type checkboxes (right side of header)
            const copyTypes = ['Original', 'Duplicate', 'Triplicate', 'Quadruplicate'];
            const cbX = R - 92;
            const selectedCopy = challan.copyType || 'Original';
            copyTypes.forEach((ct, i) => {
                const cy = hdrAddrY + i * 14;
                doc.rect(cbX, cy + 1, 8, 8).lineWidth(0.5).strokeColor('#000').stroke();
                if (ct === selectedCopy) {
                    doc.rect(cbX + 1.5, cy + 2.5, 5, 5).fill('#000');
                }
                doc.fillColor('#000').font(N).fontSize(8).text(ct, cbX + 12, cy + 1.5);
            });

            y = Math.max(y, hdrAddrY + copyTypes.length * 14 + 6) + 2;
            hl(y); y += 5;

            // ════════════════════════════════════════════════════════════════
            // 2. PART I / ANNEXURE II labels
            // ════════════════════════════════════════════════════════════════
            doc.font(B).fontSize(10); t('PART I',       L, y, { width: W, align: 'center' }); y += 14;
            doc.font(B).fontSize(10); t('ANNEXURE II',  L, y, { width: W, align: 'center' }); y += 13;
            doc.font(N).fontSize(8);  t('Challan  57AC [5(A)] cum Delivery Order', L, y, { width: W, align: 'center' }); y += 12;
            hl(y); y += 4;

            // ════════════════════════════════════════════════════════════════
            // 3. INFO SECTION (two-column: vendor left / challan meta right)
            // ════════════════════════════════════════════════════════════════
            const infoBoxTop = y;
            doc.font(B).fontSize(8); t('Factory/Place of Processing/Manufacturing', L + 5, y + 2); y += 14;
            hl(y);

            const infoColY = y + 4;
            const ROW = 11;

            // left-column field helper
            const lf = (label: string, value: string, iy: number) => {
                doc.font(B).fontSize(7.5).fillColor('#000').text(label, L + 5, iy, { width: 92 });
                doc.font(N).fontSize(7.5).fillColor('#000').text(value, L + 99, iy, { width: MID - L - 102 });
            };
            // right-column field helper
            const rf = (label: string, value: string, iy: number, boldVal = false) => {
                doc.font(B).fontSize(7.5).fillColor('#000').text(label, MID + 5, iy, { width: 108 });
                doc.font(boldVal ? B : N).fontSize(7.5).fillColor('#000').text(value, MID + 115, iy, { width: R - MID - 118 });
            };

            let lY = infoColY;
            let rY = infoColY;

            // Left column
            lf('Vendor Code :', `  ${vendor.vendorCode || ''}`, lY); lY += ROW;
            lY += 3;
            doc.font(B).fontSize(9).fillColor('#000').text(vendor.companyName || '', L + 5, lY, { width: MID - L - 10 }); lY += ROW + 2;
            lf('Address :', `  ${vendor.address || ''}`, lY); lY += ROW;
            lf('GSTIN No. :', `  ${vendor.gstin || ''}`, lY); lY += ROW;
            lf('Eway Bill No', `  :  ${challan.ewayBillNumber || ''}`, lY); lY += ROW;
            lf('Eway Bill Date', `  :  ${challan.ewayBillDate ? new Date(challan.ewayBillDate).toLocaleDateString('en-GB') : ''}`, lY); lY += ROW;
            lf('Eway Bill Exp Date', '  :  ', lY); lY += ROW;
            lf('Purchase Order No', `  :  ${challan.poNumber || ''}`, lY); lY += ROW;

            // Right column
            rf('Delivery Challan No', `:  ${challan.challanNumber || ''}`, rY, true); rY += ROW;
            rf('Date of Issue', `:  ${dateStr}`, rY); rY += ROW;
            rf('Time of Issue', `:  ${timeStr}`, rY); rY += ROW;
            rf('Tariff Head', ':  ', rY); rY += ROW;
            rf('Vehicle No.', `:  ${challan.vehicleNumber || ''}`, rY); rY += ROW;
            rf('Transporter', `:  ${challan.transporterName || ''}`, rY); rY += ROW;
            rf('Transporter Cost', ':  0.00', rY); rY += ROW;
            rf('Gate Entry', ':  0', rY); rY += ROW;
            rf('Escort Cost', ':  0.00', rY); rY += ROW;

            const infoEndY = Math.max(lY, rY) + 4;
            vl(MID, infoBoxTop, infoEndY);
            hl(infoEndY);
            y = infoEndY;

            // ════════════════════════════════════════════════════════════════
            // 4. ITEMS TABLE
            // ════════════════════════════════════════════════════════════════
            //  Col:   Sr.No | Description         | Qty  | UOM  | Item Cost | Amount | Remarks
            //  Width:  32   |   192                |  56  |  44  |   68      |  76    |  87
            const C = {
                sr:   { x: L,       w: 32  },
                desc: { x: L + 32,  w: 192 },
                qty:  { x: L + 224, w: 56  },
                uom:  { x: L + 280, w: 44  },
                cost: { x: L + 324, w: 68  },
                amt:  { x: L + 392, w: 76  },
                rmk:  { x: L + 468, w: Math.round(R) - (L + 468) }, // ~87
            };

            const colDividers = [C.desc.x, C.qty.x, C.uom.x, C.cost.x, C.amt.x, C.rmk.x, R];
            const drawRowBorders = (rowY: number, rowH: number) => {
                vl(L, rowY, rowY + rowH);
                colDividers.forEach(cx => vl(cx, rowY, rowY + rowH));
                hl(rowY + rowH);
            };

            const tblY = y;
            const HDR_H = 25;

            // Table header row (light grey background)
            doc.rect(L, tblY, W, HDR_H).fillAndStroke('#e8e8e8', '#000');
            doc.lineWidth(0.5);
            doc.font(B).fontSize(7).fillColor('#000');
            const h1 = tblY + 3, h2 = tblY + 13;
            doc.text('Sr. No.',                                      C.sr.x   + 2, h1 + 4, { width: C.sr.w   - 4, align: 'center' });
            doc.text('Input Part No & Description of Goods',         C.desc.x + 2, h1,     { width: C.desc.w - 4 });
            doc.text('Enduse Part No & description of Goods',        C.desc.x + 2, h2,     { width: C.desc.w - 4 });
            doc.text('Quantity',  C.qty.x  + 2, h1 + 4, { width: C.qty.w  - 4, align: 'center' });
            doc.text('UOM',       C.uom.x  + 2, h1 + 4, { width: C.uom.w  - 4, align: 'center' });
            doc.text('Item Cost', C.cost.x + 2, h1 + 4, { width: C.cost.w - 4, align: 'center' });
            doc.text('Amount',    C.amt.x  + 2, h1 + 4, { width: C.amt.w  - 4, align: 'center' });
            doc.text('Remarks',   C.rmk.x  + 2, h1 + 4, { width: C.rmk.w  - 4, align: 'center' });
            colDividers.forEach(cx => vl(cx, tblY, tblY + HDR_H));
            vl(L, tblY, tblY + HDR_H);
            hl(tblY); hl(tblY + HDR_H);
            y = tblY + HDR_H;

            // Item rows
            const IR = 20;
            items.forEach((item: any, idx: number) => {
                const ry = y;
                doc.font(N).fontSize(7.5).fillColor('#000');
                doc.text(`${idx + 1}`,                              C.sr.x   + 2, ry + 5, { width: C.sr.w   - 4, align: 'center' });
                doc.font(B).text(item.partNumber      || '',        C.desc.x + 3, ry + 4, { width: C.desc.w - 5 });
                doc.font(N).text(item.partDescription || '',        C.desc.x + 3, ry + 12, { width: C.desc.w - 5 });
                doc.text((Number(item.quantityIssued) || 0).toFixed(2), C.qty.x  + 2, ry + 5, { width: C.qty.w  - 4, align: 'right' });
                doc.text(item.unitOfMeasure || 'Nos',               C.uom.x  + 2, ry + 5, { width: C.uom.w  - 4, align: 'center' });
                doc.text((Number(item.unitPrice)      || 0).toFixed(2), C.cost.x + 2, ry + 5, { width: C.cost.w - 4, align: 'right' });
                doc.text((Number(item.totalAmount)    || 0).toFixed(2), C.amt.x  + 2, ry + 5, { width: C.amt.w  - 4, align: 'right' });
                doc.text(item.remarks || '',                        C.rmk.x  + 2, ry + 5, { width: C.rmk.w  - 4 });
                drawRowBorders(ry, IR);
                y += IR;
            });

            // Fill empty rows so the table body looks full (minimum 18 rows total)
            const minItems = Math.max(items.length, 18);
            while (y < tblY + HDR_H + minItems * IR) {
                drawRowBorders(y, IR);
                y += IR;
            }

            // Total row
            const TR = 14;
            drawRowBorders(y, TR);
            doc.font(B).fontSize(8).fillColor('#000');
            doc.text('Total', C.sr.x + 2, y + 3, { width: C.qty.x - C.sr.x - 4, align: 'right' });
            doc.text(totQty.toFixed(2), C.qty.x  + 2, y + 3, { width: C.qty.w  - 4, align: 'right' });
            doc.text(totAmt.toFixed(2), C.amt.x  + 2, y + 3, { width: C.amt.w  - 4, align: 'right' });
            y += TR;

            // ════════════════════════════════════════════════════════════════
            // 5. FOOTER — estimated value / expected duration / authorised sig
            // ════════════════════════════════════════════════════════════════
            vl(L, y, y + 32); vl(R, y, y + 32);
            y += 5;
            doc.font(B).fontSize(7.5).fillColor('#000')
                .text('Estimated value of Inputs / Partially processed inputs', L + 5, y);
            doc.font(N).text(':  0.00', L + 247, y);
            doc.font(B).text(`For ${isrName}`, MID + 10, y, { width: W / 2 - 15 });
            y += 12;
            doc.font(B).text('Expected duration of Processing/Manufacturing', L + 5, y);
            doc.font(N).text(':  180 Days', L + 224, y);
            y += 10;
            hl(y); y += 5;

            doc.font(B).fontSize(8).text('Place',     L + 5, y);
            doc.font(N).text(`:  ${isrName}`, L + 36, y);
            doc.font(B).text('Authorised Signatory', R - 130, y);
            y += 16;

            // ════════════════════════════════════════════════════════════════
            // 6. PART II section
            // ════════════════════════════════════════════════════════════════
            hl(y);
            const p2TopY = y;
            y += 4;
            doc.font(B).fontSize(9).text('PART II', L, y, { width: W, align: 'center' });
            y += 14;
            hl(y); y += 5;

            vl(L, p2TopY, p2TopY + 60); vl(R, p2TopY, p2TopY + 60);

            doc.font(B).fontSize(7.5).text('Place', L + 5, y);
            doc.font(N).text(':  ', L + 34, y);
            doc.font(B).text('Date', MID - 40, y);
            doc.font(N).text(':  ', MID - 10, y);
            doc.font(B).text('Signature of Processor', R - 127, y);
            y += 18;
            hl(y); y += 5;

            // Name and Address of the factory
            doc.font(B).fontSize(7.5).text('Name and Address of the factory', L + 5, y);
            doc.font(N).text(':  ', L + 172, y);
            doc.text(isrAddr, L + 183, y, { width: MID - L - 186 });
            // Right side: taluka/village/pincode details
            const factoryRight = [isrPincode, isrCity, isrState, 'India'].filter(Boolean);
            doc.text(`-  ${factoryRight.join('  ,  ')}`, MID + 5, y, { width: W / 2 - 8 });
            y += 20;
            hl(y); y += 4;

            // Prepared By | Page 1 of 1
            doc.font(N).fontSize(7).text('Prepared By', L + 5, y + 2);
            doc.text('Page 1 of 1', R - 55, y + 2);
            y += 14;

            // ════════════════════════════════════════════════════════════════
            // 7. Outer border (drawn last so it sits cleanly on top)
            // ════════════════════════════════════════════════════════════════
            doc.rect(L, 20, W, y - 20).lineWidth(0.8).strokeColor('#000').stroke();

            doc.end();
        });
    }

    async generateInvoicePdf(invoice: any): Promise<Buffer> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.fontSize(20).text('INVOICE', { align: 'center' });
            doc.moveDown();

            // Meta Info
            doc.fontSize(10);
            doc.text(`Invoice No: ${invoice.invoiceNumber}`, { align: 'right' });
            doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, { align: 'right' });
            doc.moveDown();

            // From / To (Vendor to Customer/Org)
            const startY = doc.y;
            doc.text('FROM:', 50, startY, { underline: true });
            doc.text(invoice.vendor.companyName);
            doc.text(invoice.vendor.address || '');
            doc.text(`${invoice.vendor.city || ''}, ${invoice.vendor.state || ''}`);
            doc.text(`GSTIN: ${invoice.vendor.gstin || 'N/A'}`);

            doc.text('TO:', 300, startY, { underline: true });
            doc.text(invoice.customer.companyName);
            // Add org address if available via relation

            doc.moveDown(2);

            // Table Header
            const tableTop = doc.y;
            doc.font('Helvetica-Bold');
            doc.text('Description', 50, tableTop);
            doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
            doc.text('Rate', 360, tableTop, { width: 60, align: 'right' });
            doc.text('Amount', 430, tableTop, { width: 70, align: 'right' });
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            // Items
            let itemY = tableTop + 25;
            doc.font('Helvetica');

            let totalAmount = 0;

            invoice.items.forEach((item: any) => {
                const desc = item.partDescription || item.partNumber;
                const amount = item.amount || (item.invoiceQuantity * item.unitPrice);

                doc.text(desc, 50, itemY);
                doc.text(item.invoiceQuantity.toString(), 300, itemY, { width: 50, align: 'right' });
                doc.text(item.unitPrice.toFixed(2), 360, itemY, { width: 60, align: 'right' });
                doc.text(amount.toFixed(2), 430, itemY, { width: 70, align: 'right' });

                itemY += 20;
                totalAmount += amount;
            });

            doc.moveTo(50, itemY).lineTo(550, itemY).stroke();
            itemY += 20;

            // Totals Section
            const rightColX = 350;
            const valColX = 450;
            const valWidth = 100;

            doc.font('Helvetica');

            // Subtotal
            doc.text('Subtotal:', rightColX, itemY, { width: 90, align: 'right' });
            doc.text(invoice.subtotal.toFixed(2), valColX, itemY, { width: valWidth, align: 'right' });
            itemY += 20;

            // Taxes
            if (invoice.igst > 0) {
                doc.text('IGST:', rightColX, itemY, { width: 90, align: 'right' });
                doc.text(invoice.igst.toFixed(2), valColX, itemY, { width: valWidth, align: 'right' });
                itemY += 20;
            } else {
                doc.text('CGST:', rightColX, itemY, { width: 90, align: 'right' });
                doc.text(invoice.cgst.toFixed(2), valColX, itemY, { width: valWidth, align: 'right' });
                itemY += 20;

                doc.text('SGST:', rightColX, itemY, { width: 90, align: 'right' });
                doc.text(invoice.sgst.toFixed(2), valColX, itemY, { width: valWidth, align: 'right' });
                itemY += 20;
            }

            // Draw line above Total
            doc.moveTo(rightColX, itemY).lineTo(550, itemY).stroke();
            itemY += 10;

            // Grand Total
            doc.font('Helvetica-Bold');
            doc.fontSize(12);
            doc.text('Grand Total:', rightColX, itemY, { width: 90, align: 'right' });
            doc.text(invoice.totalAmount.toFixed(2), valColX, itemY, { width: valWidth, align: 'right' });

            // Footer
            doc.moveDown(4);
            doc.text('For ' + invoice.vendor.companyName, { align: 'right' });
            doc.text('Authorized Signatory', { align: 'right' });

            doc.end();
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PURCHASE ORDER PDF
    // ═══════════════════════════════════════════════════════════════════════
    async generatePoPdf(po: any): Promise<Buffer> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const buffers: Buffer[] = [];
            doc.on('data', (b: Buffer) => buffers.push(b));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // ── Geometry ────────────────────────────────────────────────────
            const L   = 20;
            const R   = 575.28;
            const W   = R - L;
            const MID = L + W / 2;
            const B   = 'Helvetica-Bold';
            const N   = 'Helvetica';

            const hl = (y: number, x1 = L, x2 = R) =>
                doc.moveTo(x1, y).lineTo(x2, y).lineWidth(0.5).strokeColor('#000').stroke();
            const vl = (x: number, y1: number, y2: number) =>
                doc.moveTo(x, y1).lineTo(x, y2).lineWidth(0.5).strokeColor('#000').stroke();
            const t  = (s: string, x: number, y: number, opts: any = {}) =>
                doc.fillColor('#000').text(s, x, y, opts);
            const fillRect = (x: number, y: number, w: number, h: number, color = '#e8e8e8') =>
                doc.rect(x, y, w, h).fill(color).fillColor('#000');

            // ── Data ─────────────────────────────────────────────────────────
            const org    = po.organization || {};
            const vendor = po.vendor || {};
            const items: any[] = po.items || [];
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const fmtDate = (d: any) => {
                if (!d) return '';
                const dt = new Date(d);
                return `${String(dt.getDate()).padStart(2,'0')}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
            };
            const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Totals
            const subtotal   = po.subtotal    || 0;
            const cgst       = po.cgst        || 0;
            const sgst       = po.sgst        || 0;
            const totalAmt   = po.totalAmount || 0;
            const totQty     = items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);

            // State code helper (basic)
            const stateCode = (state: string) => {
                const MAP: Record<string,string> = {
                    'maharashtra':'27','delhi':'07','karnataka':'29','gujarat':'24',
                    'rajasthan':'08','tamil nadu':'33','uttar pradesh':'09','west bengal':'19',
                };
                return MAP[(state||'').toLowerCase()] || '';
            };

            let y = L;

            // ── OUTER BORDER (drawn last; reserve space) ──────────────────
            const PAGE_BOTTOM = 820;

            // ══════════════════════════════════════════════════════════════
            // 1. HEADER – org name, address, contact
            // ══════════════════════════════════════════════════════════════
            const hdrTop = y;
            doc.font(B).fontSize(13);
            t(org.name || 'Aaniryat Overseas Private Limited', L, y, { width: W, align: 'center' });
            y += 18;
            doc.font(N).fontSize(8);
            const orgAddrLine = [org.address, org.city, org.pincode, org.state, 'India'].filter(Boolean).join(', ');
            t(orgAddrLine, L, y, { width: W, align: 'center' });
            y += 12;
            const orgContact = [
                org.contactPhone ? `Contact No : ${org.contactPhone}` : '',
                org.contactEmail ? `Email ID : ${org.contactEmail}` : '',
            ].filter(Boolean).join('    ');
            t(orgContact, L, y, { width: W, align: 'center' });
            y += 14;
            hl(y); y += 1;

            // ══════════════════════════════════════════════════════════════
            // 2. "Purchase Order" BANNER
            // ══════════════════════════════════════════════════════════════
            const bannerH = 18;
            fillRect(L, y, W, bannerH, '#d8d8d8');
            doc.font(B).fontSize(12);
            t('Purchase Order', L, y + 3, { width: W, align: 'center' });
            y += bannerH;
            hl(y); y += 1;

            // ══════════════════════════════════════════════════════════════
            // 3. INFO GRID (2-col key-value rows)
            // ══════════════════════════════════════════════════════════════
            const infoTop = y;
            const COL_MID = L + W / 2;
            const LW = W / 2;   // each column width

            const infoRows = [
                ['GSTIN No.',          org.gstin   || '',   'Vendor Ref. No.',    ''],
                ['PAN No.',            org.pan     || '',   'Contact Person',     vendor.contactPerson || ''],
                ['Purchase Order No.', po.poNumber || '',   'Email Id',           vendor.email || ''],
                ['Purchase Order Date',fmtDate(po.poDate), 'Contact No.',         vendor.phone || ''],
                ['Purchase Request No.','',               'Delivery Date',       fmtDate(po.deliveryDate)],
                ['CIN No.',            org.cin     || '',   '',                   ''],
            ];

            const rowH = 15;
            let iy = y;
            infoRows.forEach((row, idx) => {
                const bg = idx % 2 === 0 ? '#ffffff' : '#f4f4f4';
                fillRect(L, iy, LW, rowH, bg);
                fillRect(COL_MID, iy, LW, rowH, bg);
                doc.font(B).fontSize(7.5);
                t(row[0], L + 3, iy + 3);
                doc.font(N).fontSize(7.5);
                t(`: ${row[1]}`, L + 3 + 90, iy + 3, { width: LW - 100 });
                if (row[2]) {
                    doc.font(B).fontSize(7.5);
                    t(row[2], COL_MID + 3, iy + 3);
                    doc.font(N).fontSize(7.5);
                    t(`: ${row[3]}`, COL_MID + 3 + 90, iy + 3, { width: LW - 100 });
                }
                hl(iy + rowH, L, R);
                iy += rowH;
            });
            vl(COL_MID, infoTop, iy);
            y = iy;

            // ══════════════════════════════════════════════════════════════
            // 4. VENDOR / SHIPPED FROM (2-col)
            // ══════════════════════════════════════════════════════════════
            const vsTop = y;
            const vsHdrH = 14;
            // Headers
            fillRect(L,       vsTop, LW, vsHdrH, '#d8d8d8');
            fillRect(COL_MID, vsTop, LW, vsHdrH, '#d8d8d8');
            doc.font(B).fontSize(8.5);
            t('Vendor', L, vsTop + 3, { width: LW, align: 'center' });
            t('Shipped From', COL_MID, vsTop + 3, { width: LW, align: 'center' });
            hl(vsTop + vsHdrH);
            y = vsTop + vsHdrH;

            // Content
            const vsBodyTop = y;
            const vsLines = (col: 'vendor' | 'org') => {
                const src = col === 'vendor' ? vendor : org;
                const lines: string[] = [];
                if (src.companyName || src.name) lines.push(src.companyName || src.name);
                const addrParts = [src.address, src.city, src.pincode].filter(Boolean);
                if (addrParts.length) lines.push(addrParts.join(', '));
                if (src.state) lines.push(src.state);
                return lines;
            };

            const vLines = vsLines('vendor');
            const oLines = vsLines('org');
            const vsBodyRows = Math.max(vLines.length, oLines.length) + 4; // +4 for state/pan/gstin rows
            const vsLineH = 11;
            const vsBodyH = vsBodyRows * vsLineH + 10;

            let vy = vsBodyTop + 4;
            vLines.forEach((line, i) => {
                const fnt = i === 0 ? B : N;
                doc.font(fnt).fontSize(7.5);
                t(line, L + 3, vy, { width: LW - 6 });
                vy += vsLineH;
            });
            // State + State Code
            const vsc = stateCode(vendor.state || '');
            doc.font(N).fontSize(7.5);
            t(`State  :  ${vendor.state || ''}`, L + 3, vy);
            doc.font(B).fontSize(7.5);
            t(`State Code  :  ${vsc}`, L + 3 + 90, vy); vy += vsLineH;
            doc.font(B).fontSize(7.5);
            t('PAN No.  :', L + 3, vy);
            doc.font(N).fontSize(7.5);
            t(vendor.pan || '', L + 3 + 55, vy);
            doc.font(B).fontSize(7.5);
            t('GSTIN No.  :', L + 3 + 100, vy);
            doc.font(N).fontSize(7.5);
            t(vendor.gstin || '', L + 3 + 165, vy);
            vy += vsLineH;

            let oy = vsBodyTop + 4;
            oLines.forEach((line, i) => {
                const fnt = i === 0 ? B : N;
                doc.font(fnt).fontSize(7.5);
                t(line, COL_MID + 3, oy, { width: LW - 6 });
                oy += vsLineH;
            });
            const osc = stateCode(org.state || '');
            doc.font(N).fontSize(7.5);
            t(`State  :  ${org.state || ''}`, COL_MID + 3, oy);
            doc.font(B).fontSize(7.5);
            t(`State Code  :  ${osc}`, COL_MID + 3 + 90, oy); oy += vsLineH;
            doc.font(B).fontSize(7.5);
            t('PAN No.  :', COL_MID + 3, oy);
            doc.font(N).fontSize(7.5);
            t(org.pan || '', COL_MID + 3 + 55, oy);
            doc.font(B).fontSize(7.5);
            t('GSTIN No.  :', COL_MID + 3 + 100, oy);
            doc.font(N).fontSize(7.5);
            t(org.gstin || '', COL_MID + 3 + 165, oy);

            y = vsBodyTop + Math.max(vy - vsBodyTop, oy - vsBodyTop) + 6;
            hl(y);
            vl(COL_MID, vsTop, y);
            y += 1;

            // ══════════════════════════════════════════════════════════════
            // 5. ITEMS TABLE HEADER
            // ══════════════════════════════════════════════════════════════
            // Columns: Sr.No | Product & Desc | HSN | Qty(UOM) | Rate | Discount | Total | Taxable | CGST | SGST
            const C = {
                sr:   { x: L,         w: 22  },
                desc: { x: L + 22,    w: 135 },
                hsn:  { x: L + 157,   w: 50  },
                qty:  { x: L + 207,   w: 48  },
                rate: { x: L + 255,   w: 46  },
                disc: { x: L + 301,   w: 38  },
                tot:  { x: L + 339,   w: 52  },
                tax:  { x: L + 391,   w: 48  },
                cgst: { x: L + 439,   w: 58  },
                sgst: { x: R - 58,    w: 58  },
            };

            const tblHdrH = 22;
            fillRect(L, y, W, tblHdrH, '#d0d0d0');
            const colHdrs: [keyof typeof C, string][] = [
                ['sr',   'Sr.\nNo.'],
                ['desc', 'Product No. &\nDescription'],
                ['hsn',  'HSN/SAC\nCode'],
                ['qty',  'Quantity\n(UOM)'],
                ['rate', 'Rate\n(INR)'],
                ['disc', 'Discount\n( % )'],
                ['tot',  'Total\n(INR)'],
                ['tax',  'Taxable\nValue'],
                ['cgst', 'CGST\n(Rate/Amount)'],
                ['sgst', 'SGST\n(Rate/Amount)'],
            ];
            doc.font(B).fontSize(6.5);
            colHdrs.forEach(([key, label]) => {
                const col = C[key];
                const lines = label.split('\n');
                const ly = lines.length === 2 ? y + 5 : y + 10;
                lines.forEach((line, li) => t(line, col.x + 1, ly + li * 9, { width: col.w - 2, align: 'center' }));
            });
            hl(y + tblHdrH);
            Object.values(C).forEach(col => vl(col.x, y, y + tblHdrH));
            vl(R, y, y + tblHdrH);
            y += tblHdrH;

            // ── Item rows ──────────────────────────────────────────────────
            const itemRowH = 26;
            const itemTop  = y;

            items.forEach((item, idx) => {
                const rowY = y + idx * itemRowH;
                const cgstRate = 9; // assume 9% CGST/SGST for now
                const sgstRate = 9;
                const taxable  = item.amount || 0;
                const cgstAmt  = taxable * cgstRate / 100;
                const sgstAmt  = taxable * sgstRate / 100;
                const disc     = 0;

                doc.font(B).fontSize(7);
                t(String(idx + 1), C.sr.x + 1, rowY + 3, { width: C.sr.w - 2, align: 'center' });
                doc.font(B).fontSize(7);
                t(`${item.partNumber || ''}`, C.desc.x + 2, rowY + 3, { width: C.desc.w - 4 });
                doc.font(N).fontSize(6.5);
                if (item.partDescription) t(item.partDescription, C.desc.x + 2, rowY + 12, { width: C.desc.w - 4 });
                if (item.unitOfMeasure)   t(item.unitOfMeasure,   C.desc.x + 2, rowY + 19, { width: C.desc.w - 4 });

                doc.font(N).fontSize(7);
                t(item.hsnCode || '', C.hsn.x + 1, rowY + 8, { width: C.hsn.w - 2, align: 'center' });

                doc.font(N).fontSize(7);
                t(fmt(Number(item.quantity)), C.qty.x + 1, rowY + 5, { width: C.qty.w - 2, align: 'right' });
                t(item.unitOfMeasure || '', C.qty.x + 1, rowY + 14, { width: C.qty.w - 2, align: 'center' });

                t(fmt(Number(item.ratePerPiece)), C.rate.x + 1, rowY + 8, { width: C.rate.w - 2, align: 'right' });
                t(fmt(disc),                      C.disc.x + 1, rowY + 8, { width: C.disc.w - 2, align: 'right' });
                t(fmt(taxable),                   C.tot.x + 1,  rowY + 8, { width: C.tot.w - 2,  align: 'right' });
                t(fmt(taxable),                   C.tax.x + 1,  rowY + 8, { width: C.tax.w - 2,  align: 'right' });
                t(`${cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, C.cgst.x + 1, rowY + 3, { width: C.cgst.w - 2, align: 'right' });
                doc.font(N).fontSize(6.5);
                t(`${cgstRate}.00%`, C.cgst.x + 1, rowY + 12, { width: C.cgst.w - 2, align: 'right' });
                doc.font(N).fontSize(7);
                t(`${sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, C.sgst.x + 1, rowY + 3, { width: C.sgst.w - 2, align: 'right' });
                doc.font(N).fontSize(6.5);
                t(`${sgstRate}.00%`, C.sgst.x + 1, rowY + 12, { width: C.sgst.w - 2, align: 'right' });

                hl(rowY + itemRowH);
                Object.values(C).forEach(col => vl(col.x, rowY, rowY + itemRowH));
                vl(R, rowY, rowY + itemRowH);
            });

            // Blank rows to fill space (min 8 rows total)
            const minRows = 8;
            const blankRows = Math.max(0, minRows - items.length);
            for (let i = 0; i < blankRows; i++) {
                const rowY = y + (items.length + i) * itemRowH;
                hl(rowY + itemRowH);
                Object.values(C).forEach(col => vl(col.x, rowY, rowY + itemRowH));
                vl(R, rowY, rowY + itemRowH);
            }

            y += (items.length + blankRows) * itemRowH;

            // ── Totals row ─────────────────────────────────────────────────
            const totRowH = 14;
            fillRect(L, y, W, totRowH, '#e8e8e8');
            doc.font(B).fontSize(7.5);
            t('Total', C.sr.x + 2, y + 3);
            t(fmt(totQty),     C.qty.x + 1,  y + 3, { width: C.qty.w - 2,  align: 'right' });
            t(fmt(subtotal),   C.tot.x + 1,  y + 3, { width: C.tot.w - 2,  align: 'right' });
            t(fmt(subtotal),   C.tax.x + 1,  y + 3, { width: C.tax.w - 2,  align: 'right' });
            t(fmt(cgst),       C.cgst.x + 1, y + 3, { width: C.cgst.w - 2, align: 'right' });
            t(fmt(sgst),       C.sgst.x + 1, y + 3, { width: C.sgst.w - 2, align: 'right' });
            hl(y + totRowH);
            Object.values(C).forEach(col => vl(col.x, y, y + totRowH));
            vl(R, y, y + totRowH);
            y += totRowH;

            // ── Amount in words + Sub/Total ────────────────────────────────
            const amtRowH = 12;
            // Words helper (basic Indian numbering)
            const numToWords = (n: number) => {
                const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                              'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                              'Seventeen','Eighteen','Nineteen'];
                const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
                const convert = (num: number): string => {
                    if (num < 20) return ones[num];
                    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '');
                    if (num < 1000) return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + convert(num%100) : '');
                    if (num < 100000) return convert(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' ' + convert(num%1000) : '');
                    if (num < 10000000) return convert(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' ' + convert(num%100000) : '');
                    return convert(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' ' + convert(num%10000000) : '');
                };
                const r = Math.round(n);
                return r === 0 ? 'Zero' : convert(r);
            };
            const words = `INR ${numToWords(Math.round(totalAmt))} Only`;

            // Amount in words row
            hl(y + amtRowH * 2);
            doc.font(B).fontSize(7);
            t('Amount In Words', L + 3, y + 3);
            doc.font(N).fontSize(7);
            t(`: ${words}`, L + 75, y + 3, { width: W / 2 });
            doc.font(B).fontSize(7);
            t('Sub Total', R - 120, y + 3);
            t(`:`, R - 55, y + 3);
            doc.font(N).fontSize(7);
            t(fmt(subtotal), R - 50, y + 3, { width: 48, align: 'right' });
            vl(R - 120, y, y + amtRowH * 2);
            vl(R - 55, y, y + amtRowH * 2);
            vl(R, y, y + amtRowH * 2);
            y += amtRowH;
            doc.font(B).fontSize(7);
            t('Total', R - 120, y + 3);
            t(`:`, R - 55, y + 3);
            doc.font(N).fontSize(7);
            t(fmt(totalAmt), R - 50, y + 3, { width: 48, align: 'right' });
            y += amtRowH;

            // ── Remark ─────────────────────────────────────────────────────
            hl(y);
            doc.font(B).fontSize(7.5);
            t('Remark  :', L + 3, y + 4);
            doc.font(N).fontSize(7.5);
            t(po.remarks || '', L + 55, y + 4, { width: W - 60 });
            y += 16;

            // ── Terms & Conditions banner ──────────────────────────────────
            hl(y);
            fillRect(L, y, W, 14, '#d8d8d8');
            doc.font(B).fontSize(8.5);
            t('Terms & Conditions', L, y + 3, { width: W, align: 'center' });
            y += 14;
            hl(y);
            if (po.termsAndConditions) {
                doc.font(N).fontSize(7);
                t(po.termsAndConditions, L + 3, y + 4, { width: W - 6 });
                y += 20;
            } else {
                y += 10;
            }

            // ── Footer: Delivery Details (L) | Authorised Signatory (R) ──
            const ftrTop = y;
            hl(y);
            vl(COL_MID, y, y + 60);

            doc.font(B).fontSize(8);
            t('Delivery Details', L + 3, y + 4);
            t(org.name || '', COL_MID + 3, y + 4);
            y += 14;

            doc.font(B).fontSize(7);
            t('Mode of Transport  :', L + 3, y + 3);
            doc.font(N).fontSize(7);
            t(po.modeOfTransport || '', L + 90, y + 3);
            doc.font(B).fontSize(7);
            t('Payment Terms  :', L + 170, y + 3);
            doc.font(N).fontSize(7);
            t(po.paymentTerms || '', L + 245, y + 3, { width: COL_MID - L - 250 });
            y += 11;

            doc.font(B).fontSize(7);
            t('Delivery Terms  :', L + 3, y + 3);
            doc.font(N).fontSize(7);
            t(po.deliveryTerms || '', L + 82, y + 3);
            doc.font(B).fontSize(7);
            t('Freight Terms  :', L + 170, y + 3);
            doc.font(N).fontSize(7);
            t(po.freightTerms || '', L + 243, y + 3, { width: COL_MID - L - 248 });
            y += 11;

            doc.font(B).fontSize(7);
            t('Reverse Charge Applicable  :', L + 3, y + 3);
            doc.font(N).fontSize(7);
            t(po.reverseCharge ? 'YES' : 'NO', L + 130, y + 3);

            // Authorised Signatory label
            doc.font(B).fontSize(7);
            t('Authorised Signatory', COL_MID + 3, ftrTop + 44, { width: LW - 6, align: 'center' });

            y = ftrTop + 58;
            hl(y);

            // ── Registered Address + page number ──────────────────────────
            doc.font(B).fontSize(7);
            t('Registered Address  :', L + 3, y + 4);
            doc.font(N).fontSize(7);
            const regAddr = [org.address, org.city, org.pincode, org.state, 'India'].filter(Boolean).join(', ');
            t(regAddr, L + 90, y + 4, { width: W - 100 });
            doc.font(N).fontSize(7);
            t('Page 1 of 1', L, y + 4, { width: W, align: 'right' });
            y += 14;

            // ── Outer border ───────────────────────────────────────────────
            doc.rect(L, L, W, y - L).lineWidth(1).strokeColor('#000').stroke();

            doc.end();
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PURCHASE ORDER PDF
    // ═══════════════════════════════════════════════════════════════════════
    async generatePurchaseOrderPdf(po: any): Promise<Buffer> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const buffers: Buffer[] = [];
            doc.on('data', (b: Buffer) => buffers.push(b));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // ── Page geometry ─────────────────────────────────────────────
            const L   = 20;
            const R   = 575.28;
            const W   = R - L;
            const MID = L + W / 2;
            const B   = 'Helvetica-Bold';
            const N   = 'Helvetica';

            const hl = (y: number, x1 = L, x2 = R) =>
                doc.moveTo(x1, y).lineTo(x2, y).lineWidth(0.5).strokeColor('#000').stroke();
            const vl = (x: number, y1: number, y2: number) =>
                doc.moveTo(x, y1).lineTo(x, y2).lineWidth(0.5).strokeColor('#000').stroke();
            const t  = (s: string, x: number, y: number, opts: any = {}) =>
                doc.fillColor('#000').text(s, x, y, opts);

            // ── Data resolution ───────────────────────────────────────────
            const org    = po.organization  || {};
            const vendor = po.vendor        || {};
            const items  = po.items         || [];
            const createdBy = po.createdBy  || {};

            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const fmtDate = (d: any) => {
                if (!d) return '';
                const dt = new Date(d);
                return `${String(dt.getDate()).padStart(2,'0')}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
            };

            // ── Number helpers ────────────────────────────────────────────
            const fmt = (n: number) =>
                Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Amount in words
            const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                          'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                          'Seventeen','Eighteen','Nineteen'];
            const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
            const numToWords = (n: number): string => {
                if (n === 0) return 'Zero';
                if (n < 20)  return ones[n];
                if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
                if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWords(n%100) : '');
                if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWords(n%1000) : '');
                if (n < 10000000) return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numToWords(n%100000) : '');
                return numToWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numToWords(n%10000000) : '');
            };
            const amountInWords = (amt: number): string => {
                const rupees = Math.floor(amt);
                const paise  = Math.round((amt - rupees) * 100);
                let w = 'INR ' + numToWords(rupees);
                if (paise > 0) w += ' and ' + numToWords(paise) + ' Paise';
                return w + ' Only';
            };

            let y = 20;

            // ════════════════════════════════════════════════════════════════
            // 1. HEADER — Org name + address centred
            // ════════════════════════════════════════════════════════════════
            doc.font(B).fontSize(14);
            t(org.name || 'Organisation', L, y, { width: W, align: 'center' });
            y += 18;
            doc.font(N).fontSize(8);
            const orgAddrLine = [org.address, org.city, org.pincode, org.state, 'India']
                .filter(Boolean).join(', ');
            t(orgAddrLine, L, y, { width: W, align: 'center' });
            y += 12;

            const contactLine = [
                org.contactPhone ? `Contact No : ${org.contactPhone}` : '',
                org.contactEmail ? `Email ID : ${org.contactEmail}` : '',
            ].filter(Boolean).join('     ');
            t(contactLine, L, y, { width: W, align: 'center' });
            y += 10;
            hl(y); y += 3;

            // ════════════════════════════════════════════════════════════════
            // 2. "Purchase Order" banner
            // ════════════════════════════════════════════════════════════════
            const bannerH = 20;
            doc.rect(L, y, W, bannerH).fill('#e8e8e8');
            doc.font(B).fontSize(13).fillColor('#000');
            t('Purchase Order', L, y + 4, { width: W, align: 'center' });
            y += bannerH;
            hl(y); y += 4;

            // ════════════════════════════════════════════════════════════════
            // 3. INFO BLOCK — two columns
            // ════════════════════════════════════════════════════════════════
            const infoTop = y;
            const ROW = 13;

            // field helper
            const lf = (label: string, val: string, iy: number) => {
                doc.font(B).fontSize(8).fillColor('#000').text(label, L + 4, iy, { width: 105 });
                doc.font(N).fontSize(8).fillColor('#000').text(`: ${val}`, L + 109, iy, { width: MID - L - 112 });
            };
            const rf = (label: string, val: string, iy: number) => {
                doc.font(B).fontSize(8).fillColor('#000').text(label, MID + 4, iy, { width: 105 });
                doc.font(N).fontSize(8).fillColor('#000').text(`: ${val}`, MID + 109, iy, { width: R - MID - 113 });
            };

            let lY = y + 3;
            let rY = y + 3;

            lf('GSTIN No.',        org.gstin    || '', lY); lY += ROW;
            lf('PAN No.',          org.pan      || '', lY); lY += ROW;
            lf('Purchase Order No.', po.poNumber|| '', lY); lY += ROW;
            lf('Purchase Order Date', fmtDate(po.poDate), lY); lY += ROW;
            lf('Purchase Request No.', po.prNumber || '', lY); lY += ROW;
            lf('CIN No.',          org.cin      || '', lY); lY += ROW;

            rf('Vendor Ref. No.',  po.vendorRefNo || '', rY); rY += ROW;
            rf('Contact Person',   `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim() || vendor.contactPerson || '', rY); rY += ROW;
            rf('Email Id',         createdBy.email || vendor.email || '', rY); rY += ROW;
            rf('Contact No.',      createdBy.phone || vendor.phone || '', rY); rY += ROW;
            rf('Delivery Date',    fmtDate(po.deliveryDate), rY); rY += ROW;

            y = Math.max(lY, rY) + 4;
            vl(MID, infoTop, y);
            hl(y); y += 4;

            // ════════════════════════════════════════════════════════════════
            // 4. VENDOR / SHIPPED FROM boxes
            // ════════════════════════════════════════════════════════════════
            const boxTop = y;
            // Headers
            doc.rect(L, y, MID - L, 14).fill('#e8e8e8');
            doc.rect(MID, y, R - MID, 14).fill('#e8e8e8');
            doc.font(B).fontSize(9).fillColor('#000');
            t('Vendor', L, y + 3, { width: MID - L, align: 'center' });
            t('Shipped From', MID, y + 3, { width: R - MID, align: 'center' });
            y += 14; hl(y);

            const bf = (s: string, x: number, iy: number, opts: any = {}) =>
                doc.font(B).fontSize(8).fillColor('#000').text(s, x, iy, { width: MID - L - 8, ...opts });
            const nf = (s: string, x: number, iy: number, opts: any = {}) =>
                doc.font(N).fontSize(8).fillColor('#000').text(s, x, iy, { width: MID - L - 8, ...opts });

            // Shipped-from address (same vendor but their "from" address — we use vendor data)
            let vY = y + 4;
            let sY = y + 4;

            doc.font(B).fontSize(9).fillColor('#000').text(vendor.companyName || '', L + 4, vY, { width: MID - L - 8 }); vY += 13;
            doc.font(N).fontSize(8).fillColor('#000').text(vendor.address || '', L + 4, vY, { width: MID - L - 8 }); vY += 11;
            const vendorCityState = [vendor.city, vendor.pincode, vendor.state].filter(Boolean).join(' ');
            doc.font(N).fontSize(8).fillColor('#000').text(vendorCityState, L + 4, vY, { width: MID - L - 8 }); vY += 11;
            doc.font(N).fontSize(8).fillColor('#000').text('IN', L + 4, vY); vY += 11;
            doc.font(B).fontSize(8).fillColor('#000').text(`State  : ${vendor.state || ''}`, L + 4, vY, { width: MID - L - 80 });
            doc.font(B).fontSize(8).fillColor('#000').text(`State Code  : 27`, MID - 80, vY); vY += 11;
            doc.font(B).fontSize(8).fillColor('#000').text('PAN No.', L + 4, vY, { width: 50 });
            doc.font(N).fontSize(8).fillColor('#000').text(`: ${vendor.pan || ''}`, L + 54, vY, { width: MID - L - 90 });
            doc.font(B).fontSize(8).fillColor('#000').text('GSTIN No.', MID - 80, vY, { width: 58 });
            doc.font(N).fontSize(8).fillColor('#000').text(`: ${vendor.gstin || ''}`, MID - 22, vY, { width: MID - L - 80 });
            vY += 11;

            // Shipped from — use delivery address if set, else vendor address
            const sfAddr = po.deliveryAddress || vendor.address || '';
            doc.font(B).fontSize(9).fillColor('#000').text(vendor.companyName || '', MID + 4, sY, { width: R - MID - 8 }); sY += 13;
            doc.font(N).fontSize(8).fillColor('#000').text(sfAddr, MID + 4, sY, { width: R - MID - 8 }); sY += 11;
            const sfCityState = [vendor.city, vendor.pincode, vendor.state].filter(Boolean).join(' ');
            doc.font(N).fontSize(8).fillColor('#000').text(sfCityState, MID + 4, sY, { width: R - MID - 8 }); sY += 11;
            doc.font(B).fontSize(8).fillColor('#000').text(`State  : ${vendor.state || ''}`, MID + 4, sY, { width: R - MID - 80 });
            doc.font(B).fontSize(8).fillColor('#000').text(`State Code  : 27`, R - 90, sY); sY += 11;
            doc.font(B).fontSize(8).fillColor('#000').text('PAN No.', MID + 4, sY, { width: 50 });
            doc.font(N).fontSize(8).fillColor('#000').text(`: ${vendor.pan || ''}`, MID + 54, sY, { width: 60 });
            doc.font(B).fontSize(8).fillColor('#000').text('GSTIN No.', R - 100, sY, { width: 50 });
            doc.font(N).fontSize(8).fillColor('#000').text(`: ${vendor.gstin || ''}`, R - 50, sY, { width: 50 }); sY += 11;

            y = Math.max(vY, sY) + 4;
            vl(MID, boxTop, y);
            hl(y); y += 2;

            // ════════════════════════════════════════════════════════════════
            // 5. LINE ITEMS TABLE
            // ════════════════════════════════════════════════════════════════
            // Column definitions (x-start, width, alignment)
            const cols = [
                { x: L,       w: 22,  align: 'center', label: 'Sr.\nNo.' },
                { x: L+22,    w: 120, align: 'left',   label: 'Product No. & Description' },
                { x: L+142,   w: 44,  align: 'center', label: 'HSN/SAC\nCode' },
                { x: L+186,   w: 46,  align: 'right',  label: 'Quantity\n(UOM)' },
                { x: L+232,   w: 46,  align: 'right',  label: 'Rate\n(INR)' },
                { x: L+278,   w: 36,  align: 'right',  label: 'Discount\n( % )' },
                { x: L+314,   w: 52,  align: 'right',  label: 'Total\n(INR)' },
                { x: L+366,   w: 44,  align: 'right',  label: 'Taxable\nValue' },
                { x: L+410,   w: 72,  align: 'center', label: 'CGST\n(Rate/Amount)' },
                { x: L+482,   w: 73,  align: 'center', label: 'SGST\n(Rate/Amount)' },
            ];

            // Header row
            const thH = 26;
            doc.rect(L, y, W, thH).fill('#e8e8e8');
            cols.forEach((c) => {
                doc.font(B).fontSize(7).fillColor('#000')
                    .text(c.label, c.x + 2, y + 4, { width: c.w - 4, align: c.align as any, lineGap: 1 });
            });
            y += thH;
            hl(y);

            // Draw vertical column borders for header
            const tableTop = y - thH;
            cols.slice(1).forEach(c => vl(c.x, tableTop, y));
            vl(R, tableTop, y);

            // Determine tax split (CGST/SGST if same state, else IGST)
            const orgState    = (org.state    || '').toLowerCase().trim();
            const vendorState = (vendor.state || '').toLowerCase().trim();
            const intraState  = orgState && vendorState && orgState === vendorState;

            // Tax rate per item — use IGST from PO if available, else 18%
            const totalTaxableAmt = items.reduce((s: number, i: any) => s + (i.quantity * i.ratePerPiece), 0) || 1;
            const derivedIgstRate = po.igst ? (po.igst / totalTaxableAmt) : 0.18;
            const effectiveTaxRate = intraState ? derivedIgstRate : derivedIgstRate;

            // Item rows
            const itemRowStartY = y;
            const itemsAreaH = Math.max(items.length * 30, 120);

            items.forEach((item: any, idx: number) => {
                const rowY = y + 4;
                const taxableVal = item.quantity * item.ratePerPiece;
                const taxAmt = taxableVal * effectiveTaxRate;
                const halfTax = taxAmt / 2;
                const taxRatePct = `${(effectiveTaxRate * 100 / 2).toFixed(2)}%`;

                doc.font(B).fontSize(7.5).fillColor('#000').text(String(idx + 1), cols[0].x + 2, rowY, { width: cols[0].w - 4, align: 'center' });
                doc.font(N).fontSize(7.5).fillColor('#000').text(
                    `${item.partNumber}${item.partDescription ? ' - ' + item.partDescription : ''}`,
                    cols[1].x + 2, rowY, { width: cols[1].w - 4 }
                );
                if (item.unitOfMeasure) {
                    doc.font(N).fontSize(6.5).fillColor('#666').text(item.unitOfMeasure, cols[1].x + 2, rowY + 10, { width: cols[1].w - 4 });
                }
                doc.font(N).fontSize(7.5).fillColor('#000').text(item.hsnCode || '', cols[2].x + 2, rowY, { width: cols[2].w - 4, align: 'center' });
                doc.font(N).fontSize(7.5).fillColor('#000').text(fmt(item.quantity), cols[3].x + 2, rowY, { width: cols[3].w - 4, align: 'right' });
                doc.font(N).fontSize(7.5).fillColor('#000').text(fmt(item.ratePerPiece), cols[4].x + 2, rowY, { width: cols[4].w - 4, align: 'right' });
                doc.font(N).fontSize(7.5).fillColor('#000').text('0.00', cols[5].x + 2, rowY, { width: cols[5].w - 4, align: 'right' });
                doc.font(N).fontSize(7.5).fillColor('#000').text(fmt(taxableVal), cols[6].x + 2, rowY, { width: cols[6].w - 4, align: 'right' });
                doc.font(N).fontSize(7.5).fillColor('#000').text(fmt(taxableVal), cols[7].x + 2, rowY, { width: cols[7].w - 4, align: 'right' });

                // CGST
                doc.font(N).fontSize(7.5).fillColor('#000').text(fmt(halfTax), cols[8].x + 2, rowY, { width: cols[8].w - 4, align: 'right' });
                doc.font(N).fontSize(6.5).fillColor('#555').text(taxRatePct, cols[8].x + 2, rowY + 10, { width: cols[8].w - 4, align: 'right' });

                // SGST
                doc.font(N).fontSize(7.5).fillColor('#000').text(fmt(halfTax), cols[9].x + 2, rowY, { width: cols[9].w - 4, align: 'right' });
                doc.font(N).fontSize(6.5).fillColor('#555').text(taxRatePct, cols[9].x + 2, rowY + 10, { width: cols[9].w - 4, align: 'right' });

                y += 30;
                hl(y, L, R);
                cols.slice(1).forEach(c => vl(c.x, y - 30, y));
                vl(R, y - 30, y);
            });

            // Empty rows to fill space (show at least 5 rows)
            const minRows = 5;
            const emptyNeeded = Math.max(0, minRows - items.length);
            for (let i = 0; i < emptyNeeded; i++) {
                y += 18;
                hl(y, L, R);
                cols.slice(1).forEach(c => vl(c.x, y - 18, y));
                vl(R, y - 18, y);
            }

            // ── Totals row ────────────────────────────────────────────────
            const totQty       = items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
            const totSubtotal  = items.reduce((s: number, i: any) => s + (i.quantity * i.ratePerPiece), 0);
            const totTax       = totSubtotal * effectiveTaxRate;
            const totHalfTax   = totTax / 2;
            const totTotal     = totSubtotal + totTax;

            doc.rect(L, y, W, 14).fill('#f5f5f5');
            doc.font(B).fontSize(8).fillColor('#000').text('Total', cols[1].x + 2, y + 3, { width: 60 });
            doc.font(B).fontSize(8).fillColor('#000').text(fmt(totQty), cols[3].x + 2, y + 3, { width: cols[3].w - 4, align: 'right' });
            doc.font(B).fontSize(8).fillColor('#000').text(fmt(totSubtotal), cols[6].x + 2, y + 3, { width: cols[6].w - 4, align: 'right' });
            doc.font(B).fontSize(8).fillColor('#000').text(fmt(totHalfTax), cols[8].x + 2, y + 3, { width: cols[8].w - 4, align: 'right' });
            doc.font(B).fontSize(8).fillColor('#000').text(fmt(totHalfTax), cols[9].x + 2, y + 3, { width: cols[9].w - 4, align: 'right' });
            cols.slice(1).forEach(c => vl(c.x, y, y + 14));
            vl(R, y, y + 14);
            y += 14; hl(y);

            // ── Amount in words + Sub/Total ───────────────────────────────
            const sumBoxTop = y;
            y += 3;
            doc.font(B).fontSize(7.5).fillColor('#000').text('Amount In Words', L + 4, y, { width: 80 });
            doc.font(N).fontSize(7.5).fillColor('#000').text(`:${amountInWords(totTotal)}`, L + 84, y, { width: R - L - 170 });

            // Right side sub/total
            doc.font(B).fontSize(8).fillColor('#000').text('Sub Total', R - 160, y, { width: 80, align: 'right' });
            doc.font(N).fontSize(8).fillColor('#000').text(`:  ${fmt(totSubtotal)}`, R - 75, y, { width: 55, align: 'right' });
            y += 13;
            doc.font(B).fontSize(8).fillColor('#000').text('Total', R - 160, y, { width: 80, align: 'right' });
            doc.font(N).fontSize(8).fillColor('#000').text(`:  ${fmt(totTotal)}`, R - 75, y, { width: 55, align: 'right' });
            y += 13;
            hl(y);

            // ── Remark ────────────────────────────────────────────────────
            doc.font(B).fontSize(8).fillColor('#000').text('Remark  :', L + 4, y + 3);
            if (po.remarks) {
                doc.font(N).fontSize(8).fillColor('#000').text(po.remarks, L + 70, y + 3, { width: W - 74 });
            }
            y += 16; hl(y);

            // ── Terms & Conditions ────────────────────────────────────────
            doc.rect(L, y, W, 14).fill('#e8e8e8');
            doc.font(B).fontSize(9).fillColor('#000').text('Terms & Conditions', L, y + 3, { width: W, align: 'center' });
            y += 14; hl(y);
            if (po.termsAndConditions) {
                doc.font(N).fontSize(7.5).fillColor('#000').text(po.termsAndConditions, L + 4, y + 3, { width: W - 8 });
                y += doc.heightOfString(po.termsAndConditions, { width: W - 8 }) + 8;
            } else {
                y += 10;
            }
            hl(y);

            // ── Footer: Delivery Details + Authorised Signatory ───────────
            const footTop = y;
            const footMid = L + W * 0.55;

            doc.font(B).fontSize(8).fillColor('#000').text('Delivery Details', L + 4, y + 4, { width: 100 });
            doc.font(B).fontSize(8).fillColor('#000').text(org.name || '', footMid + 4, y + 4, { width: R - footMid - 8, align: 'center' });
            y += 16; hl(y, L, R);

            const fd = (label: string, val: string, fy: number, x1: number, x2: number) => {
                doc.font(B).fontSize(7.5).fillColor('#000').text(label, x1 + 4, fy, { width: 90 });
                doc.font(N).fontSize(7.5).fillColor('#000').text(`: ${val}`, x1 + 94, fy, { width: x2 - x1 - 98 });
            };

            let fdY = y + 4;
            fd('Mode of Transport', '', fdY, L, footMid);
            fd('Payment Terms', po.paymentTerms || '', fdY, footMid, R); fdY += 12;
            fd('Delivery Terms', '', fdY, L, footMid);
            fd('Freight Terms', '', fdY, footMid, R); fdY += 12;
            fd('Reverse Charge Applicable', 'NO', fdY, L, footMid); fdY += 12;

            doc.font(N).fontSize(7).fillColor('#000').text(
                `Registered Address : ${[org.address, org.city, org.pincode, org.state, 'India'].filter(Boolean).join(', ')}`,
                L + 4, fdY, { width: footMid - L - 8 }
            );

            // Authorised signatory block
            doc.font(N).fontSize(8).fillColor('#000').text('Authorised Signatory', footMid + 4, fdY + 20, { width: R - footMid - 8, align: 'center' });

            const footEnd = fdY + 40;
            vl(footMid, footTop, footEnd);
            hl(footEnd);
            y = footEnd + 4;

            // Page number
            doc.font(N).fontSize(7).fillColor('#555').text('Page 1 of 1', L, y, { width: W, align: 'right' });
            y += 10;

            // ── Outer border ─────────────────────────────────────────────
            doc.rect(L, 20, W, y - 20).lineWidth(0.8).strokeColor('#000').stroke();

            doc.end();
        });
    }
}
