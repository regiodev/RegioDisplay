// Cale fișier: src/pages/DashboardPage.jsx

import { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Users, Tv, HardDrive, PlayCircle, Clock, AlertTriangle, Server, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import ScreenStatus from '@/components/ScreenStatus';

function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await apiClient.get('/dashboard/summary');
                setSummary(response.data);
            } catch (err) {
                setError('Nu am putut încărca sumarul. Vă rugăm încercați din nou.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    const formatDuration = (totalSeconds) => {
        if (!totalSeconds || totalSeconds < 0) {
            return { hours: 0, minutes: 0 };
        }
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return { hours, minutes };
    };

    if (loading) {
        return <div className="p-4 md:p-8">Se încarcă datele...</div>;
    }

    if (error) {
        return <div className="p-4 md:p-8 text-red-500">{error}</div>;
    }

    const storagePercentage = summary.storage.quota_mb > 0 ? (summary.storage.used_mb / summary.storage.quota_mb) * 100 : 0;
    const popDuration = formatDuration(summary.proof_of_play_summary.total_playback_time_seconds);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            
            {/* Secțiunea principală de statistici */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ecrane Active</CardTitle>
                        <Tv className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.screens.online} / {summary.screens.total}</div>
                        <p className="text-xs text-muted-foreground">Online / Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stocare Utilizată</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.storage.used_mb} MB</div>
                        <p className="text-xs text-muted-foreground">
                            din {summary.storage.quota_mb} MB utilizați
                        </p>
                        <Progress value={storagePercentage} className="mt-2 h-2" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Redări (7 zile)</CardTitle>
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.proof_of_play_summary.total_playbacks}</div>
                        <p className="text-xs text-muted-foreground">pe {summary.proof_of_play_summary.active_screens_count} ecrane</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Timp Redare (7 zile)</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {popDuration.hours}h {popDuration.minutes}m
                        </div>
                        <p className="text-xs text-muted-foreground">Timp total de conținut redat</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secțiunea cu alerte și lista de ecrane */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                            Alerte și Notificări
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {summary.alerts.outdated_players.length > 0 ? (
                            <div>
                                <h3 className="font-semibold">Playere cu versiune învechită:</h3>
                                <p className="text-sm text-muted-foreground">
                                    Versiune curentă: {summary.alerts.latest_player_version}
                                </p>
                                <ul className="list-disc list-inside mt-2 text-sm">
                                    {summary.alerts.outdated_players.map(name => <li key={name}>{name}</li>)}
                                </ul>
                            </div>
                        ) : (
                             <div className="flex items-center text-sm text-green-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                <p>Toate playerele sunt actualizate. Nicio alertă.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Stare Ecrane</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {summary.screens.list.length > 0 ? summary.screens.list.map(screen => (
                                <div key={screen.name} className="flex items-center justify-between">
                                    <p className="font-medium">{screen.name}</p>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-muted-foreground">
                                            {screen.last_seen ? formatDistanceToNow(new Date(screen.last_seen), { addSuffix: true, locale: ro }) : 'Niciodată'}
                                        </span>
                                        <ScreenStatus isOnline={screen.is_online} />
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground">Nu există ecrane de afișat.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
             {/* Secțiunea pentru Admin */}
             {user.is_admin && summary.system && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Server className="h-5 w-5 mr-2" />
                            Sumar Sistem (Admin)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium">Stare Server:</p>
                            <p className="text-muted-foreground">{summary.system.status}</p>
                        </div>
                         <div>
                            <p className="font-medium">Ultima autentificare:</p>
                             <p className="text-muted-foreground">
                                {summary.user.last_login_at ? 
                                format(new Date(summary.user.last_login_at), "d MMMM yyyy, HH:mm", { locale: ro }) : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="font-medium">Server Uptime:</p>
                            <p className="text-muted-foreground">{summary.system.uptime}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default DashboardPage;