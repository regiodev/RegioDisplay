using Microsoft.Extensions.Logging;
using RegioPlayer.UI.ViewModels;
using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;

namespace RegioPlayer.UI.Views;

public partial class PlayerScreen : UserControl
{
    private ILogger<PlayerScreen>? _logger;
    private PlayerViewModel? _viewModel;

    public PlayerScreen()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
        
        // Show debug info only in debug builds
#if DEBUG
        DebugInfo.Visibility = Visibility.Visible;
#endif
    }

    public void SetLogger(ILogger<PlayerScreen> logger)
    {
        _logger = logger;
        
        // Set loggers for media controls
        VideoPlayer.SetLogger(logger as ILogger<UI.Controls.VideoPlayerControl>);
        ImagePlayer.SetLogger(logger as ILogger<UI.Controls.ImagePlayerControl>);
        WebPlayer.SetLogger(logger as ILogger<UI.Controls.WebContentControl>);
    }

    private void OnDataContextChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        _viewModel = DataContext as PlayerViewModel;
    }

    // Video Player Event Handlers
    private void VideoPlayer_MediaOpened()
    {
        _logger?.LogDebug("Video media opened successfully");
    }

    private void VideoPlayer_MediaEnded()
    {
        _logger?.LogDebug("Video media ended");
        // The PlayerViewModel handles timing, so we don't need to do anything here
    }

    private void VideoPlayer_MediaFailed(Exception ex)
    {
        _logger?.LogError(ex, "Video media failed to play");
        
        // Could implement retry logic or skip to next item
        // For now, just log and let the timer handle progression
    }

    // Image Player Event Handlers
    private void ImagePlayer_ImageLoaded()
    {
        _logger?.LogDebug("Image loaded successfully");
    }

    private void ImagePlayer_ImageFailed(Exception ex)
    {
        _logger?.LogError(ex, "Image failed to load");
        
        // Could show placeholder or skip to next item
        // For now, just log and let the timer handle progression
    }

    // Web Player Event Handlers
    private void WebPlayer_NavigationCompleted()
    {
        _logger?.LogDebug("Web content navigation completed");
    }

    private void WebPlayer_NavigationFailed(Exception ex)
    {
        _logger?.LogError(ex, "Web content navigation failed");
        
        // Could implement retry logic or show error message
        // For now, just log and let the timer handle progression
    }

    // Handle keyboard shortcuts for debugging
    protected override void OnKeyDown(System.Windows.Input.KeyEventArgs e)
    {
        if (Debugger.IsAttached)
        {
            switch (e.Key)
            {
                case System.Windows.Input.Key.Space:
                    // Skip to next item
                    _viewModel?.SkipToNextAsync();
                    e.Handled = true;
                    break;
                    
                case System.Windows.Input.Key.R:
                    // Restart playlist
                    _viewModel?.RestartPlaylistAsync();
                    e.Handled = true;
                    break;
                    
                case System.Windows.Input.Key.D:
                    // Toggle debug info
                    DebugInfo.Visibility = DebugInfo.Visibility == Visibility.Visible 
                        ? Visibility.Collapsed 
                        : Visibility.Visible;
                    e.Handled = true;
                    break;
            }
        }
        
        base.OnKeyDown(e);
    }

    // Clean up when the control is unloaded
    private void OnUnloaded(object sender, RoutedEventArgs e)
    {
        try
        {
            _viewModel?.StopPlaybackAsync();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during PlayerScreen cleanup");
        }
    }
}