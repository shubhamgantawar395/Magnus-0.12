'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useExport } from '@/hooks/useExport';
import { ExportColumn } from '@/utils/exportUtils';

interface ExportButtonProps {
    data: any[];
    filename: string;
    columns?: ExportColumn[];
    disabled?: boolean;
}

export default function ExportButton({ data, filename, columns, disabled }: ExportButtonProps) {
    const { exporting, exportCSV, exportExcel } = useExport({ filename, columns });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={disabled || exporting || data.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCSV(data)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportExcel(data)}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
