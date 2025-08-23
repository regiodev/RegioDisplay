using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Managers;

public class MediaManager : IMediaManager
{
    private readonly IApiService _apiService;
    private readonly ILogger<MediaManager> _logger;
    private readonly string _cacheDirectory;
    private readonly double _maxCacheSizeBytes;

    public MediaManager(IApiService apiService, ILogger<MediaManager> logger)
    {
        _apiService = apiService;
        _logger = logger;
        
        var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        _cacheDirectory = Path.Combine(appDataPath, "RegioWindowsPlayer", "Cache");
        
        Directory.CreateDirectory(_cacheDirectory);
        
        // Default 10GB cache limit
        _maxCacheSizeBytes = 10.0 * 1024 * 1024 * 1024;
        
        _logger.LogInformation("Media cache directory: {CacheDirectory}", _cacheDirectory);
    }

    public async Task<string> CacheMediaAsync(PlaylistItem item, IProgress<double>? progress = null)
    {
        if (item.Type == "web/html") 
        {
            return item.Url; // Web content doesn't need caching
        }

        try
        {
            var fileName = GetFileNameFromUrl(item.Url);
            var localPath = Path.Combine(_cacheDirectory, fileName);

            // Check if already cached and valid
            if (await IsMediaCachedAsync(item))
            {
                _logger.LogDebug("Media already cached: {LocalPath}", localPath);
                return localPath;
            }

            // Ensure cache size limit
            await EnforceCacheSizeLimitAsync();

            _logger.LogInformation("Downloading media: {Url} to {LocalPath}", item.Url, localPath);
            
            await _apiService.DownloadMediaAsync(item.Url, localPath, progress);

            // Update item metadata
            item.LocalPath = localPath;
            item.CachedAt = DateTime.UtcNow;
            item.FileSize = new FileInfo(localPath).Length;
            item.Checksum = await CalculateFileChecksumAsync(localPath);

            _logger.LogDebug("Media cached successfully: {LocalPath} ({FileSize} bytes)", localPath, item.FileSize);
            
            return localPath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cache media: {Url}", item.Url);
            throw;
        }
    }

