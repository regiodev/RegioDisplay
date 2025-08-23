using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Common;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace RegioPlayer.UI.ViewModels;

public class MainViewModel : ViewModelBase
{
    private readonly IScreenManager _screenManager;
    private readonly ILogger<MainViewModel> _logger;
    
    private bool _isPairing = true;
    private bool _isPlaying = false;
    private bool _isLoading = false;
    private bool _showSettings = false;
    private string _statusMessage = "Initializing...";
    private int _controlKeyPressCount = 0;
    private DateTime _lastControlKeyPress = DateTime.MinValue;

    public MainViewModel(
        IScreenManager screenManager,
        PairingViewModel pairingViewModel,
        PlayerViewModel playerViewModel,
        SettingsViewModel settingsViewModel,
        ILogger<MainViewModel> logger)
    {
        _screenManager = screenManager;
        _logger = logger;
        
        PairingViewModel = pairingViewModel;
        PlayerViewModel = playerViewModel;
        SettingsViewModel = settingsViewModel;

        // BYPASS: Don't subscribe to screen manager events for debugging
        // _screenManager.PlaylistUpdated += OnPlaylistUpdated;
        // _screenManager.RotationChanged += OnRotationChanged;
        // _screenManager.StatusChanged += OnStatusChanged;
        // _screenManager.ScreenDeactivated += OnScreenDeactivated;

        // Subscribe to pairing completion
        PairingViewModel.PairingCompleted += OnPairingCompleted;

        // Subscribe to settings events
        SettingsViewModel.PairingResetRequested += OnPairingResetRequested;

        // Initialize
        _ = InitializeAsync();
    }

    public PairingViewModel PairingViewModel { get; }
    public PlayerViewModel PlayerViewModel { get; }
    public SettingsViewModel SettingsViewModel { get; }

    public bool IsPairing
    {
        get => _isPairing;
        set => SetProperty(ref _isPairing, value);
    }

