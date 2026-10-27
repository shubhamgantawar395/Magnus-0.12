import { useState } from 'react';
import { exportToCSV, exportToExcel, ExportColumn } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

interface UseExportOptions {
    filename: string;
    columns?: ExportColumn[];
}

export const useExport = (options: UseExportOptions) => {
    const [exporting, setExporting] = useState(false);

    const handleExportCSV = async (data: any[]) => {
        try {
            setExporting(true);
            exportToCSV(data, options.filename, options.columns);
            toast.success(`Exported ${data.length} records to CSV`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    const handleExportExcel = async (data: any[]) => {
        try {
            setExporting(true);
            exportToExcel(data, options.filename, options.columns);
            toast.success(`Exported ${data.length} records to Excel`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    return {
        exporting,
        exportCSV: handleExportCSV,
        exportExcel: handleExportExcel,
    };
};
