import { Injectable } from '@nestjs/common';
import { StockStatementData, ChallanItemStock } from '../reports/reports.service';

@Injectable()
export class ExportService {
    /**
     * Export stock statement to Excel format
     * Note: Requires 'exceljs' package - install with:: npm install exceljs
     */
    async exportStockStatementToExcel(data: StockStatementData): Promise<Buffer> {
        const ExcelJS = await this.loadExcelJS();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Stock Statement');

        // Add header
        worksheet.addRow(['Stock Statement']);
        worksheet.addRow([`Vendor: ${data.vendorName}`]);
        worksheet.addRow([`Period: ${this.getMonthName(data.month)} ${data.year}`]);
        worksheet.addRow([]);

        // Add column headers
        const headerRow = worksheet.addRow([
            'Challan No',
            'Challan Date',
            'Item Name',
            'OEM Challan Qty',
            'Dispatch Qty',
            'Balance Qty'
        ]);

        // Style header row
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add data rows
        data.items.forEach(item => {
            worksheet.addRow([
                item.challanNumber,
                item.challanDate.toLocaleDateString(),
                item.itemName,
                item.oemChallanQty,
                item.dispatchQty,
                item.balanceQty
            ]);
        });

        worksheet.addRow([]);

        // Add summary
        const summaryRow = worksheet.addRow([
            'TOTAL',
            '',
            '',
            data.summary.totalIssued,
            data.summary.totalDispatched,
            data.summary.totalBalance
        ]);
        summaryRow.font = { bold: true };

        // Auto-size columns
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Export stock statement to CSV format
     */
    exportStockStatementToCSV(data: StockStatementData): string {
        const lines: string[] = [];

        // Header
        lines.push(`Stock Statement - ${data.vendorName}`);
        lines.push(`Period: ${this.getMonthName(data.month)} ${data.year}`);
        lines.push('');

        // Column headers
        lines.push('Challan No,Challan Date,Item Name,OEM Challan Qty,Dispatch Qty,Balance Qty');

        // Data rows
        data.items.forEach(item => {
            lines.push(
                `${item.challanNumber},${item.challanDate.toLocaleDateString()},"${item.itemName}",${item.oemChallanQty},${item.dispatchQty},${item.balanceQty}`
            );
        });

        lines.push('');

        // Summary
        lines.push(`TOTAL,,,${data.summary.totalIssued},${data.summary.totalDispatched},${data.summary.totalBalance}`);

        return lines.join('\n');
    }

    /**
     * Export any data to CSV format
     */
    exportToCSV(data: any[], headers: string[]): string {
        const lines: string[] = [];
        lines.push(headers.join(','));

        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value.toString();
            });
            lines.push(values.join(','));
        });

        return lines.join('\n');
    }

    private getMonthName(month: number): string {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || 'Unknown';
    }

    private async loadExcelJS() {
        try {
            // Dynamic import to avoid errors if package not installed
            const ExcelJS = await import('exceljs');
            return ExcelJS.default || ExcelJS;
        } catch (error) {
            throw new Error(
                'ExcelJS package not installed. Please run: npm install exceljs'
            );
        }
    }
}