    public bool IsPlaying
    {
        get => _isPlaying;
        set => SetProperty(ref _isPlaying, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public bool ShowSettings
    {
        get => _showSettings;
        set => SetProperty(ref _showSettings, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public event Action<int>? RotationChanged;

    public async Task InitializeAsync()
    {
        try
        {
            _logger.LogInformation("Starting MainViewModel initialization...");
            IsLoading = true;
            StatusMessage = "Initializing...";
            
            // Initialize screen manager
            await _screenManager.InitializeAsync();
            
            // Subscribe to screen manager events
            _screenManager.PlaylistUpdated += OnPlaylistUpdated;
            _screenManager.RotationChanged += OnRotationChanged; 
            _screenManager.StatusChanged += OnStatusChanged;
            _screenManager.ScreenDeactivated += OnScreenDeactivated;
            
            if (_screenManager.CurrentScreen?.IsActive == true)
            {
                _logger.LogInformation("=== MAIN DEBUG === Screen is active - starting player mode");
                StatusMessage = "Starting player...";
                
                try 
                {
                    await _screenManager.StartAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to start screen manager (possibly offline) - continuing with cached data");
                }
                
                if (_screenManager.CurrentPlaylist != null)
                {
                    _logger.LogInformation("Using cached playlist for offline playback: {PlaylistName}", _screenManager.CurrentPlaylist.Name);
                    StatusMessage = "Running offline with cached content";
                    await StartPlayback();
                }
                else
                {
                    StatusMessage = "No cached playlist available - check connection";
                    _logger.LogWarning("No cached playlist available for offline mode");
                }
            }
            else
            {
                _logger.LogInformation("=== MAIN DEBUG === Screen not active - entering pairing mode");
                StatusMessage = "Screen not paired";
                IsPairing = true;
                await PairingViewModel.InitializeAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during initialization");
            StatusMessage = "Initialization error";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public void HandleControlKey()
    {
        var now = DateTime.Now;
        
        // Reset count if more than 2 seconds since last press
        if (now - _lastControlKeyPress > TimeSpan.FromSeconds(2))
        {
            _controlKeyPressCount = 0;
        }

        _controlKeyPressCount++;
        _lastControlKeyPress = now;

        if (_controlKeyPressCount >= 3)
        {
            ShowSettings = !ShowSettings;
            _controlKeyPressCount = 0;
            _logger.LogInformation("Settings panel toggled: {Visible}", ShowSettings);
        }
    }

    private async void OnPlaylistUpdated(Playlist playlist)
    {
        try
        {
            _logger.LogInformation("Playlist updated: {PlaylistName} with {ItemCount} items", 
                playlist.Name, playlist.Items.Count);
            
            await StartPlayback();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling playlist update");
        }
    }

    private void OnRotationChanged(int rotation)
    {
        _logger.LogInformation("Screen rotation changed: {Rotation}°", rotation);
        RotationChanged?.Invoke(rotation);
    }

    private void OnStatusChanged(string status)
    {
        // Filter out non-essential status updates to avoid unnecessary UI refreshes
        var ignoredStatusMessages = new[]
        {
            "Screen registered successfully",
            "Registration successful", 
            "Sync completed",
            "Playlist up to date",
            "Connected"
        };

        if (!ignoredStatusMessages.Any(ignored => status.Contains(ignored, StringComparison.OrdinalIgnoreCase)))
        {
            StatusMessage = status;
            _logger.LogDebug("Status changed: {Status}", status);
        }
        else
        {
            _logger.LogDebug("Status update filtered (no UI change): {Status}", status);
        }
    }

    private async void OnPairingCompleted()
    {
        try
        {
            _logger.LogInformation("Pairing completed successfully");
            
            IsPairing = false;
            IsLoading = true;
            StatusMessage = "Starting player...";

            await _screenManager.StartAsync();
            
            StatusMessage = "Synchronizing playlist...";
            
            // Force a sync to get the latest playlist
            await _screenManager.SyncAsync();
            
            // Wait a bit more if needed and check again
            int retries = 0;
            while (_screenManager.CurrentPlaylist == null && retries < 10)
            {
                await Task.Delay(1000);
                await _screenManager.SyncAsync();
                retries++;
                _logger.LogDebug("Waiting for playlist... attempt {Retry}/10", retries + 1);
            }
            
            if (_screenManager.CurrentPlaylist != null)
            {
                _logger.LogInformation("Playlist loaded successfully: {PlaylistName} with {ItemCount} items", 
                    _screenManager.CurrentPlaylist.Name, _screenManager.CurrentPlaylist.Items?.Count ?? 0);
                await StartPlayback();
            }
            else
            {
                StatusMessage = "No playlist assigned to this screen";
                IsLoading = false;
                _logger.LogWarning("No playlist received after pairing completion");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error after pairing completion");
            StatusMessage = "Error starting player";
            IsLoading = false;
        }
    }

    private async Task StartPlayback()
    {
        try
        {
            if (_screenManager.CurrentPlaylist == null)
            {
                _logger.LogWarning("Cannot start playback - no playlist available");
                return;
            }

            StatusMessage = "Loading playlist...";
            IsLoading = true;

            await PlayerViewModel.LoadPlaylistAsync(_screenManager.CurrentPlaylist);

            IsLoading = false;
            IsPlaying = true;
            IsPairing = false;

            _logger.LogInformation("Playback started successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting playback");
            StatusMessage = "Error loading playlist";
            IsLoading = false;
        }
    }

    private async void OnPairingResetRequested()
    {
        try
        {
            _logger.LogInformation("Pairing reset requested - transitioning to pairing mode");
            
            // Clear current screen from memory
            await _screenManager.ClearCurrentScreenAsync();
            
            // Reset UI state - force pairing mode
            IsPlaying = false;
            IsLoading = false;
            ShowSettings = false;
            IsPairing = true;

            // Reinitialize screen manager (should find no screen data now)
            await _screenManager.InitializeAsync();
            
            // Initialize pairing with fresh data
            await PairingViewModel.InitializeAsync();
            
            StatusMessage = "Pairing reset completed - ready for new pairing";
            _logger.LogInformation("Successfully transitioned to pairing mode after reset");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during pairing reset");
            StatusMessage = "Error during pairing reset";
            // Ensure we still go to pairing mode even if there's an error
            IsPairing = true;
            IsPlaying = false;
        }
    }

    private async void OnScreenDeactivated()
    {
        try
        {
            _logger.LogWarning("=== MAIN DEBUG === OnScreenDeactivated called - server deactivated screen!");
            
            // Stop current operations
            await _screenManager.StopAsync();
            
            // Reset UI state to pairing mode
            IsPlaying = false;
            IsLoading = false;
            IsPairing = true;
            ShowSettings = false;

            // Initialize pairing mode
            await PairingViewModel.InitializeAsync();
            
            _logger.LogInformation("Successfully transitioned to pairing mode after server deactivation");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling screen deactivation");
            // Ensure we still go to pairing mode even if there's an error
            IsPairing = true;
            IsPlaying = false;
        }
    }
}