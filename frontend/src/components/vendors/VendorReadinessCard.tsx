'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReadinessStats {
  score: number;
  grade: string;
  color: 'green' | 'amber' | 'red';
  breakdown: {
    jobScore: number;
    invoiceScore: number;
    qualityScore: number;
    overdueJobs: number;
    totalJobs: number;
    pendingInvoiceChallans: number;
    qualityRejections: number;
  };
}

export const VendorReadinessCard = ({ stats }: { stats: ReadinessStats }) => {
  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'amber': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200';
      case 'red': return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-gray-200';
    }
  };

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: stats.color }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">Vendor Readiness</CardTitle>
        <Badge variant="outline" className={`${getColorClass(stats.color)} border`}>
          Grade {stats.grade}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{stats.score}%</div>
          <div className="text-xs text-muted-foreground">Overall Reliability</div>
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>On-Time Jobs</span>
              <span className="font-medium">{stats.breakdown.jobScore}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div 
                className={`h-full rounded-full ${stats.breakdown.jobScore >= 70 ? 'bg-green-500' : stats.breakdown.jobScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${stats.breakdown.jobScore}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="text-[10px] text-muted-foreground uppercase">Overdue</div>
              <div className={`text-sm font-bold ${stats.breakdown.overdueJobs > 0 ? 'text-red-500' : ''}`}>
                {stats.breakdown.overdueJobs}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="text-[10px] text-muted-foreground uppercase">Pending Inv</div>
              <div className={`text-sm font-bold ${stats.breakdown.pendingInvoiceChallans > 0 ? 'text-orange-500' : ''}`}>
                {stats.breakdown.pendingInvoiceChallans}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
