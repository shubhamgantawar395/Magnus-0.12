export default function VendorsListPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [readinessScores, setReadinessScores] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const response = await apiClient.get('/vendors');
            const data = response.data.data || response.data || [];
            if (Array.isArray(data)) {
                setVendors(data);
                fetchReadiness();
            } else {
                setVendors([]);
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadiness = async () => {
        try {
            const scores = await vendorAnalyticsService.getAllReadiness();
            const scoreMap: Record<string, any> = {};
            scores.forEach((s: any) => {
                scoreMap[s.vendorId] = s;
            });
            setReadinessScores(scoreMap);
        } catch (err) {
            console.warn('Readiness scores unavailable');
        }
    };

    const filteredVendors = vendors.filter(vendor => {
        const matchesSearch =
            vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
            case 'rejected': return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
            case 'suspended': return 'bg-slate-500/15 text-slate-400 border-white/10';
            default: return 'bg-slate-500/15 text-slate-400 border-white/10';
        }
    };

    const stats = [
        { label: 'Total Partners', value: vendors.length, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Active / Approved', value: vendors.filter(v => v.status === 'approved').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Onboarding', value: vendors.filter(v => v.status === 'pending').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'High Readiness', value: Object.values(readinessScores).filter((s: any) => s.score > 80).length, icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-8 space-y-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Factory className="w-5 h-5 text-blue-500" />
                            <span className="text-blue-400 text-sm font-bold uppercase tracking-widest">Supply Chain Ecosystem</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Vendor <span className="text-blue-500">Master</span></h1>
                        <p className="text-slate-500 mt-2 max-w-lg leading-relaxed font-medium">
                            Manage manufacturing partners, track performance indices, and monitor global supply chain health.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/admin">
                            <Button variant="outline" className="bg-slate-900/50 border-white/5 hover:bg-slate-800 text-slate-300 h-14 rounded-2xl px-6 transition-all">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
                            </Button>
                        </Link>
                        <Link href="/dashboard/vendors/new">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl px-6 shadow-xl shadow-blue-500/20 font-bold transition-all border-t border-blue-400/20">
                                <Plus className="h-5 w-5 mr-2" /> Register Vendor
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 ${s.bg} rounded-xl`}>
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                </div>
                                <Activity className="w-4 h-4 text-slate-800 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <p className="text-3xl font-black text-white tracking-tight">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 transition-colors group-focus-within:text-blue-500" />
                        <Input
                            className="bg-slate-900/50 border-white/5 focus:border-blue-500/50 text-white pl-12 h-14 rounded-2xl placeholder:text-slate-600 transition-all font-medium"
                            placeholder="Identify vendor by name, code, or contact person..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-slate-900/50 border-white/5 rounded-2xl px-6 h-14 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm tracking-wide"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Global (All partners)</option>
                        <option value="approved">Operational / Approved</option>
                        <option value="pending">Onboarding / Pending</option>
                        <option value="rejected">Rejected / Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>

                {/* Vendor Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Synchronizing Registry...</p>
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="py-32 text-center bg-slate-900/20 border-2 border-dashed border-white/5 rounded-3xl">
                        <Building2 className="w-16 h-16 mx-auto mb-6 opacity-10 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-400 mb-2">No manufacturing partners found</h3>
                        <p className="text-slate-600 text-sm max-w-xs mx-auto">Update your telemetry search or register a new partner in the registry.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVendors.map((vendor) => (
                            <Link
                                key={vendor.id}
                                href={`/dashboard/vendors/${vendor.id}`}
                                className="group bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/40 hover:bg-slate-900/80 transition-all duration-300"
                            >
                                <div className="p-8 space-y-8">
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-white/5 shadow-inner">
                                                {vendor.logoUrl ? (
                                                    <img src={vendor.logoUrl} alt={vendor.companyName} className="w-full h-full object-cover rounded-2xl" />
                                                ) : (
                                                    <Building2 className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-black text-white text-lg leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                                    {vendor.companyName}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-600 bg-slate-800 px-2 py-0.5 rounded tracking-widest">{vendor.vendorCode}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusTheme(vendor.status)} shadow-lg`}>
                                                {vendor.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Operational Stats Telemetry */}
                                    {readinessScores[vendor.id] && (
                                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                                <span className="text-slate-500">Readiness Score</span>
                                                <span className={
                                                    readinessScores[vendor.id].score > 80 ? 'text-emerald-400' :
                                                    readinessScores[vendor.id].score > 50 ? 'text-amber-400' : 'text-rose-400'
                                                }>{readinessScores[vendor.id].score}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${
                                                        readinessScores[vendor.id].score > 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                                        readinessScores[vendor.id].score > 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 
                                                        'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                                    }`} 
                                                    style={{ width: `${readinessScores[vendor.id].score}%` }} 
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Intelligence */}
                                    <div className="grid grid-cols-1 gap-3 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                            <User className="w-4 h-4 text-blue-500/50" />
                                            <span className="group-hover:text-slate-200 transition-colors">{vendor.contactPerson || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                            <Phone className="w-4 h-4 text-blue-500/50" />
                                            <span className="group-hover:text-slate-200 transition-colors font-mono">{vendor.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                            <MapPin className="w-4 h-4 text-blue-500/50" />
                                            <span className="truncate group-hover:text-slate-200 transition-colors uppercase tracking-tight">{vendor.city}, {vendor.state}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 flex items-center gap-2 text-[10px] font-black text-blue-500/0 group-hover:text-blue-500 transition-all uppercase tracking-[0.2em] transform translate-y-2 group-hover:translate-y-0">
                                        Analyze Partner <ArrowUpRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function User(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function TrendingUp(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    )
}

function Factory(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2 20V9l9-2 10 2v10" />
            <path d="M9 20v-5h6v5" />
            <path d="M2 12h1v1H2z" />
            <path d="M5 12h1v1H5z" />
            <path d="M2 15h1v1H2z" />
            <path d="M5 15h1v1H5z" />
            <path d="M17 12h1v1h-1z" />
            <path d="M20 12h1v1h-1z" />
            <path d="M17 15h1v1h-1z" />
            <path d="M20 15h1v1h-1z" />
        </svg>
    )
}

function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}

function ArrowUpRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
        </svg>
    )
}

