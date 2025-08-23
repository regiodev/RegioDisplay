using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace RegioPlayer.Infrastructure.Api;

public class ApiService : IApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ApiService> _logger;
    private readonly string _baseUrl;

    public ApiService(ILogger<ApiService> logger)
    {
        _logger = logger;
        _baseUrl = "https://display.regio-cloud.ro/api";
        
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "RegioWindowsPlayer/1.0");
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<RegisterResponse> RegisterScreenAsync(string uniqueKey, string pairingCode)
    {
        try
        {
            // Backend expects ONLY unique_key and pairing_code - nothing else!
            var requestData = new
            {
                unique_key = uniqueKey,
                pairing_code = pairingCode
            };

            var json = JsonSerializer.Serialize(requestData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Registering screen with key: {UniqueKey}, pairing code: {PairingCode}", uniqueKey, pairingCode);

            var response = await _httpClient.PostAsync($"{_baseUrl}/client/register", content);
            var responseContent = await response.Content.ReadAsStringAsync();
            
            _logger.LogInformation("Register response status: {StatusCode}, content: {Content}", response.StatusCode, responseContent);

            if (response.IsSuccessStatusCode)
            {
                // Backend returns JSON like: {"detail": "Ecran înregistrat cu succes, se așteaptă împerecherea."}
                try 
                {
                    var jsonResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    var detail = jsonResponse.GetProperty("detail").GetString();
                    
                    _logger.LogInformation("Registration successful: {Detail}", detail);
                    return new RegisterResponse { Success = true, Message = detail ?? "Registration successful" };
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not parse registration response as JSON, treating as success");
                    return new RegisterResponse { Success = true, Message = responseContent };
                }
            }
            else
            {
                _logger.LogError("Registration failed with status {StatusCode}: {Content}", response.StatusCode, responseContent);
                
                // Try to parse error message from JSON
                try
                {
                    var jsonResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    var detail = jsonResponse.GetProperty("detail").GetString();
                    return new RegisterResponse { Success = false, Message = detail ?? responseContent };
                }
                catch
                {
                    return new RegisterResponse { Success = false, Message = $"HTTP {response.StatusCode}: {responseContent}" };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during screen registration");
            return new RegisterResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<SyncResponse> SyncPlaylistAsync(string screenKey, string? currentVersion = null)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Screen-Key");
            _httpClient.DefaultRequestHeaders.Remove("X-Playlist-Version");
            
            _httpClient.DefaultRequestHeaders.Add("X-Screen-Key", screenKey);
            if (!string.IsNullOrEmpty(currentVersion))
            {
                _httpClient.DefaultRequestHeaders.Add("X-Playlist-Version", currentVersion);
            }

            _logger.LogDebug("Syncing playlist for screen: {ScreenKey}", screenKey);

            var response = await _httpClient.GetAsync($"{_baseUrl}/client/sync");
            
            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("=== API DEBUG === Raw response: {Response}", responseContent);
                
                // Backend returns ClientPlaylistResponse directly, not wrapped in SyncResponse
                var result = JsonSerializer.Deserialize<SyncResponse>(responseContent);
                
                _logger.LogInformation("=== API DEBUG === Deserialized - ID: {Id}, PlaylistName: '{Name}', Version: '{Version}'", 
                    result?.Id, result?.Name, result?.PlaylistVersion);
                
                // If we got a response with ID > 0, it means we have updates
                if (result != null)
                {
                    result.HasUpdates = result.Id > 0;
                }
                
                return result ?? new SyncResponse { HasUpdates = false };
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                _logger.LogDebug("No playlist updates available");
                return new SyncResponse { HasUpdates = false };
            }
            else
            {
                _logger.LogWarning("Playlist sync failed with status: {StatusCode}", response.StatusCode);
                return new SyncResponse { HasUpdates = false };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during playlist sync");
            return new SyncResponse { HasUpdates = false };
        }
    }

    public async Task DownloadMediaAsync(string url, string localPath, IProgress<double>? progress = null)
    {
        try
        {
            _logger.LogDebug("Downloading media from: {Url} to: {LocalPath}", url, localPath);

            using var response = await _httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? -1;
            var downloadedBytes = 0L;

            Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);

            using var contentStream = await response.Content.ReadAsStreamAsync();
            using var fileStream = new FileStream(localPath, FileMode.Create, FileAccess.Write);
            
            var buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = await contentStream.ReadAsync(buffer)) > 0)
            {
                await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead));
                downloadedBytes += bytesRead;

                if (totalBytes > 0 && progress != null)
                {
                    var progressPercentage = (double)downloadedBytes / totalBytes * 100;
                    progress.Report(progressPercentage);
                }
            }

            _logger.LogDebug("Media download completed: {LocalPath}", localPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading media from: {Url}", url);
            
            if (File.Exists(localPath))
            {
                File.Delete(localPath);
            }
            
            throw;
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/health");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Connection test failed");
            return false;
        }
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}