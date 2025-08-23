using Microsoft.Extensions.Logging;
using System;
using System.Windows;
using System.Windows.Controls;
using Unosquare.FFME;

namespace RegioPlayer.UI.Controls;

public partial class VideoPlayerControl : UserControl
{
    private ILogger<VideoPlayerControl>? _logger;
    
    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.Register(nameof(Source), typeof(string), typeof(VideoPlayerControl),
            new PropertyMetadata(null, OnSourceChanged));

    public static readonly DependencyProperty IsPlayingProperty =
        DependencyProperty.Register(nameof(IsPlaying), typeof(bool), typeof(VideoPlayerControl),
            new PropertyMetadata(false, OnIsPlayingChanged));

    public string? Source
    {
        get => (string?)GetValue(SourceProperty);
        set => SetValue(SourceProperty, value);
    }

    public bool IsPlaying
    {
        get => (bool)GetValue(IsPlayingProperty);
        set => SetValue(IsPlayingProperty, value);
    }

    public event Action? MediaOpened;
    public event Action? MediaEnded;
    public event Action<Exception>? MediaFailed;

    public VideoPlayerControl()
    {
        InitializeComponent();
        
        // Initialize FFME library
        if (!Library.IsInitialized)
        {
            Library.FFmpegDirectory = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ffmpeg");
            Library.EnableWpfMultiThreadedVideo = true;
        }
        
        // Wire up unloaded event
        Unloaded += VideoPlayerControl_Unloaded;
    }

    public void SetLogger(ILogger<VideoPlayerControl> logger)
    {
        _logger = logger;
    }

    private static void OnSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is VideoPlayerControl control && e.NewValue is string source)
        {
            control.LoadVideo(source);
        }
    }

    private static void OnIsPlayingChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is VideoPlayerControl control && e.NewValue is bool isPlaying)
        {
            if (isPlaying)
                control.Play();
            else
                control.Pause();
        }
    }

    private async void LoadVideo(string source)
    {
        try
        {
            if (string.IsNullOrEmpty(source)) return;

            _logger?.LogDebug("Loading video: {Source}", source);
            
            ShowLoading(true);
            
            await MediaElement.Close();
            await MediaElement.Open(new Uri(source));
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to load video: {Source}", source);
            MediaFailed?.Invoke(ex);
            ShowLoading(false);
        }
    }

    public async void Play()
    {
        try
        {
            if (MediaElement.IsOpen)
            {
                await MediaElement.Play();
                _logger?.LogDebug("Video playback started");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to start video playback");
            MediaFailed?.Invoke(ex);
        }
    }

    public async void Pause()
    {
        try
        {
            if (MediaElement.IsOpen)
            {
                await MediaElement.Pause();
                _logger?.LogDebug("Video playback paused");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to pause video playback");
        }
    }

    public async void Stop()
    {
        try
        {
            await MediaElement.Stop();
            _logger?.LogDebug("Video playback stopped");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to stop video playback");
        }
    }

    private void ShowLoading(bool show)
    {
        LoadingOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
    }

    private void MediaElement_MediaOpened(object sender, EventArgs e)
    {
        _logger?.LogDebug("Media opened successfully");
        ShowLoading(false);
        MediaOpened?.Invoke();
        
        if (IsPlaying)
        {
            Play();
        }
    }

    private void MediaElement_MediaEnded(object sender, EventArgs e)
    {
        _logger?.LogDebug("Media playback ended");
        MediaEnded?.Invoke();
    }

    private void MediaElement_MediaFailed(object sender, EventArgs e)
    {
        _logger?.LogError("Media playback failed");
        ShowLoading(false);
        MediaFailed?.Invoke(new Exception("Media playback failed"));
    }

    private void VideoPlayerControl_Unloaded(object sender, RoutedEventArgs e)
    {
        try
        {
            MediaElement?.Close();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error during video control cleanup");
        }
    }
}