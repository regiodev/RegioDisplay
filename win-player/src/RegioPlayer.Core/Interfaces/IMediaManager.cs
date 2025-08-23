using RegioPlayer.Core.Models;
using System;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Interfaces;

public interface IMediaManager
{
    Task<string> CacheMediaAsync(PlaylistItem item, IProgress<double>? progress = null);
    Task<bool> IsMediaCachedAsync(PlaylistItem item);
    Task CleanupUnusedMediaAsync(Playlist? currentPlaylist = null);
    string GetLocalPath(PlaylistItem item);
    Task<long> GetCacheSizeAsync();
    Task ClearCacheAsync();
}