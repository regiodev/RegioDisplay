using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Common;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Threading.Tasks;
using System.Windows.Input;

namespace RegioPlayer.UI.ViewModels;

public class SettingsViewModel : ViewModelBase
{
    private readonly IStorageService _storageService;
    private readonly IMediaManager _mediaManager;
    private readonly IScreenManager _screenManager;
    private readonly ILogger<SettingsViewModel> _logger;
    
    private PlayerConfiguration? _configuration;
    private string _statusMessage = string.Empty;
    private bool _isLoading = false;
    private long _cacheSize = 0;
    private string _cacheSizeText = "Calculating...";

    public SettingsViewModel(
        IStorageService storageService,
        IMediaManager mediaManager,
        IScreenManager screenManager,
        ILogger<SettingsViewModel> logger)
    {
        _storageService = storageService;
        _mediaManager = mediaManager;
        _screenManager = screenManager;
        _logger = logger;

        // Commands
        SaveSettingsCommand = new RelayCommand(async () => await SaveSettingsAsync());
        ClearCacheCommand = new RelayCommand(async () => await ClearCacheAsync());
        RestartPlayerCommand = new RelayCommand(async () => await RestartPlayerAsync());
        ResetPairingCommand = new RelayCommand(async () => await ResetPairingAsync());
        CloseSettingsCommand = new RelayCommand(async () => await CloseSettingsAsync());

        // Initialize
        _ = LoadSettingsAsync();
    }

    public PlayerConfiguration? Configuration
    {
        get => _configuration;
        set => SetProperty(ref _configuration, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string CacheSizeText
    {
        get => _cacheSizeText;
        set => SetProperty(ref _cacheSizeText, value);
    }

    public string CurrentVersion => "1.0.0";
    
    public string? CurrentScreenKey => _screenManager.CurrentScreen?.UniqueKey;
    
    public string? CurrentPlaylistName => _screenManager.CurrentPlaylist?.Name;
    
    public int? CurrentPlaylistItemCount => _screenManager.CurrentPlaylist?.Items?.Count;

    // Commands
    public ICommand SaveSettingsCommand { get; }
    public ICommand ClearCacheCommand { get; }
    public ICommand RestartPlayerCommand { get; }
    public ICommand ResetPairingCommand { get; }
    public ICommand CloseSettingsCommand { get; }

    public event Action? SettingsClosed;
    public event Action? RestartRequested;
    public event Action? PairingResetRequested;

    private async Task LoadSettingsAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Loading settings...";

            Configuration = await _storageService.GetConfigurationAsync();
            await UpdateCacheSizeAsync();

            StatusMessage = "Settings loaded";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load settings");
            StatusMessage = "Failed to load settings";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task SaveSettingsAsync()
    {
        try
        {
            if (Configuration == null)
            {
                StatusMessage = "No configuration to save";
                return;
            }

            IsLoading = true;
            StatusMessage = "Saving settings...";

            await _storageService.SaveConfigurationAsync(Configuration);

            StatusMessage = "Settings saved successfully";
            _logger.LogInformation("Settings saved successfully");

            // Close settings after successful save
            await Task.Delay(1000);
            SettingsClosed?.Invoke();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save settings");
            StatusMessage = "Failed to save settings";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task ClearCacheAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Clearing cache...";

            await _mediaManager.ClearCacheAsync();
            await UpdateCacheSizeAsync();

            StatusMessage = "Cache cleared successfully";
            _logger.LogInformation("Cache cleared by user");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear cache");
            StatusMessage = "Failed to clear cache";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private Task RestartPlayerAsync()
    {
        try
        {
            StatusMessage = "Restarting player...";
            _logger.LogInformation("Player restart requested by user");
            
            RestartRequested?.Invoke();
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restart player");
            StatusMessage = "Failed to restart player";
            return Task.CompletedTask;
        }
    }

    private async Task ResetPairingAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Resetting pairing data...";
            _logger.LogInformation("Pairing reset requested by user");

            // Clear screen data from storage
            await _storageService.ClearScreenDataAsync();
            
            // Clear playlist data
            await _storageService.ClearPlaylistDataAsync();
            
            // Clear media cache
            await _mediaManager.ClearCacheAsync();

            StatusMessage = "Pairing data reset successfully. Application will restart to pairing mode.";
            _logger.LogInformation("Pairing data reset completed");

            // Wait a moment for user to see the message
            await Task.Delay(2000);
            
            // Trigger pairing reset which should restart the application
            PairingResetRequested?.Invoke();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reset pairing data");
            StatusMessage = "Failed to reset pairing data";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private Task CloseSettingsAsync()
    {
        SettingsClosed?.Invoke();
        return Task.CompletedTask;
    }

    private async Task UpdateCacheSizeAsync()
    {
        try
        {
            var size = await _mediaManager.GetCacheSizeAsync();
            _cacheSize = size;

            if (size == 0)
            {
                CacheSizeText = "Empty";
            }
            else if (size < 1024 * 1024)
            {
                CacheSizeText = $"{size / 1024:N0} KB";
            }
            else if (size < 1024 * 1024 * 1024)
            {
                CacheSizeText = $"{size / (1024.0 * 1024.0):N1} MB";
            }
            else
            {
                CacheSizeText = $"{size / (1024.0 * 1024.0 * 1024.0):N2} GB";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate cache size");
            CacheSizeText = "Error";
        }
    }

    public async Task RefreshAsync()
    {
        await LoadSettingsAsync();
        
        // Refresh dynamic properties
        OnPropertyChanged(nameof(CurrentScreenKey));
        OnPropertyChanged(nameof(CurrentPlaylistName));
        OnPropertyChanged(nameof(CurrentPlaylistItemCount));
    }
}