// Cale fișier: src/pages/ReportsPage.jsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Play, Clock, BarChart3, Calendar, Filter, Loader2, FileBarChart, Monitor, TrendingUp } from 'lucide-react';

const formatSeconds = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

const COLORS = ['#1181da', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Funcție ajutătoare pentru a formata o dată în format YYYY-MM-DD
const formatDateForInput = (date) => date.toISOString().split('T')[0];

// Funcție pentru a formata data și ora în format YYYY.MM.DD HH:mm:ss
const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

function ReportsPage() {
    const { toast } = useToast();
    
    // Inițializăm starea pentru date cu ultimele 7 zile
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(formatDateForInput(sevenDaysAgo));
    const [endDate, setEndDate] = useState(formatDateForInput(today));
    
    const [screens, setScreens] = useState([]);
    const [selectedScreen, setSelectedScreen] = useState(null);
    const [timelineLimit, setTimelineLimit] = useState(50); // Stare nouă pentru limită

    const [loading, setLoading] = useState(true); // Începe cu loading true pentru generarea automată
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const screensRes = await apiClient.get('/screens/');
                setScreens(screensRes.data);
            } catch {
                toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca filtrele." });
            }
        };
        fetchFilters();
    }, [toast]);

    const handleGenerateReport = useCallback(async () => {
        setLoading(true);
        setReportData(null);
        try {
            const params = {
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
                screen_id: selectedScreen,
                limit: timelineLimit // Folosim starea nouă aici
            };
            const response = await apiClient.get('/reports/proof-of-play', { params });
            setReportData(response.data);
        } catch {
            toast({ variant: "destructive", title: "Eroare", description: "Nu s-a putut genera raportul." });
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedScreen, timelineLimit, toast]);
    
    // Generare automată la încărcarea paginii
    useEffect(() => {
        handleGenerateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Se rulează o singură dată la montarea componentei

    const hourlyData = useMemo(() => {
        if (!reportData?.playbacks_by_hour) return [];
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
        reportData.playbacks_by_hour.forEach(item => {
            if (hours[item.hour]) {
                hours[item.hour].count = item.count;
            }
        });
        return hours;
    }, [reportData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
                {/* Header îmbunătățit */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <BarChart3 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Rapoarte Proof of Play</h1>
                            <p className="text-muted-foreground">
                                Analize detaliate asupra performanței și utilizării ecranelor
                            </p>
                        </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-medium">Analytics</span>
                        </div>
                    </div>
                </div>
                
                {/* Filtere Raport */}
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                                <Filter className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            Filtre Raport
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                                        <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <Label htmlFor="start-date" className="text-sm font-medium">Data de început</Label>
                                </div>
                                <Input 
                                    id="start-date" 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
                                        <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <Label htmlFor="end-date" className="text-sm font-medium">Data de sfârșit</Label>
                                </div>
                                <Input 
                                    id="end-date" 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                                        <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <Label className="text-sm font-medium">Ecran (opțional)</Label>
                                </div>
                                <Select onValueChange={setSelectedScreen} defaultValue="all">
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Toate ecranele" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toate ecranele</SelectItem>
                                        {screens.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                                        <FileBarChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <Label htmlFor="timeline-limit" className="text-sm font-medium">Evenimente Timeline</Label>
                                </div>
                                <Input 
                                    id="timeline-limit" 
                                    type="number" 
                                    value={timelineLimit} 
                                    onChange={e => setTimelineLimit(parseInt(e.target.value, 10))}
                                    className="h-12"
                                    min="1"
                                    max="1000"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleGenerateReport} disabled={loading} size="lg">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Se generează...
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="mr-2 h-4 w-4" />
                                        Generează Raport
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Loading State */}
                {loading && (
                    <Card className="shadow-sm">
                        <CardContent className="flex items-center justify-center p-12">
                            <div className="flex items-center space-x-3 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Se încarcă raportul...</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {reportData && (
                    <div className="space-y-8">
                        {/* Statistici sumare */}
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Redări</CardTitle>
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.total_playbacks}</div>
                                    <p className="text-xs text-muted-foreground">redări în perioada selectată</p>
                                </CardContent>
                            </Card>
                            
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Timp Total Redare</CardTitle>
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatSeconds(reportData.total_playback_time_seconds)}</div>
                                    <p className="text-xs text-muted-foreground">timp cumulat de redare</p>
                                </CardContent>
                            </Card>
                            
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Ecrane Active</CardTitle>
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.active_screens_count}</div>
                                    <p className="text-xs text-muted-foreground">ecrane cu activitate</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Grafice */}
                        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
                            <Card className="lg:col-span-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                                            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        Redări pe Oră
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[350px] w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={hourlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                            <XAxis dataKey="hour" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="count" fill="#1181da" name="Număr redări" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            
                            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                                            <Monitor className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        Distribuție pe Ecrane
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[350px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Tooltip />
                                            <Pie 
                                                data={reportData.playbacks_by_screen} 
                                                dataKey="count" 
                                                nameKey="screen_name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={100}
                                                label
                                            >
                                                {reportData.playbacks_by_screen.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Timeline */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                                            <FileBarChart className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        Timeline Redări
                                    </div>
                                    <div className="flex items-center space-x-2 px-3 py-1 bg-muted/50 rounded-lg">
                                        <span className="text-sm font-medium">{reportData.timeline.length} evenimente</span>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {reportData.timeline.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left font-semibold">Timestamp</th>
                                                    <th className="px-6 py-3 text-left font-semibold">Fișier Media</th>
                                                    <th className="px-6 py-3 text-left font-semibold">Ecran</th>
                                                    <th className="px-6 py-3 text-left font-semibold">Durată</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {reportData.timeline.map((item, index) => (
                                                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-mono">
                                                            {formatDateTime(item.played_at)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                                                                    <Play className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <span className="font-medium">{item.media_filename}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                                                                    <Monitor className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                                                </div>
                                                                <span>{item.screen_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-2">
                                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                                <span className="font-mono">{item.duration_seconds}s</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="p-4 bg-muted/50 rounded-full mx-auto mb-4 w-fit">
                                            <FileBarChart className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">Niciun eveniment găsit</h3>
                                        <p className="text-muted-foreground">
                                            Nu există evenimente de redare în perioada selectată.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReportsPage;