'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: (checked: boolean) => void;
    onClearSelection: () => void;
    actions: Array<{
        label: string;
        icon?: React.ReactNode;
        onClick: () => void;
        variant?: 'default' | 'destructive';
        confirmMessage?: string;
    }>;
}

export default function BulkActionBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
    actions,
}: BulkActionBarProps) {
    const [selectAllChecked, setSelectAllChecked] = useState(false);

    const handleSelectAllChange = (checked: boolean) => {
        setSelectAllChecked(checked);
        onSelectAll(checked);
    };

    const handleActionClick = (action: any) => {
        if (action.confirmMessage) {
            if (window.confirm(action.confirmMessage)) {
                action.onClick();
            }
        } else {
            action.onClick();
        }
    };

    if (selectedCount === 0) {
        return (
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <Checkbox
                    checked={selectAllChecked}
                    onCheckedChange={handleSelectAllChange}
                    id="select-all"
                />
                <label htmlFor="select-all" className="text-sm text-slate-600 cursor-pointer">
                    Select all ({totalCount} items)
                </label>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-4">
                <Checkbox
                    checked={selectAllChecked}
                    onCheckedChange={handleSelectAllChange}
                    id="select-all-active"
                />
                <Badge variant="default" className="bg-blue-600">
                    {selectedCount} Selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={onClearSelection}>
                    Clear Selection
                </Button>
            </div>

            <div className="flex items-center gap-2">
                {actions.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="default">
                                Bulk Actions
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {actions.map((action, idx) => (
                                <DropdownMenuItem
                                    key={idx}
                                    onClick={() => handleActionClick(action)}
                                    className={action.variant === 'destructive' ? 'text-red-600' : ''}
                                >
                                    {action.icon && <span className="mr-2">{action.icon}</span>}
                                    {action.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
