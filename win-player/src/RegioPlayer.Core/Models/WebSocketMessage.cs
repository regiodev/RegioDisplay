using System.Text.Json.Serialization;

namespace RegioPlayer.Core.Models;

public class WebSocketMessage
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public string? Version { get; set; }

    [JsonPropertyName("resolution")]
    public string? Resolution { get; set; }

    [JsonPropertyName("data")]
    public object? Data { get; set; }
}

public class DeviceInfoMessage : WebSocketMessage
{
    public DeviceInfoMessage()
    {
        Type = "device_info";
    }
}