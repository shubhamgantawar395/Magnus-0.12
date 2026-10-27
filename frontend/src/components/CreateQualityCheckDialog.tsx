'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { qualityService } from '@/services/quality.service';
import toast from 'react-hot-toast';

interface CreateQualityCheckDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function CreateQualityCheckDialog({ open, onOpenChange, onSuccess }: CreateQualityCheckDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        checkDate: new Date().toISOString().split('T')[0],
        sampleSize: '',
        acceptedQty: '',
        rejectedQty: '',
        reworkQty: '',
        remarks: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                checkDate: formData.checkDate,
                sampleSize: parseInt(formData.sampleSize),
                acceptedQty: parseInt(formData.acceptedQty),
                rejectedQty: parseInt(formData.rejectedQty),
                reworkQty: parseInt(formData.reworkQty),
                remarks: formData.remarks || undefined,
            };

            await qualityService.createQualityCheck(data);
            toast.success('Quality check created successfully');
            onSuccess();
            onOpenChange(false);
            // Reset form
            setFormData({
                checkDate: new Date().toISOString().split('T')[0],
                sampleSize: '',
                acceptedQty: '',
                rejectedQty: '',
                reworkQty: '',
                remarks: '',
            });
        } catch (error: any) {
            console.error('Error creating quality check:', error);
            toast.error(error.response?.data?.message || 'Failed to create quality check');
        } finally {
            setLoading(false);
        }
    };

    const totalQty = (parseInt(formData.acceptedQty) || 0) + (parseInt(formData.rejectedQty) || 0) + (parseInt(formData.reworkQty) || 0);
    const sampleSize = parseInt(formData.sampleSize) || 0;
    const isValid = totalQty === sampleSize;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Quality Check</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="checkDate">Check Date *</Label>
                        <Input
                            id="checkDate"
                            type="date"
                            value={formData.checkDate}
                            onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="sampleSize">Sample Size *</Label>
                        <Input
                            id="sampleSize"
                            type="number"
                            min="1"
                            value={formData.sampleSize}
                            onChange={(e) => setFormData({ ...formData, sampleSize: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="acceptedQty">Accepted *</Label>
                            <Input
                                id="acceptedQty"
                                type="number"
                                min="0"
                                value={formData.acceptedQty}
                                onChange={(e) => setFormData({ ...formData, acceptedQty: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="rejectedQty">Rejected *</Label>
                            <Input
                                id="rejectedQty"
                                type="number"
                                min="0"
                                value={formData.rejectedQty}
                                onChange={(e) => setFormData({ ...formData, rejectedQty: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="reworkQty">Rework *</Label>
                            <Input
                                id="reworkQty"
                                type="number"
                                min="0"
                                value={formData.reworkQty}
                                onChange={(e) => setFormData({ ...formData, reworkQty: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {sampleSize > 0 && (
                        <div className={`text-sm p-2 rounded ${isValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            Total: {totalQty} / {sampleSize}
                            {!isValid && ' (must match sample size)'}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="remarks">Remarks</Label>
                        <textarea
                            id="remarks"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !isValid}>
                            {loading ? 'Creating...' : 'Create Check'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
