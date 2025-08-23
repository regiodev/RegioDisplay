using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Managers;

public class ScreenManager : IScreenManager
{
    private readonly IApiService _apiService;
    private readonly IWebSocketService _webSocketService;
    private readonly IStorageService _storageService;
    private readonly IMediaManager _mediaManager;
    private readonly ILogger<ScreenManager> _logger;
    
    private Timer? _syncTimer;
    private CancellationTokenSource? _cancellationTokenSource;
    
    public event Action<Playlist>? PlaylistUpdated;
    public event Action<int>? RotationChanged;
    public event Action<string>? StatusChanged;
    public event Action? ScreenDeactivated;

    public Screen? CurrentScreen { get; private set; }
    public Playlist? CurrentPlaylist { get; private set; }

    public ScreenManager(
        IApiService apiService,
        IWebSocketService webSocketService,
        IStorageService storageService,
        IMediaManager mediaManager,
        ILogger<ScreenManager> logger)
    {
        _apiService = apiService;
        _webSocketService = webSocketService;
        _storageService = storageService;
        _mediaManager = mediaManager;
        _logger = logger;

        // Subscribe to WebSocket events
        _webSocketService.MessageReceived += OnWebSocketMessageReceived;
        _webSocketService.Connected += OnWebSocketConnected;
        _webSocketService.Disconnected += OnWebSocketDisconnected;
    }

    public async Task<bool> InitializeAsync()
    {
        try
        {
            StatusChanged?.Invoke("Initializing...");
            
            await _storageService.InitializeDatabaseAsync();
            
            CurrentScreen = await _storageService.GetScreenAsync();
            CurrentPlaylist = await _storageService.GetPlaylistAsync();
            
            _logger.LogInformation("Screen manager initialized. Screen: {HasScreen}, Playlist: {HasPlaylist}", 
                CurrentScreen != null, CurrentPlaylist != null);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize screen manager");
            StatusChanged?.Invoke("Initialization failed");
            return false;
        }
    }

