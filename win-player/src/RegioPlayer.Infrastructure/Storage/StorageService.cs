using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Data.SQLite;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace RegioPlayer.Infrastructure.Storage;

public class StorageService : IStorageService
{
    private readonly ILogger<StorageService> _logger;
    private readonly string _databasePath;
    private readonly string _configPath;

    public StorageService(ILogger<StorageService> logger)
    {
        _logger = logger;
        
        var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var appDirectory = Path.Combine(appDataPath, "RegioWindowsPlayer");
        
        Directory.CreateDirectory(appDirectory);
        
        _databasePath = Path.Combine(appDirectory, "regio-player.db");
        _configPath = Path.Combine(appDirectory, "config.json");
    }

    public async Task InitializeDatabaseAsync()
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            var createScreenTable = @"
                CREATE TABLE IF NOT EXISTS Screens (
                    UniqueKey TEXT PRIMARY KEY,
                    Name TEXT NOT NULL DEFAULT '',
                    Location TEXT NOT NULL DEFAULT '',
                    PairingCode TEXT NOT NULL DEFAULT '',
                    Rotation INTEGER DEFAULT 0,
                    RotationUpdatedAt DATETIME,
                    IsActive INTEGER DEFAULT 0,
                    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    LastSyncAt DATETIME
                )";

            var createPlaylistTable = @"
                CREATE TABLE IF NOT EXISTS Playlists (
                    Id INTEGER PRIMARY KEY,
                    Name TEXT NOT NULL,
                    PlaylistVersion TEXT NOT NULL,
                    Data TEXT NOT NULL,
                    Rotation INTEGER DEFAULT 0,
                    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME
                )";

            using var command = new SQLiteCommand(createScreenTable, connection);
            await command.ExecuteNonQueryAsync();

            command.CommandText = createPlaylistTable;
            await command.ExecuteNonQueryAsync();

            _logger.LogInformation("Database initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize database");
            throw;
        }
    }

    public async Task<Screen?> GetScreenAsync()
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            using var command = new SQLiteCommand("SELECT * FROM Screens LIMIT 1", connection);
            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new Screen
                {
                    UniqueKey = reader["UniqueKey"].ToString() ?? string.Empty,
                    Name = reader["Name"].ToString() ?? string.Empty,
                    Location = reader["Location"].ToString() ?? string.Empty,
                    PairingCode = reader["PairingCode"].ToString() ?? string.Empty,
                    Rotation = Convert.ToInt32(reader["Rotation"]),
                    RotationUpdatedAt = DateTime.Parse(reader["RotationUpdatedAt"].ToString() ?? DateTime.UtcNow.ToString()),
                    IsActive = Convert.ToBoolean(reader["IsActive"]),
                    CreatedAt = DateTime.Parse(reader["CreatedAt"].ToString() ?? DateTime.UtcNow.ToString()),
                    LastSyncAt = reader["LastSyncAt"] == DBNull.Value ? null : DateTime.Parse(reader["LastSyncAt"].ToString()!)
                };
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get screen from database");
            return null;
        }
    }

    public async Task SaveScreenAsync(Screen screen)
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            var sql = @"
                INSERT OR REPLACE INTO Screens 
                (UniqueKey, Name, Location, PairingCode, Rotation, RotationUpdatedAt, IsActive, CreatedAt, LastSyncAt)
                VALUES (@UniqueKey, @Name, @Location, @PairingCode, @Rotation, @RotationUpdatedAt, @IsActive, @CreatedAt, @LastSyncAt)";

            using var command = new SQLiteCommand(sql, connection);
            command.Parameters.AddWithValue("@UniqueKey", screen.UniqueKey);
            command.Parameters.AddWithValue("@Name", screen.Name);
            command.Parameters.AddWithValue("@Location", screen.Location);
            command.Parameters.AddWithValue("@PairingCode", screen.PairingCode);
            command.Parameters.AddWithValue("@Rotation", screen.Rotation);
            command.Parameters.AddWithValue("@RotationUpdatedAt", screen.RotationUpdatedAt);
            command.Parameters.AddWithValue("@IsActive", screen.IsActive);
            command.Parameters.AddWithValue("@CreatedAt", screen.CreatedAt);
            command.Parameters.AddWithValue("@LastSyncAt", (object?)screen.LastSyncAt ?? DBNull.Value);

            await command.ExecuteNonQueryAsync();
            _logger.LogDebug("Screen saved successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save screen to database");
            throw;
        }
    }

    public async Task<Playlist?> GetPlaylistAsync()
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            using var command = new SQLiteCommand("SELECT * FROM Playlists ORDER BY CreatedAt DESC LIMIT 1", connection);
            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                var data = reader["Data"].ToString();
                if (!string.IsNullOrEmpty(data))
                {
                    var playlist = JsonSerializer.Deserialize<Playlist>(data);
                    return playlist;
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get playlist from database");
            return null;
        }
    }

    public async Task SavePlaylistAsync(Playlist playlist)
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            var data = JsonSerializer.Serialize(playlist);
            playlist.UpdatedAt = DateTime.UtcNow;

            var sql = @"
                INSERT OR REPLACE INTO Playlists 
                (Id, Name, PlaylistVersion, Data, Rotation, CreatedAt, UpdatedAt)
                VALUES (@Id, @Name, @PlaylistVersion, @Data, @Rotation, @CreatedAt, @UpdatedAt)";

            using var command = new SQLiteCommand(sql, connection);
            command.Parameters.AddWithValue("@Id", playlist.Id);
            command.Parameters.AddWithValue("@Name", playlist.Name);
            command.Parameters.AddWithValue("@PlaylistVersion", playlist.PlaylistVersion);
            command.Parameters.AddWithValue("@Data", data);
            command.Parameters.AddWithValue("@Rotation", playlist.Rotation);
            command.Parameters.AddWithValue("@CreatedAt", playlist.CreatedAt);
            command.Parameters.AddWithValue("@UpdatedAt", playlist.UpdatedAt);

            await command.ExecuteNonQueryAsync();
            _logger.LogDebug("Playlist saved successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save playlist to database");
            throw;
        }
    }

    public async Task<PlayerConfiguration> GetConfigurationAsync()
    {
        try
        {
            if (File.Exists(_configPath))
            {
                var json = await File.ReadAllTextAsync(_configPath);
                var config = JsonSerializer.Deserialize<PlayerConfiguration>(json);
                return config ?? new PlayerConfiguration();
            }

            return new PlayerConfiguration();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load configuration, using defaults");
            return new PlayerConfiguration();
        }
    }

    public async Task SaveConfigurationAsync(PlayerConfiguration configuration)
    {
        try
        {
            var json = JsonSerializer.Serialize(configuration, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_configPath, json);
            _logger.LogDebug("Configuration saved successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save configuration");
            throw;
        }
    }

    public async Task ClearScreenDataAsync()
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            var sql = "DELETE FROM Screens";
            using var command = new SQLiteCommand(sql, connection);
            await command.ExecuteNonQueryAsync();

            _logger.LogInformation("Screen data cleared successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear screen data");
            throw;
        }
    }

    public async Task ClearPlaylistDataAsync()
    {
        try
        {
            using var connection = new SQLiteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync();

            var sql = "DELETE FROM Playlists";
            using var command = new SQLiteCommand(sql, connection);
            await command.ExecuteNonQueryAsync();

            _logger.LogInformation("Playlist data cleared successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear playlist data");
            throw;
        }
    }
}