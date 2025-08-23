using RegioPlayer.UI.ViewModels;
using System.Windows;
using System.Windows.Controls;

namespace RegioPlayer.UI.Views;

public partial class SettingsPanel : UserControl
{
    public SettingsPanel()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        // Refresh settings when panel loads
        if (DataContext is SettingsViewModel viewModel)
        {
            await viewModel.RefreshAsync();
        }
    }
}