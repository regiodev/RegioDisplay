using System;
using System.Collections.Generic;

namespace RegioPlayer.Core.Models;

public class Playlist
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PlaylistVersion { get; set; } = string.Empty;
    public List<PlaylistItem> Items { get; set; } = new();
    public int Rotation { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}