    public async Task<bool> RegisterAsync()
    {
        try
        {
            StatusChanged?.Invoke("Registering screen...");
            
            if (CurrentScreen == null)
            {
                CurrentScreen = new Screen
                {
                    UniqueKey = await GenerateUniqueKeyAsync(),
                    PairingCode = await GeneratePairingCodeAsync(),
                    CreatedAt = DateTime.UtcNow
                };
                
                await _storageService.SaveScreenAsync(CurrentScreen);
                _logger.LogInformation("Created new screen with key: {UniqueKey}", CurrentScreen.UniqueKey);
            }

            var result = await _apiService.RegisterScreenAsync(CurrentScreen.UniqueKey, CurrentScreen.PairingCode);
            
            if (result.Success)
            {
                CurrentScreen.IsActive = true;
                CurrentScreen.LastSyncAt = DateTime.UtcNow;
                await _storageService.SaveScreenAsync(CurrentScreen);
                
                StatusChanged?.Invoke("Screen registered successfully");
                _logger.LogInformation("Screen registered successfully");
                
                return true;
            }
            else
            {
                StatusChanged?.Invoke($"Registration failed: {result.Message}");
                _logger.LogWarning("Screen registration failed: {Message}", result.Message);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during screen registration");
            StatusChanged?.Invoke("Registration error");
            return false;
        }
    }

    public async Task SyncAsync()
    {
        if (CurrentScreen == null)
        {
            _logger.LogWarning("Cannot sync - no current screen");
            return;
        }

        try
        {
            StatusChanged?.Invoke("Syncing playlist...");
            
            var currentVersion = CurrentPlaylist?.PlaylistVersion;
            _logger.LogInformation("=== SYNC DEBUG === Starting sync for screen: {UniqueKey}, current version: {Version}", CurrentScreen.UniqueKey, currentVersion);
            
            var syncResult = await _apiService.SyncPlaylistAsync(CurrentScreen.UniqueKey, currentVersion);
            
            _logger.LogInformation("=== SYNC DEBUG === Received response - HasUpdates: {HasUpdates}", syncResult.HasUpdates);
            _logger.LogInformation("=== SYNC DEBUG === Direct Name: '{Name}', Version: '{Version}', ID: {Id}", 
                syncResult.Name, syncResult.PlaylistVersion, syncResult.Id);

            // Check if screen is not active on server (backend returns "Ecran Neactivat")
            if (syncResult.Name == "Ecran Neactivat" || syncResult.PlaylistVersion == "none" || 
                syncResult.Name == "Niciun Playlist Asignat")
            {
                _logger.LogWarning("=== SYNC DEBUG === SCREEN NOT ACTIVE DETECTED! Server reports screen is not active - marking local screen as inactive");
                if (CurrentScreen != null)
                {
                    _logger.LogWarning("=== SYNC DEBUG === Setting CurrentScreen.IsActive = false and saving to storage");
                    CurrentScreen.IsActive = false;
                    await _storageService.SaveScreenAsync(CurrentScreen);
                }
                StatusChanged?.Invoke("Screen not paired - please re-pair");
                _logger.LogWarning("=== SYNC DEBUG === Triggering ScreenDeactivated event");
                ScreenDeactivated?.Invoke();
                return;
            }

            if (syncResult.HasUpdates && syncResult.Playlist != null)
            {
                _logger.LogInformation("Playlist updates available. Version: {Version}", syncResult.Playlist.PlaylistVersion);
                
                // Convert API response to internal model
                var newPlaylist = new Playlist
                {
                    Id = syncResult.Playlist.Id,
                    Name = syncResult.Playlist.Name,
                    PlaylistVersion = syncResult.Playlist.PlaylistVersion,
                    Items = syncResult.Playlist.Items,
                    Rotation = syncResult.Playlist.Rotation,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Pre-cache media files
                await PreCachePlaylistMediaAsync(newPlaylist);
                
                // Update current playlist
                CurrentPlaylist = newPlaylist;
                await _storageService.SavePlaylistAsync(CurrentPlaylist);
                
                PlaylistUpdated?.Invoke(CurrentPlaylist);
                StatusChanged?.Invoke("Playlist updated");
                
                // Check for rotation changes
                if (syncResult.Rotation.HasValue && syncResult.Rotation.Value != CurrentScreen.Rotation)
                {
                    CurrentScreen.Rotation = syncResult.Rotation.Value;
                    CurrentScreen.RotationUpdatedAt = DateTime.UtcNow;
                    await _storageService.SaveScreenAsync(CurrentScreen);
                    
                    RotationChanged?.Invoke(syncResult.Rotation.Value);
                    _logger.LogInformation("Screen rotation changed to: {Rotation}°", syncResult.Rotation.Value);
                }
                
                // Clean up unused media
                await _mediaManager.CleanupUnusedMediaAsync(CurrentPlaylist);
            }
            else
            {
                _logger.LogDebug("No playlist updates available");
                StatusChanged?.Invoke("Playlist up to date");
            }

            CurrentScreen.LastSyncAt = DateTime.UtcNow;
            await _storageService.SaveScreenAsync(CurrentScreen);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during playlist sync");
            StatusChanged?.Invoke("Sync error");
        }
    }

    public async Task StartAsync()
    {
        if (CurrentScreen == null)
        {
            _logger.LogWarning("Cannot start - no current screen");
            return;
        }

        try
        {
            _cancellationTokenSource = new CancellationTokenSource();
            
            // Connect to WebSocket
            await ConnectWebSocketAsync();
            
            // Start periodic sync
            _syncTimer = new Timer(async _ => await SyncAsync(), null, 
                TimeSpan.Zero, TimeSpan.FromSeconds(30));
            
            StatusChanged?.Invoke("Screen manager started");
            _logger.LogInformation("Screen manager started");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start screen manager");
            StatusChanged?.Invoke("Start failed");
        }
    }

    public async Task StopAsync()
    {
        try
        {
            _cancellationTokenSource?.Cancel();
            _syncTimer?.Dispose();
            
            await _webSocketService.DisconnectAsync();
            
            StatusChanged?.Invoke("Screen manager stopped");
            _logger.LogInformation("Screen manager stopped");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping screen manager");
        }
    }

    public Task<string> GenerateUniqueKeyAsync()
    {
        var key = Guid.NewGuid().ToString("N")[..16].ToUpperInvariant();
        return Task.FromResult(key);
    }

    public Task<string> GeneratePairingCodeAsync()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        var code = new string(Enumerable.Repeat(chars, 6)
            .Select(s => s[random.Next(s.Length)]).ToArray());
        return Task.FromResult(code);
    }

    private async Task ConnectWebSocketAsync()
    {
        if (CurrentScreen == null) return;

        try
        {
            var resolution = "1920x1080"; // Default resolution, will be updated by UI layer
            await _webSocketService.ConnectAsync(CurrentScreen.UniqueKey, "1.0.0", resolution);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to WebSocket");
        }
    }

    private async Task PreCachePlaylistMediaAsync(Playlist playlist)
    {
        try
        {
            var mediaItems = playlist.Items.Where(item => item.Type != "web/html").ToList();
            var totalItems = mediaItems.Count;
            var cachedItems = 0;

            _logger.LogInformation("Pre-caching {TotalItems} media files", totalItems);
            StatusChanged?.Invoke($"Caching media files... (0/{totalItems})");

            foreach (var item in mediaItems)
            {
                try
                {
                    var progress = new Progress<double>(p => 
                    {
                        StatusChanged?.Invoke($"Caching media files... ({cachedItems}/{totalItems}) - {p:F1}%");
                    });

                    await _mediaManager.CacheMediaAsync(item, progress);
                    cachedItems++;
                    
                    StatusChanged?.Invoke($"Caching media files... ({cachedItems}/{totalItems})");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cache media item: {Url}", item.Url);
                }
            }

            _logger.LogInformation("Pre-caching completed: {CachedItems}/{TotalItems}", cachedItems, totalItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during media pre-caching");
        }
    }

    private async void OnWebSocketMessageReceived(string message)
    {
        try
        {
            var webSocketMessage = JsonSerializer.Deserialize<WebSocketMessage>(message);
            
            if (webSocketMessage?.Type == null) return;

            _logger.LogDebug("WebSocket message received: {MessageType}", webSocketMessage.Type);

            switch (webSocketMessage.Type)
            {
                case "playlist_updated":
                    _logger.LogInformation("Received playlist update notification");
                    await SyncAsync();
                    break;

                case "screen_deleted":
                    _logger.LogWarning("Screen was deleted from server");
                    StatusChanged?.Invoke("Screen deleted - please re-pair");
                    await StopAsync();
                    break;

                case "rotation_changed":
                    if (webSocketMessage.Data != null && int.TryParse(webSocketMessage.Data.ToString(), out int rotation))
                    {
                        _logger.LogInformation("Received rotation change: {Rotation}°", rotation);
                        if (CurrentScreen != null)
                        {
                            CurrentScreen.Rotation = rotation;
                            CurrentScreen.RotationUpdatedAt = DateTime.UtcNow;
                            await _storageService.SaveScreenAsync(CurrentScreen);
                            RotationChanged?.Invoke(rotation);
                        }
                    }
                    break;

                default:
                    _logger.LogDebug("Unhandled WebSocket message type: {MessageType}", webSocketMessage.Type);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing WebSocket message: {Message}", message);
        }
    }

    private void OnWebSocketConnected()
    {
        _logger.LogInformation("WebSocket connected");
        StatusChanged?.Invoke("Connected");
    }

    private async void OnWebSocketDisconnected()
    {
        _logger.LogWarning("WebSocket disconnected");
        StatusChanged?.Invoke("Disconnected - reconnecting...");
        
        // Attempt to reconnect after delay
        await Task.Delay(5000);
        if (_cancellationTokenSource?.Token.IsCancellationRequested != true)
        {
            await ConnectWebSocketAsync();
        }
    }

    public async Task ClearCurrentScreenAsync()
    {
        try
        {
            _logger.LogInformation("Clearing current screen data");
            
            // Stop any ongoing operations
            await StopAsync();
            
            // Clear in-memory references
            CurrentScreen = null;
            CurrentPlaylist = null;
            
            StatusChanged?.Invoke("Screen data cleared");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear current screen");
            throw;
        }
    }

    public void Dispose()
    {
        StopAsync().ConfigureAwait(false).GetAwaiter().GetResult();
        _syncTimer?.Dispose();
        _cancellationTokenSource?.Dispose();
    }
}