    public async Task<bool> IsMediaCachedAsync(PlaylistItem item)
    {
        if (item.Type == "web/html") return true;

        try
        {
            var localPath = GetLocalPath(item);
            
            if (!File.Exists(localPath)) return false;

            var fileInfo = new FileInfo(localPath);
            
            // Check if file size matches (if we have this info)
            if (item.FileSize.HasValue && fileInfo.Length != item.FileSize.Value)
            {
                _logger.LogDebug("Cached file size mismatch: {LocalPath}", localPath);
                return false;
            }

            // Check checksum if available
            if (!string.IsNullOrEmpty(item.Checksum))
            {
                var currentChecksum = await CalculateFileChecksumAsync(localPath);
                if (currentChecksum != item.Checksum)
                {
                    _logger.LogDebug("Cached file checksum mismatch: {LocalPath}", localPath);
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cached media: {Url}", item.Url);
            return false;
        }
    }

    public async Task CleanupUnusedMediaAsync(Playlist? currentPlaylist = null)
    {
        try
        {
            if (!Directory.Exists(_cacheDirectory)) return;

            var currentUrls = new HashSet<string>();
            if (currentPlaylist?.Items != null)
            {
                foreach (var item in currentPlaylist.Items.Where(i => i.Type != "web/html"))
                {
                    currentUrls.Add(GetFileNameFromUrl(item.Url));
                }
            }

            var cacheFiles = Directory.GetFiles(_cacheDirectory);
            var deletedCount = 0;
            var deletedSize = 0L;

            foreach (var filePath in cacheFiles)
            {
                var fileName = Path.GetFileName(filePath);
                
                if (!currentUrls.Contains(fileName))
                {
                    try
                    {
                        var fileInfo = new FileInfo(filePath);
                        deletedSize += fileInfo.Length;
                        
                        File.Delete(filePath);
                        deletedCount++;
                        
                        _logger.LogDebug("Deleted unused cache file: {FilePath}", filePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete cache file: {FilePath}", filePath);
                    }
                }
            }

            if (deletedCount > 0)
            {
                _logger.LogInformation("Cache cleanup completed: {DeletedCount} files, {DeletedSize} bytes freed", 
                    deletedCount, deletedSize);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during cache cleanup");
        }
    }

    public string GetLocalPath(PlaylistItem item)
    {
        if (item.Type == "web/html") return item.Url;

        if (!string.IsNullOrEmpty(item.LocalPath) && File.Exists(item.LocalPath))
        {
            return item.LocalPath;
        }

        var fileName = GetFileNameFromUrl(item.Url);
        return Path.Combine(_cacheDirectory, fileName);
    }

    public Task<long> GetCacheSizeAsync()
    {
        try
        {
            if (!Directory.Exists(_cacheDirectory)) return Task.FromResult(0L);

            var files = Directory.GetFiles(_cacheDirectory);
            var totalSize = 0L;

            foreach (var file in files)
            {
                var fileInfo = new FileInfo(file);
                totalSize += fileInfo.Length;
            }

            return Task.FromResult(totalSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating cache size");
            return Task.FromResult(0L);
        }
    }

    public Task ClearCacheAsync()
    {
        try
        {
            if (!Directory.Exists(_cacheDirectory)) return Task.CompletedTask;

            var files = Directory.GetFiles(_cacheDirectory);
            var deletedCount = 0;

            foreach (var file in files)
            {
                try
                {
                    File.Delete(file);
                    deletedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete cache file: {FilePath}", file);
                }
            }

            _logger.LogInformation("Cache cleared: {DeletedCount} files deleted", deletedCount);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cache");
            return Task.CompletedTask;
        }
    }

    private async Task EnforceCacheSizeLimitAsync()
    {
        try
        {
            var currentSize = await GetCacheSizeAsync();
            
            if (currentSize <= _maxCacheSizeBytes) return;

            _logger.LogInformation("Cache size limit exceeded: {CurrentSize} bytes, limit: {MaxSize} bytes", 
                currentSize, _maxCacheSizeBytes);

            var files = Directory.GetFiles(_cacheDirectory)
                .Select(f => new FileInfo(f))
                .OrderBy(f => f.LastAccessTime)
                .ToList();

            var targetSize = _maxCacheSizeBytes * 0.8; // Clean to 80% of limit
            var deletedSize = 0L;
            var deletedCount = 0;

            foreach (var file in files)
            {
                if (currentSize - deletedSize <= targetSize) break;

                try
                {
                    deletedSize += file.Length;
                    file.Delete();
                    deletedCount++;
                    
                    _logger.LogDebug("Deleted old cache file: {FilePath}", file.FullName);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete cache file: {FilePath}", file.FullName);
                }
            }

            _logger.LogInformation("Cache cleanup completed: {DeletedCount} files, {DeletedSize} bytes freed", 
                deletedCount, deletedSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enforcing cache size limit");
        }
    }

    private string GetFileNameFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var fileName = Path.GetFileName(uri.LocalPath);
            
            if (string.IsNullOrEmpty(fileName))
            {
                // Generate filename from URL hash if no filename in URL
                var urlHash = CalculateStringHash(url);
                var extension = Path.GetExtension(uri.LocalPath);
                fileName = $"{urlHash}{extension}";
            }

            // Sanitize filename
            var invalidChars = Path.GetInvalidFileNameChars();
            foreach (var invalidChar in invalidChars)
            {
                fileName = fileName.Replace(invalidChar, '_');
            }

            return fileName;
        }
        catch (Exception)
        {
            // Fallback: use URL hash as filename
            var urlHash = CalculateStringHash(url);
            return $"{urlHash}.cache";
        }
    }

    private async Task<string> CalculateFileChecksumAsync(string filePath)
    {
        using var sha256 = SHA256.Create();
        using var stream = File.OpenRead(filePath);
        var hash = await sha256.ComputeHashAsync(stream);
        return Convert.ToBase64String(hash);
    }

    private string CalculateStringHash(string input)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToBase64String(hash)[..8]; // First 8 characters
    }
}