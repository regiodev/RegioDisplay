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
import { Users, Play, Clock } from 'lucide-react';

const formatSeconds = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

const COLORS = ['#1181da', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Funcție ajutătoare pentru a formata o dată în format YYYY-MM-DD
const formatDateForInput = (date) => date.toISOString().split('T')[0];

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
            } catch (error) {
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
        } catch (error) {
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
        <div className="p-4 md:p-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Rapoarte Proof of Play</h1>
            
            <Card>
                <CardHeader><CardTitle>Filtre Raport</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="start-date">Data de început</Label>
                            <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date">Data de sfârșit</Label>
                            <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Ecran (opțional)</Label>
                            <Select onValueChange={setSelectedScreen} defaultValue="all"><SelectTrigger><SelectValue placeholder="Toate ecranele" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Toate ecranele</SelectItem>
                                    {screens.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeline-limit">Evenimente Timeline</Label>
                            <Input id="timeline-limit" type="number" value={timelineLimit} onChange={e => setTimelineLimit(parseInt(e.target.value, 10))} />
                        </div>
                    </div>
                     <div className="flex justify-end mt-4">
                        <Button onClick={handleGenerateReport} disabled={loading}>
                            {loading ? 'Se generează...' : 'Generează Raport'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            {loading && <div className="text-center p-8">Se încarcă raportul...</div>}

            {reportData && (
                <div className="space-y-4">
                    {/* STATISTICI SUMARE */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                       <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Redări</CardTitle><Play className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{reportData.total_playbacks}</div></CardContent></Card>
                       <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Timp Total Redare</CardTitle><Clock className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatSeconds(reportData.total_playback_time_seconds)}</div></CardContent></Card>
                       <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Ecrane Active</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{reportData.active_screens_count}</div></CardContent></Card>
                    </div>

                    {/* GRAFICE */}
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
                        <Card className="lg:col-span-3">
                            <CardHeader><CardTitle>Redări pe Oră</CardTitle></CardHeader>
                            <CardContent className="h-[300px] w-full"><ResponsiveContainer>
                                <BarChart data={hourlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" fill="#1181da" name="Număr redări" /></BarChart>
                            </ResponsiveContainer></CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Distribuție pe Ecrane</CardTitle></CardHeader>
                            <CardContent className="h-[300px] w-full"><ResponsiveContainer>
                                <PieChart><Tooltip /><Pie data={reportData.playbacks_by_screen} dataKey="count" nameKey="screen_name" cx="50%" cy="50%" outerRadius={80} label>
                                    {reportData.playbacks_by_screen.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie></PieChart>
                            </ResponsiveContainer></CardContent>
                        </Card>
                    </div>

                    {/* TIMELINE */}
                    <Card>
                        <CardHeader><CardTitle>Timeline Redări ({reportData.timeline.length} evenimente)</CardTitle></CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="min-w-full text-sm responsive-table">
                                <thead className="bg-muted"><tr><th className="p-2 text-left">Ora</th><th className="p-2 text-left">Fișier Media</th><th className="p-2 text-left">Ecran</th><th className="p-2 text-left">Durată</th></tr></thead>
                                <tbody>{reportData.timeline.map((item, index) => (
                                    <tr key={index} className="border-b"><td data-label="Ora" className="p-2">{new Date(item.played_at).toLocaleTimeString('ro-RO')}</td><td data-label="Fișier" className="p-2">{item.media_filename}</td><td data-label="Ecran" className="p-2">{item.screen_name}</td><td data-label="Durată" className="p-2">{item.duration_seconds}s</td></tr>
                                ))}</tbody>
                            </table>
                            {reportData.timeline.length === 0 && <p className="text-center text-muted-foreground py-4">Niciun eveniment de afișat în timeline pentru perioada selectată.</p>}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default ReportsPage;