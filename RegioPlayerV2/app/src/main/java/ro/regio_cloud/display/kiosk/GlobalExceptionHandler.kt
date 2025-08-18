package ro.regio_cloud.display.kiosk

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import ro.regio_cloud.display.MainActivity
import kotlin.system.exitProcess

class GlobalExceptionHandler(
    private val context: Context,
    private val defaultUEH: Thread.UncaughtExceptionHandler?,
    private val activityToLaunch: Class<*>
) : Thread.UncaughtExceptionHandler {

    override fun uncaughtException(thread: Thread, e: Throwable) {
        Log.e("GlobalExceptionHandler", "Uncaught exception: ", e)

        // Creăm un intent pentru a reporni aplicația
        val intent = Intent(context, activityToLaunch)
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)

        val pendingIntent = PendingIntent.getActivity(
            context.applicationContext,
            0,
            intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        // Setăm o alarmă pentru a lansa intentul după 1 secundă
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 1000, pendingIntent)

        // Lăsăm handler-ul default să proceseze excepția (ex: pentru raportare de crash)
        defaultUEH?.uncaughtException(thread, e)

        // Închidem procesul curent
        exitProcess(2)
    }
}