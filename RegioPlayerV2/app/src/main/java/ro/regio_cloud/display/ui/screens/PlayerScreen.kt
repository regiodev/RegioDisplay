@file:OptIn(UnstableApi::class, ExperimentalTvMaterial3Api::class)

package ro.regio_cloud.display.ui.screens

import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.ScaleAndRotateTransformation
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil.compose.rememberAsyncImagePainter
import ro.regio_cloud.display.R
import ro.regio_cloud.display.viewmodels.LocalMediaItem

@Composable
fun PlayerScreen(
    playlist: List<LocalMediaItem>,
    currentItem: LocalMediaItem?,
    loopId: Int,
    rotationDegrees: Int,
    // --- AICI ESTE MODIFICAREA ---
    onVideoSequenceEnded: (lastIndex: Int) -> Unit
) {
    android.util.Log.d("PlayerScreen", "🔄 PlayerScreen recomposed - playlist.size=${playlist.size}, currentItem=${currentItem?.file?.name}, loopId=$loopId, rotation=$rotationDegrees")
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        val itemToDisplay = currentItem ?: playlist.firstOrNull()

        if (itemToDisplay == null) {
            Text(text = stringResource(R.string.player_empty_playlist), color = Color.White, fontSize = 24.sp)
        } else {
            if (itemToDisplay.type.startsWith("video/")) {
                val currentVideoIndexInPlaylist = playlist.indexOf(itemToDisplay)
                VideoPlayerWithEffects(
                    fullPlaylist = playlist,
                    startVideoIndex = currentVideoIndexInPlaylist,
                    loopId = loopId,
                    rotationDegrees = rotationDegrees,
                    // --- AICI ESTE MODIFICAREA ---
                    onVideoSequenceEnded = onVideoSequenceEnded // Acum pasăm direct funcția
                )
            } else if (itemToDisplay.type.startsWith("image/")) {
                ImagePlayer(item = itemToDisplay, rotationDegrees = rotationDegrees.toFloat())
            }
        }
    }
}

@Composable
private fun VideoPlayerWithEffects(
    fullPlaylist: List<LocalMediaItem>,
    startVideoIndex: Int,
    loopId: Int,
    rotationDegrees: Int,
    onVideoSequenceEnded: (lastVideoIndex: Int) -> Unit
) {
    val context = LocalContext.current
    var playerView: PlayerView? by remember { mutableStateOf(null) }
    var exoPlayer: ExoPlayer? by remember { mutableStateOf(null) }

    // DisposableEffect cu rotația inclusă - salvează și restaurează starea player-ului
    DisposableEffect(context, fullPlaylist, startVideoIndex, loopId, rotationDegrees) {

        val videoSublist = mutableListOf<LocalMediaItem>()
        if (startVideoIndex >= 0 && startVideoIndex < fullPlaylist.size) {
            for (i in startVideoIndex until fullPlaylist.size) {
                val item = fullPlaylist[i]
                if (item.type.startsWith("video/")) { videoSublist.add(item) } else { break }
            }
        }

        // Dacă nu există videouri de redat în secvența curentă, nu facem nimic
        if (videoSublist.isEmpty()) {
            return@DisposableEffect onDispose {}
        }

        // Salvăm starea player-ului vechi înainte să-l distrugem (pentru smooth transition)
        val oldPlayer = exoPlayer
        val currentPosition = oldPlayer?.currentPosition ?: 0L
        val currentMediaItemIndex = oldPlayer?.currentMediaItemIndex ?: 0
        val wasPlaying = oldPlayer?.isPlaying ?: true

        if (oldPlayer != null) {
            android.util.Log.d("PlayerScreen", "🔄 Recreând player pentru rotație $rotationDegrees°")
            android.util.Log.d("PlayerScreen", "Stare salvată: pozitia=${currentPosition}ms, index=$currentMediaItemIndex, playing=$wasPlaying")
            playerView?.player = null
            oldPlayer.release()
        } else {
            android.util.Log.d("PlayerScreen", "🆕 Creând player nou pentru rotația $rotationDegrees°")
        }

        // Creăm player-ul cu rotația corectă
        val correctedRotation = when (rotationDegrees) {
            90 -> 270f
            270 -> 90f
            else -> rotationDegrees.toFloat()
        }

        val rotationEffect = ScaleAndRotateTransformation.Builder()
            .setRotationDegrees(correctedRotation)
            .build()

        val newPlayer = ExoPlayer.Builder(context).build().apply {
            setVideoEffects(listOf(rotationEffect))
            repeatMode = Player.REPEAT_MODE_OFF
            playWhenReady = wasPlaying
        }
        exoPlayer = newPlayer

        val mediaItems = videoSublist.map { MediaItem.fromUri(Uri.fromFile(it.file)) }
        newPlayer.setMediaItems(mediaItems, currentMediaItemIndex, currentPosition)

        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    val lastPlayedMediaItemUri = newPlayer.getMediaItemAt(newPlayer.mediaItemCount - 1).localConfiguration?.uri.toString()
                    val lastVideoInPlaylistIndex = fullPlaylist.indexOfFirst { Uri.fromFile(it.file).toString() == lastPlayedMediaItemUri }
                    if (lastVideoInPlaylistIndex != -1) {
                        onVideoSequenceEnded(lastVideoInPlaylistIndex)
                    }
                }
            }
        }
        newPlayer.addListener(listener)
        newPlayer.prepare()

        playerView?.player = newPlayer

        android.util.Log.d("PlayerScreen", "✅ Player recreat cu rotația $correctedRotation°")

        onDispose {
            playerView?.player = null
            newPlayer.removeListener(listener)
            newPlayer.release()
            exoPlayer = null
        }
    }

    // AndroidView fără rotația la nivel de UI (se aplică prin video effects)
    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                useController = false
                setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
            }.also {
                playerView = it
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}

@Composable
private fun ImagePlayer(item: LocalMediaItem, rotationDegrees: Float) {
    Image(
        painter = rememberAsyncImagePainter(model = item.file),
        contentDescription = stringResource(R.string.player_image_content_description),
        modifier = Modifier.fillMaxSize().rotate(rotationDegrees),
        contentScale = ContentScale.Fit
    )
}