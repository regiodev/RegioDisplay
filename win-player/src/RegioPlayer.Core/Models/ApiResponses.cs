using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace RegioPlayer.Core.Models;

public class PlaylistResponse
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("playlist_version")]
    public string PlaylistVersion { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<PlaylistItem> Items { get; set; } = new();

    [JsonPropertyName("rotation")]
    public int Rotation { get; set; }
}

public class RegisterResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("screen_id")]
    public string? ScreenId { get; set; }
}

public class SyncResponse
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<PlaylistItem> Items { get; set; } = new();

    [JsonPropertyName("playlist_version")]
    public string PlaylistVersion { get; set; } = string.Empty;

    [JsonPropertyName("screen_name")]
    public string? ScreenName { get; set; }

    [JsonPropertyName("rotation")]
    public int? Rotation { get; set; }

    // Computed properties for compatibility
    public PlaylistResponse? Playlist => Id > 0 ? new PlaylistResponse 
    { 
        Id = Id, 
        Name = Name, 
        Items = Items, 
        PlaylistVersion = PlaylistVersion,
        Rotation = Rotation ?? 0
    } : null;

    public bool HasUpdates { get; set; } = true;
}