// Export utilities for CSV and Excel
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportColumn {
    header: string;
    key: string;
    formatter?: (value: any) => string | number;
}

export const exportToCSV = (data: any[], filename: string, columns?: ExportColumn[]) => {
    if (data.length === 0) {
        return;
    }

    let csvContent: string;

    if (columns) {
        // Use specified columns
        const headers = columns.map(col => col.header).join(',');
        const rows = data.map(item => {
            return columns.map(col => {
                const value = item[col.key];
                const formatted = col.formatter ? col.formatter(value) : value;
                // Escape commas and quotes
                const stringValue = String(formatted ?? '');
                return stringValue.includes(',') || stringValue.includes('"')
                    ? `"${stringValue.replace(/"/g, '""')}"`
                    : stringValue;
            }).join(',');
        });
        csvContent = [headers, ...rows].join('\n');
    } else {
        // Auto-detect columns from first object
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => {
            return Object.values(item).map(value => {
                const stringValue = String(value ?? '');
                return stringValue.includes(',') || stringValue.includes('"')
                    ? `"${stringValue.replace(/"/g, '""')}"`
                    : stringValue;
            }).join(',');
        });
        csvContent = [headers, ...rows].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
};

export const exportToExcel = (data: any[], filename: string, columns?: ExportColumn[]) => {
    if (data.length === 0) {
        return;
    }

    let worksheetData: any[];

    if (columns) {
        // Use specified columns
        const headers = columns.map(col => col.header);
        const rows = data.map(item => {
            return columns.map(col => {
                const value = item[col.key];
                return col.formatter ? col.formatter(value) : value;
            });
        });
        worksheetData = [headers, ...rows];
    } else {
        // Auto-detect columns
        worksheetData = data;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportSelectedToCSV = (data: any[], selectedIds: Set<string>, idKey: string, filename: string, columns?: ExportColumn[]) => {
    const selectedData = data.filter(item => selectedIds.has(item[idKey]));
    exportToCSV(selectedData, filename, columns);
};

export const exportSelectedToExcel = (data: any[], selectedIds: Set<string>, idKey: string, filename: string, columns?: ExportColumn[]) => {
    const selectedData = data.filter(item => selectedIds.has(item[idKey]));
    exportToExcel(selectedData, filename, columns);
};
