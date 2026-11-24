package com.dispicapaul.photos.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.dispicapaul.photos.ui.theme.PhotosThemeMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.photosDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "photos_preferences"
)

class ThemePreferences(private val context: Context) {

    private val themeKey = stringPreferencesKey("theme_mode")
    private val includedFoldersKey = stringSetPreferencesKey("included_folders")

    val themeModeFlow: Flow<PhotosThemeMode> = context.photosDataStore.data.map { prefs ->
        val raw = prefs[themeKey]
        PhotosThemeMode.entries.firstOrNull { it.name == raw } ?: PhotosThemeMode.TRUE_AMOLED_BLACK
    }

    val includedFoldersFlow: Flow<Set<String>> = context.photosDataStore.data.map { prefs ->
        prefs[includedFoldersKey] ?: MediaRepository.DEFAULT_INCLUDED_PREFIXES
    }

    suspend fun saveThemeMode(mode: PhotosThemeMode) {
        context.photosDataStore.edit { prefs ->
            prefs[themeKey] = mode.name
        }
    }

    suspend fun saveIncludedFolders(prefixes: Set<String>) {
        context.photosDataStore.edit { prefs ->
            prefs[includedFoldersKey] = prefixes
        }
    }
}
