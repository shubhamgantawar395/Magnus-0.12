'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceTrendChartProps {
    data: any[];
}

export default function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
    return (
        <Card className="col-span-1 bg-slate-900/50 backdrop-blur-xl border border-slate-800">
            <CardHeader>
                <CardTitle className="text-white">Vendor Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="quality" name="Quality Score" stroke="#10b981" strokeWidth={2} />
                            <Line type="monotone" dataKey="delivery" name="Delivery" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="cost" name="Cost Efficiency" stroke="#f59e0b" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
