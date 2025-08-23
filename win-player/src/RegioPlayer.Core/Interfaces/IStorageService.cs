using RegioPlayer.Core.Models;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Interfaces;

public interface IStorageService
{
    Task<Screen?> GetScreenAsync();
    Task SaveScreenAsync(Screen screen);
    Task<Playlist?> GetPlaylistAsync();
    Task SavePlaylistAsync(Playlist playlist);
    Task<PlayerConfiguration> GetConfigurationAsync();
    Task SaveConfigurationAsync(PlayerConfiguration configuration);
    Task InitializeDatabaseAsync();
    Task ClearScreenDataAsync();
    Task ClearPlaylistDataAsync();
}