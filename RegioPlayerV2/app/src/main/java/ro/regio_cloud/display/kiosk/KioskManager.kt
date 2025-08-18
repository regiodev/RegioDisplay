package ro.regio_cloud.display.kiosk

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import ro.regio_cloud.display.BootReceiver
import ro.regio_cloud.display.MainActivity

class KioskManager(private val context: Context) {

    private val defaultUEH = Thread.getDefaultUncaughtExceptionHandler()

    fun setBootReceiverState(enabled: Boolean) {
        val receiver = ComponentName(context, BootReceiver::class.java)
        val newState = if (enabled) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        context.packageManager.setComponentEnabledSetting(receiver, newState, PackageManager.DONT_KILL_APP)
    }

    fun setAutoRelaunchState(enabled: Boolean) {
        if (enabled) {
            Thread.setDefaultUncaughtExceptionHandler(
                GlobalExceptionHandler(context, defaultUEH, MainActivity::class.java)
            )
        } else {
            Thread.setDefaultUncaughtExceptionHandler(defaultUEH)
        }
    }
}