using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Common;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace RegioPlayer.UI.ViewModels;

public class PlayerViewModel : ViewModelBase
{
    private readonly IMediaManager _mediaManager;
    private readonly ILogger<PlayerViewModel> _logger;
    
    private Timer? _playbackTimer;
    private PlaylistItem? _currentItem;
    private int _currentIndex;
    private Playlist? _playlist;
    private string? _currentMediaSource;
    private string? _currentMediaType;
    private double _cacheProgress;
    private bool _showCacheProgress;

    public PlayerViewModel(IMediaManager mediaManager, ILogger<PlayerViewModel> logger)
    {
        _mediaManager = mediaManager;
        _logger = logger;
    }

    public string? CurrentMediaSource
    {
        get => _currentMediaSource;
        set => SetProperty(ref _currentMediaSource, value);
    }

    public string? CurrentMediaType
    {
        get => _currentMediaType;
        set => SetProperty(ref _currentMediaType, value);
    }

    public double CacheProgress
    {
        get => _cacheProgress;
        set => SetProperty(ref _cacheProgress, value);
    }

    public bool ShowCacheProgress
    {
        get => _showCacheProgress;
        set => SetProperty(ref _showCacheProgress, value);
    }

    public PlaylistItem? CurrentItem
    {
        get => _currentItem;
        private set => SetProperty(ref _currentItem, value);
    }

    public bool IsVideoContent => CurrentMediaType?.StartsWith("video") == true;
    public bool IsImageContent => CurrentMediaType?.StartsWith("image") == true;
    public bool IsWebContent => CurrentMediaType == "web/html";

    public async Task LoadPlaylistAsync(Playlist playlist)
    {
        try
        {
            _playlist = playlist;
            _currentIndex = 0;

            _logger.LogInformation("Loading playlist: {PlaylistName} with {ItemCount} items", 
                playlist.Name, playlist.Items.Count);

            // Show cache progress during pre-caching
            ShowCacheProgress = true;
            
            // Pre-cache media files
            await PreCacheMediaAsync(playlist);
            
            // Hide cache progress when done
            ShowCacheProgress = false;

            // Start playback
            await PlayNextItemAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load playlist");
            throw;
        }
    }

    private async Task PreCacheMediaAsync(Playlist playlist)
    {
        try
        {
            var mediaItems = playlist.Items.FindAll(item => item.Type != "web/html");
            var totalItems = mediaItems.Count;
            var cachedItems = 0;

            _logger.LogInformation("Pre-caching {TotalItems} media files", totalItems);

            var cacheProgress = new Progress<double>(progress =>
            {
                var overallProgress = (cachedItems * 100.0 + progress) / totalItems;
                CacheProgress = overallProgress;
            });

            foreach (var item in mediaItems)
            {
                try
                {
                    await _mediaManager.CacheMediaAsync(item, cacheProgress);
                    cachedItems++;
                    CacheProgress = (cachedItems * 100.0) / totalItems;
                    
                    _logger.LogDebug("Cached media file {CachedItems}/{TotalItems}: {Url}", 
                        cachedItems, totalItems, item.Url);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cache media item: {Url}", item.Url);
                }
            }

            CacheProgress = 100.0;
            _logger.LogInformation("Pre-caching completed: {CachedItems}/{TotalItems} files", 
                cachedItems, totalItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during media pre-caching");
        }
    }

    private async Task PlayNextItemAsync()
    {
        try
        {
            if (_playlist?.Items?.Count > 0)
            {
                CurrentItem = _playlist.Items[_currentIndex];
                
                _logger.LogDebug("Playing item {Index}/{Total}: {Url} (Duration: {Duration}s)", 
                    _currentIndex + 1, _playlist.Items.Count, CurrentItem.Url, CurrentItem.Duration);

                // Get media source
                if (CurrentItem.Type == "web/html")
                {
                    CurrentMediaSource = CurrentItem.Url;
                }
                else
                {
                    CurrentMediaSource = await _mediaManager.CacheMediaAsync(CurrentItem);
                }

                CurrentMediaType = CurrentItem.Type;

                // Log playback start
                await LogPlaybackEventAsync("START");

                // Setup timer for next item
                var duration = Math.Max(CurrentItem.Duration, 1) * 1000; // Ensure minimum 1 second
                _playbackTimer?.Dispose();
                _playbackTimer = new Timer(OnPlaybackTimer, null, duration, Timeout.Infinite);

                // Move to next index
                _currentIndex = (_currentIndex + 1) % _playlist.Items.Count;

                // Notify property changes for UI binding
                OnPropertyChanged(nameof(IsVideoContent));
                OnPropertyChanged(nameof(IsImageContent));
                OnPropertyChanged(nameof(IsWebContent));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error playing next item");
            
            // Try to recover by moving to next item
            await Task.Delay(1000);
            await PlayNextItemAsync();
        }
    }

    private async void OnPlaybackTimer(object? state)
    {
        try
        {
            // Log playback end
            await LogPlaybackEventAsync("END");

            // Switch to next item
            await PlayNextItemAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in playback timer");
        }
    }

    private async Task LogPlaybackEventAsync(string eventType)
    {
        try
        {
            if (CurrentItem != null)
            {
                _logger.LogInformation("Playback {EventType}: {Url} at {Timestamp}", 
                    eventType, CurrentItem.Url, DateTime.UtcNow);

                // Here we could implement more sophisticated logging
                // that stores playback statistics locally and syncs with server
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log playback event");
        }
    }

    public async Task StopPlaybackAsync()
    {
        try
        {
            _playbackTimer?.Dispose();
            _playbackTimer = null;

            if (CurrentItem != null)
            {
                await LogPlaybackEventAsync("STOP");
            }

            CurrentMediaSource = null;
            CurrentMediaType = null;
            CurrentItem = null;

            _logger.LogInformation("Playback stopped");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping playback");
        }
    }

    public async Task SkipToNextAsync()
    {
        try
        {
            _logger.LogInformation("Manually skipping to next item");
            
            _playbackTimer?.Dispose();
            await LogPlaybackEventAsync("SKIP");
            await PlayNextItemAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error skipping to next item");
        }
    }

    public async Task RestartPlaylistAsync()
    {
        try
        {
            _logger.LogInformation("Restarting playlist from beginning");
            
            _currentIndex = 0;
            await PlayNextItemAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting playlist");
        }
    }

    protected override void OnPropertyChanged(string? propertyName = null)
    {
        base.OnPropertyChanged(propertyName);
        
        // Additional logging for debugging
        if (propertyName == nameof(CurrentMediaSource))
        {
            _logger.LogDebug("Current media source changed: {Source}", CurrentMediaSource);
        }
    }

    public void Dispose()
    {
        _playbackTimer?.Dispose();
    }
}