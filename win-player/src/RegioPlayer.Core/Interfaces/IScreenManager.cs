using RegioPlayer.Core.Models;
using System;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Interfaces;

public interface IScreenManager
{
    event Action<Playlist>? PlaylistUpdated;
    event Action<int>? RotationChanged;
    event Action<string>? StatusChanged;
    event Action? ScreenDeactivated;

    Screen? CurrentScreen { get; }
    Playlist? CurrentPlaylist { get; }

    Task<bool> InitializeAsync();
    Task<bool> RegisterAsync();
    Task SyncAsync();
    Task StartAsync();
    Task StopAsync();
    Task ClearCurrentScreenAsync();
    Task<string> GenerateUniqueKeyAsync();
    Task<string> GeneratePairingCodeAsync();
}