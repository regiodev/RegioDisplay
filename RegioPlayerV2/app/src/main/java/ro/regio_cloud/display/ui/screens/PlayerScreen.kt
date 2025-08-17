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

    // DisposableEffect gestionează ciclul de viață complet al player-ului.
    // Se va re-executa de la zero (distrugând player-ul vechi) dacă oricare cheie se schimbă.
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

        val correctedRotation = when (rotationDegrees) {
            90 -> 270f
            270 -> 90f
            else -> rotationDegrees.toFloat()
        }

        val rotationEffect = ScaleAndRotateTransformation.Builder()
            .setRotationDegrees(correctedRotation)
            .build()

        val exoPlayer = ExoPlayer.Builder(context).build().apply {
            setVideoEffects(listOf(rotationEffect))
            repeatMode = Player.REPEAT_MODE_OFF
            playWhenReady = true
        }

        val mediaItems = videoSublist.map { MediaItem.fromUri(Uri.fromFile(it.file)) }
        exoPlayer.setMediaItems(mediaItems, 0, 0)

        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    val lastPlayedMediaItemUri = exoPlayer.getMediaItemAt(exoPlayer.mediaItemCount - 1).localConfiguration?.uri.toString()
                    val lastVideoInPlaylistIndex = fullPlaylist.indexOfFirst { Uri.fromFile(it.file).toString() == lastPlayedMediaItemUri }
                    if (lastVideoInPlaylistIndex != -1) {
                        onVideoSequenceEnded(lastVideoInPlaylistIndex)
                    }
                }
            }
        }
        exoPlayer.addListener(listener)
        exoPlayer.prepare()

        playerView?.player = exoPlayer

        // onDispose este blocul de curățare. Se execută când compozabilul dispare
        // sau când una dintre cheile efectului (ex: rotationDegrees) se schimbă.
        onDispose {
            playerView?.player = null
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    // AndroidView va găzdui PlayerView-ul nostru.
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