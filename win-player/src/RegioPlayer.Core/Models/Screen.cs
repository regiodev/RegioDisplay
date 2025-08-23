using System;

namespace RegioPlayer.Core.Models;

public class Screen
{
    public string UniqueKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string PairingCode { get; set; } = string.Empty;
    public int Rotation { get; set; }
    public DateTime RotationUpdatedAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSyncAt { get; set; }
}