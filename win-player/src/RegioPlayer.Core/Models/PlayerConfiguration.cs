namespace RegioPlayer.Core.Models;

public class PlayerConfiguration
{
    public string ApiBaseUrl { get; set; } = "https://display.regio-cloud.ro/api";
    public string WebSocketUrl { get; set; } = "wss://display.regio-cloud.ro/api/ws";
    public bool EnableLogging { get; set; } = true;
    public string LogLevel { get; set; } = "Information";
    public bool EnableKioskMode { get; set; } = true;
    public int SyncIntervalSeconds { get; set; } = 30;
    public int KeepAliveIntervalSeconds { get; set; } = 15;
    public double MediaCacheMaxSizeGB { get; set; } = 10.0;
    public bool EnableHardwareAcceleration { get; set; } = true;
    public int MaxRetryAttempts { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 5;
}