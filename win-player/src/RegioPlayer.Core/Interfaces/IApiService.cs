using RegioPlayer.Core.Models;
using System;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Interfaces;

public interface IApiService
{
    Task<RegisterResponse> RegisterScreenAsync(string uniqueKey, string pairingCode);
    Task<SyncResponse> SyncPlaylistAsync(string screenKey, string? currentVersion = null);
    Task DownloadMediaAsync(string url, string localPath, IProgress<double>? progress = null);
    Task<bool> TestConnectionAsync();
}