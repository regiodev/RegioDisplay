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
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
                <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
                    <Card className="shadow-sm">
                        <CardContent className="flex items-center justify-center p-12">
                            <div className="flex items-center space-x-3 text-muted-foreground">
                                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                                <span>Se încarcă datele...</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
                <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
                    <Card className="shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Eroare de încărcare</h3>
                            <p className="text-muted-foreground text-center">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const storagePercentage = summary.storage.quota_mb > 0 ? (summary.storage.used_mb / summary.storage.quota_mb) * 100 : 0;
    const popDuration = formatDuration(summary.proof_of_play_summary.total_playback_time_seconds);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
                {/* Header îmbunătățit */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <Server className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                            <p className="text-muted-foreground">
                                Monitorizați performanța și starea sistemului în timp real
                            </p>
                        </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">Sistem Activ</span>
                        </div>
                    </div>
                </div>
            
                {/* Secțiunea principală de statistici */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ecrane Active</CardTitle>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Tv className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.screens.online} / {summary.screens.total}</div>
                            <p className="text-xs text-muted-foreground">Online / Total</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stocare Utilizată</CardTitle>
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <HardDrive className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.storage.used_mb} MB</div>
                            <p className="text-xs text-muted-foreground">
                                din {summary.storage.quota_mb} MB utilizați
                            </p>
                            <Progress value={storagePercentage} className="mt-2 h-2" />
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Redări (7 zile)</CardTitle>
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <PlayCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.proof_of_play_summary.total_playbacks}</div>
                            <p className="text-xs text-muted-foreground">pe {summary.proof_of_play_summary.active_screens_count} ecrane</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Timp Redare (7 zile)</CardTitle>
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
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
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                Alerte și Notificări
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {summary.alerts.outdated_players.length > 0 ? (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                                        Playere cu versiune învechită:
                                    </h3>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        Versiune curentă: {summary.alerts.latest_player_version}
                                    </p>
                                    <ul className="list-disc list-inside mt-2 text-sm text-yellow-800 dark:text-yellow-200">
                                        {summary.alerts.outdated_players.map(name => <li key={name}>{name}</li>)}
                                    </ul>
                                </div>
                            ) : (
                                <div className="flex items-center text-sm p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                                    <p className="text-green-800 dark:text-green-200">
                                        Toate playerele sunt actualizate. Nicio alertă.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                                    <Tv className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                Stare Ecrane
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {summary.screens.list.length > 0 ? summary.screens.list.map(screen => (
                                    <div key={screen.name} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                                                <Tv className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <p className="font-medium">{screen.name}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-muted-foreground">
                                                {screen.last_seen ? formatDistanceToNow(new Date(screen.last_seen), { addSuffix: true, locale: ro }) : 'Niciodată'}
                                            </span>
                                            <ScreenStatus isOnline={screen.is_online} />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <div className="p-4 bg-muted/50 rounded-full mx-auto mb-4 w-fit">
                                            <Tv className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">Nu există ecrane de afișat.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* Secțiunea pentru Admin */}
                {user.is_admin && summary.system && (
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                                    <Server className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                Sumar Sistem (Admin)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                            <div className="p-4 bg-muted/20 rounded-lg">
                                <p className="font-medium text-muted-foreground mb-1">Stare Server</p>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <p className="font-semibold">{summary.system.status}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg">
                                <p className="font-medium text-muted-foreground mb-1">Ultima autentificare</p>
                                <p className="font-semibold">
                                    {summary.user.last_login_at ? 
                                    format(new Date(summary.user.last_login_at), "d MMMM yyyy, HH:mm", { locale: ro }) : 'N/A'}
                                </p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg">
                                <p className="font-medium text-muted-foreground mb-1">Server Uptime</p>
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-semibold">{summary.system.uptime}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default DashboardPage;