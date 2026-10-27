import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { QualityCheck } from "@/services/quality.service";
import { format } from "date-fns";
import { CheckCircle, XCircle, AlertTriangle, FileText, User, Calendar, Box, Activity } from "lucide-react";

interface QualityCheckDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    check: QualityCheck | null;
}

export default function QualityCheckDetailDialog({
    open,
    onOpenChange,
    check
}: QualityCheckDetailDialogProps) {
    if (!check) return null;

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { label: string; className: string; icon: any }> = {
            passed: { label: 'Passed', className: 'bg-green-100 text-green-800', icon: CheckCircle },
            failed: { label: 'Failed', className: 'bg-red-100 text-red-800', icon: XCircle },
            conditional_pass: { label: 'Conditional Pass', className: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
            pending: { label: 'Pending', className: 'bg-blue-100 text-blue-800', icon: Activity },
        };

        const variant = variants[status] || variants.pending;
        const Icon = variant.icon;

        return (
            <Badge className={`flex items-center gap-1 ${variant.className}`}>
                <Icon className="w-3 h-3" />
                {variant.label}
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between mr-8">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                {check.checkNumber}
                                {getStatusBadge(check.status)}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Quality Inspection Detail View
                            </DialogDescription>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                            <div className="flex items-center justify-end gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(check.checkDate), 'PPP')}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pb-6">
                    <div className="space-y-6">
                        {/* Reference Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-slate-500">Inspector</h4>
                                <div className="flex items-center gap-2 text-slate-900">
                                    <User className="w-4 h-4 text-slate-400" />
                                    {check.inspector?.firstName} {check.inspector?.lastName}
                                </div>
                            </div>

                            {check.challan && (
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-slate-500">Challan Reference</h4>
                                    <div className="flex items-center gap-2 text-slate-900">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        {check.challan.challanNumber}
                                    </div>
                                    <div className="text-xs text-slate-500">{check.challan.vendor?.companyName}</div>
                                </div>
                            )}

                            {check.jobProcess && (
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-slate-500">Job Process</h4>
                                    <div className="flex items-center gap-2 text-slate-900">
                                        <Activity className="w-4 h-4 text-slate-400" />
                                        {check.jobProcess.processName}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {check.jobProcess.challanItem?.partNumber} - {check.jobProcess.challanItem?.partDescription}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Inspection Results */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Box className="w-4 h-4" />
                                Inspection Results
                            </h3>
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div className="bg-white p-3 rounded border shadow-sm">
                                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Sample Size</div>
                                    <div className="text-2xl font-bold text-slate-900">{check.sampleSize}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded border border-green-100 shadow-sm">
                                    <div className="text-xs text-green-600 uppercase font-bold tracking-wider">Accepted</div>
                                    <div className="text-2xl font-bold text-green-700">{check.acceptedQty}</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded border border-red-100 shadow-sm">
                                    <div className="text-xs text-red-600 uppercase font-bold tracking-wider">Rejected</div>
                                    <div className="text-2xl font-bold text-red-700">{check.rejectedQty}</div>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded border border-yellow-100 shadow-sm">
                                    <div className="text-xs text-yellow-600 uppercase font-bold tracking-wider">Rework</div>
                                    <div className="text-2xl font-bold text-yellow-700">{check.reworkQty}</div>
                                </div>
                            </div>
                        </div>

                        {/* Defects Analysis */}
                        {check.defects && Object.keys(check.defects).length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Defects Analysis</h3>
                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Defect Type</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {Object.entries(check.defects).map(([defect, count]) => (
                                                <tr key={defect}>
                                                    <td className="px-4 py-2 text-sm text-slate-700">{defect}</td>
                                                    <td className="px-4 py-2 text-sm text-slate-700 text-right">{count as number}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Remarks */}
                        {check.remarks && (
                            <div>
                                <h3 className="font-semibold mb-2">Remarks</h3>
                                <div className="p-3 bg-slate-50 rounded border text-sm text-slate-700 whitespace-pre-wrap">
                                    {check.remarks}
                                </div>
                            </div>
                        )}

                        {/* Attachments (Placeholder) */}
                        {check.attachments && check.attachments.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Attachments</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {check.attachments.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={typeof url === 'string' ? url : '#'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block p-2 border rounded hover:bg-slate-50 text-center text-sm truncate text-blue-600"
                                        >
                                            Attachment {idx + 1}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
