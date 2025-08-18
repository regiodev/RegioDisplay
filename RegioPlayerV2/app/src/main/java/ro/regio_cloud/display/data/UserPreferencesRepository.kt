package ro.regio_cloud.display.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "regioplayer_settings")

class UserPreferencesRepository(context: Context) {

    private val dataStore = context.dataStore

    private object PreferencesKeys {
        val SCREEN_UNIQUE_KEY = stringPreferencesKey("screen_unique_key")
        val SCREEN_ROTATION = intPreferencesKey("screen_rotation_preference")
        val CACHED_PLAYLIST_JSON = stringPreferencesKey("cached_playlist_json")
        val PAIRING_CODE = stringPreferencesKey("pairing_code")
        val CACHED_PLAYLIST_VERSION = stringPreferencesKey("cached_playlist_version")
        val CACHED_SCREEN_NAME = stringPreferencesKey("cached_screen_name")
        val CACHED_PLAYLIST_NAME = stringPreferencesKey("cached_playlist_name")
        val LANGUAGE = stringPreferencesKey("language_preference")
        val ROTATION_TIMESTAMP = stringPreferencesKey("rotation_timestamp")

        // Chei pentru Kiosk Mode
        val AUTO_START_ON_BOOT = booleanPreferencesKey("auto_start_on_boot")
        val AUTO_RELAUNCH_ON_CRASH = booleanPreferencesKey("auto_relaunch_on_crash")
    }

    // --- Setări Kiosk Mode ---
    val autoStartOnBootFlow: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.AUTO_START_ON_BOOT] ?: false
    }

    suspend fun saveAutoStartOnBoot(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.AUTO_START_ON_BOOT] = enabled
        }
    }

    val autoRelaunchOnCrashFlow: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.AUTO_RELAUNCH_ON_CRASH] ?: true
    }

    suspend fun saveAutoRelaunchOnCrash(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.AUTO_RELAUNCH_ON_CRASH] = enabled
        }
    }

    // --- Preferința de Limbă ---
    val languageFlow: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.LANGUAGE] ?: "en"
    }

    suspend fun getLanguage(): String {
        return languageFlow.first()
    }

    suspend fun saveLanguage(languageCode: String) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.LANGUAGE] = languageCode
        }
    }

    // --- Cheia Unică a Ecranului ---
    val uniqueKeyFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SCREEN_UNIQUE_KEY]
    }

    suspend fun saveUniqueKey(key: String) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.SCREEN_UNIQUE_KEY] = key
        }
    }

    // --- Codul de Împerechere ---
    val pairingCodeFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.PAIRING_CODE]
    }

    suspend fun savePairingCode(code: String) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.PAIRING_CODE] = code
        }
    }

    // --- Rotația Ecranului și Timestamp ---
    val rotationFlow: Flow<Int> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SCREEN_ROTATION] ?: 0
    }

    val rotationTimestampFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.ROTATION_TIMESTAMP]
    }

    suspend fun saveRotation(rotation: Int, timestamp: String) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.SCREEN_ROTATION] = rotation
            preferences[PreferencesKeys.ROTATION_TIMESTAMP] = timestamp
        }
    }

    // --- Nume Ecran (Cache) ---
    val screenNameFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.CACHED_SCREEN_NAME]
    }

    suspend fun saveScreenName(name: String?) {
        dataStore.edit { preferences ->
            if (name == null) {
                preferences.remove(PreferencesKeys.CACHED_SCREEN_NAME)
            } else {
                preferences[PreferencesKeys.CACHED_SCREEN_NAME] = name
            }
        }
    }

    // --- Nume Playlist (Cache) ---
    val playlistNameFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.CACHED_PLAYLIST_NAME]
    }

    suspend fun savePlaylistName(name: String?) {
        dataStore.edit { preferences ->
            if (name == null) {
                preferences.remove(PreferencesKeys.CACHED_PLAYLIST_NAME)
            } else {
                preferences[PreferencesKeys.CACHED_PLAYLIST_NAME] = name
            }
        }
    }

    // --- Playlist-ul Salvat Local (Cache) ---
    val cachedPlaylistJsonFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.CACHED_PLAYLIST_JSON]
    }

    suspend fun savePlaylistJson(playlistJson: String?) {
        dataStore.edit { preferences ->
            if (playlistJson == null) {
                preferences.remove(PreferencesKeys.CACHED_PLAYLIST_JSON)
            } else {
                preferences[PreferencesKeys.CACHED_PLAYLIST_JSON] = playlistJson
            }
        }
    }

    // --- Versiunea Playlist-ului Salvat Local (Cache) ---
    val cachedPlaylistVersionFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.CACHED_PLAYLIST_VERSION]
    }

    suspend fun savePlaylistVersion(version: String?) {
        dataStore.edit { preferences ->
            if (version == null) {
                preferences.remove(PreferencesKeys.CACHED_PLAYLIST_VERSION)
            } else {
                preferences[PreferencesKeys.CACHED_PLAYLIST_VERSION] = version
            }
        }
    }
}