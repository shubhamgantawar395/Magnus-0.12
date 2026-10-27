'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executiveService } from '@/services/executive.service';
import { Activity, AlertTriangle, Clock, TrendingUp, Users, ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PerformanceTrendChart from '@/components/PerformanceTrendChart'; // Reusing existing chart
import toast from 'react-hot-toast';

export default function WarRoomPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWarRoom = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await executiveService.getWarRoom();
      setData(res);
    } catch (err) {
      toast.error('Failed to load War Room pulse');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWarRoom();
    const interval = setInterval(() => fetchWarRoom(), 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || { openChallans: 0, overdueChallans: 0, pendingPOs: 0 };
  const topOverdue = data?.topOverdueVendors || [];

  return (
    <div className="p-6 space-y-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-indigo-500" />
            Operations War Room
          </h1>
          <p className="text-slate-400">Live Pulse · Automatic refresh every 30 seconds</p>
        </div>
        <button 
          onClick={() => fetchWarRoom(true)} 
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Sync Pulse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Open Challans</CardTitle>
            <Activity className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{kpis.openChallans}</div>
            <p className="text-xs text-slate-500 mt-1">Material currently at vendors</p>
          </CardContent>
        </Card>

        <Card className={`bg-slate-900 border-slate-800 ${kpis.overdueChallans > 0 ? 'border-red-900/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Critical Overdue</CardTitle>
            <AlertTriangle className={`w-4 h-4 ${kpis.overdueChallans > 0 ? 'text-red-500' : 'text-slate-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${kpis.overdueChallans > 0 ? 'text-red-500' : 'text-white'}`}>
              {kpis.overdueChallans}
            </div>
            <p className="text-xs text-slate-500 mt-1">&gt;7 days aging at vendor</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-400">{kpis.pendingPOs}</div>
            <p className="text-xs text-slate-500 mt-1">POs awaiting director sign-off</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-900 border-slate-800 col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              7-Day Dispatch Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {/* Mocking for now if data is empty, but we'll try to use data.dispatchVolume */}
            <PerformanceTrendChart /> 
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-red-400" />
              Bottleneck Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOverdue.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No overdue challans detected</div>
            ) : (
              <div className="space-y-4">
                {topOverdue.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 group hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold">
                        {v.companyName?.[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-red-400 transition-colors">{v.companyName}</h4>
                        <p className="text-xs text-slate-500">{v.vendorCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                        {v.overdueChallans} OVERDUE
                      </Badge>
                      <button className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-white mt-1 ml-auto">
                        Details <ArrowUpRight className="w-2 h-2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
