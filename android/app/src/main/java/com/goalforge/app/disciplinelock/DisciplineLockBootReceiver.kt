package com.goalforge.app.disciplinelock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restores and re-evaluates Discipline Lock daily state after device reboot,
 * app update, calendar day rollover, or timezone changes.
 */
class DisciplineLockBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val action = intent.action ?: return

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED -> {
                DisciplineLockManager.handleSystemDateOrBootEvent(context)
                val updateIntent = Intent(DisciplineLockManager.ACTION_LOCK_STATE_UPDATED).apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(updateIntent)
            }
        }
    }
}

