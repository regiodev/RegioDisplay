using Microsoft.Extensions.Logging;
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace RegioPlayer.UI.Controls;

public partial class ImagePlayerControl : UserControl
{
    private ILogger<ImagePlayerControl>? _logger;
    
    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.Register(nameof(Source), typeof(string), typeof(ImagePlayerControl),
            new PropertyMetadata(null, OnSourceChanged));

    public static readonly DependencyProperty ImageSourceProperty =
        DependencyProperty.Register(nameof(ImageSource), typeof(ImageSource), typeof(ImagePlayerControl));

    public string? Source
    {
        get => (string?)GetValue(SourceProperty);
        set => SetValue(SourceProperty, value);
    }

    public ImageSource? ImageSource
    {
        get => (ImageSource?)GetValue(ImageSourceProperty);
        set => SetValue(ImageSourceProperty, value);
    }

    public event Action? ImageLoaded;
    public event Action<Exception>? ImageFailed;

    public ImagePlayerControl()
    {
        InitializeComponent();
    }

    public void SetLogger(ILogger<ImagePlayerControl> logger)
    {
        _logger = logger;
    }

    private static void OnSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ImagePlayerControl control && e.NewValue is string source)
        {
            control.LoadImage(source);
        }
    }

    private void LoadImage(string source)
    {
        try
        {
            if (string.IsNullOrEmpty(source))
            {
                ImageSource = null;
                return;
            }

            _logger?.LogDebug("Loading image: {Source}", source);
            
            ShowLoading(true);
            ShowError(false);

            // Create bitmap image with caching
            var bitmap = new BitmapImage();
            bitmap.BeginInit();
            bitmap.CacheOption = BitmapCacheOption.OnLoad;
            bitmap.CreateOptions = BitmapCreateOptions.IgnoreImageCache;
            bitmap.UriSource = new Uri(source, UriKind.RelativeOrAbsolute);
            
            // Handle download events
            bitmap.DownloadCompleted += (s, e) =>
            {
                _logger?.LogDebug("Image download completed: {Source}", source);
                ShowLoading(false);
                ImageLoaded?.Invoke();
            };
            
            bitmap.DownloadFailed += (s, e) =>
            {
                _logger?.LogError(e.ErrorException, "Image download failed: {Source}", source);
                ShowLoading(false);
                ShowError(true);
                ImageFailed?.Invoke(e.ErrorException ?? new Exception("Image download failed"));
            };
            
            bitmap.EndInit();
            
            // Freeze for performance and thread safety
            bitmap.Freeze();
            
            ImageSource = bitmap;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to load image: {Source}", source);
            ShowLoading(false);
            ShowError(true);
            ImageFailed?.Invoke(ex);
        }
    }

    private void ShowLoading(bool show)
    {
        LoadingOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ShowError(bool show)
    {
        ErrorOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
    }

    private void MainImage_Loaded(object sender, RoutedEventArgs e)
    {
        _logger?.LogDebug("Image control loaded");
        ShowLoading(false);
    }

    private void MainImage_ImageFailed(object sender, ExceptionRoutedEventArgs e)
    {
        _logger?.LogError(e.ErrorException, "Image failed to load in control");
        ShowLoading(false);
        ShowError(true);
        ImageFailed?.Invoke(e.ErrorException);
    }

    public void ClearImage()
    {
        ImageSource = null;
        ShowLoading(false);
        ShowError(false);
    }
}