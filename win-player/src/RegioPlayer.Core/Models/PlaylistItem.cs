using System;

namespace RegioPlayer.Core.Models;

public class PlaylistItem
{
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Duration { get; set; }
    public int? WebRefreshInterval { get; set; }
    public string? LocalPath { get; set; }
    public DateTime? CachedAt { get; set; }
    public long? FileSize { get; set; }
    public string? Checksum { get; set; }
}