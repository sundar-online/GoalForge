package com.goalforge.app.disciplinelock

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import android.text.TextUtils
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class LockSnapshot(
    val enabled: Boolean,
    val isLocked: Boolean,
    val shouldBlock: Boolean,
    val dailyResetRequired: Boolean,
    val date: String,
    val lastEvaluatedDate: String,
    val lastSyncedAt: String,
    val targetPackage: String,
    val totalRequiredTasks: Int,
    val completedRequiredTasks: Int,
    val remainingRequiredTasks: Int,
    val overallPercentage: Int,
    val goalsJson: String
)

object DisciplineLockManager {
    private const val PREFS_NAME = "GoalForgeDisciplineLock"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_IS_LOCKED = "is_locked"
    private const val KEY_LAST_EVALUATED_DATE = "last_evaluated_date"
    private const val KEY_LAST_SYNCED_AT = "last_synced_at"
    private const val KEY_TARGET_PACKAGE = "target_package"
    private const val KEY_TOTAL_TASKS = "total_required_tasks"
    private const val KEY_COMPLETED_TASKS = "completed_required_tasks"
    private const val KEY_REMAINING_TASKS = "remaining_required_tasks"
    private const val KEY_OVERALL_PCT = "overall_percentage"
    private const val KEY_GOALS_JSON = "goals_json"

    const val TARGET_INSTAGRAM_PACKAGE = "com.instagram.android"
    const val ACTION_LOCK_STATE_UPDATED = "com.goalforge.app.DISCIPLINE_LOCK_UPDATED"

    private const val BLOCK_DEBOUNCE_MS = 1500L
    @Volatile
    private var lastBlockTriggerAtMs: Long = 0L

    private fun prefs(context: Context): SharedPreferences {
        return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun todayLocalDate(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return fmt.format(Date())
    }

    fun isEnabled(context: Context): Boolean {
        return prefs(context).getBoolean(KEY_ENABLED, false)
    }

    fun saveSnapshot(
        context: Context,
        enabled: Boolean,
        isLocked: Boolean,
        date: String,
        lastSyncedAt: String,
        totalTasks: Int,
        completedTasks: Int,
        remainingTasks: Int,
        overallPercentage: Int,
        goalsJson: String,
        targetPackage: String = TARGET_INSTAGRAM_PACKAGE
    ) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putBoolean(KEY_IS_LOCKED, isLocked)
            .putString(KEY_LAST_EVALUATED_DATE, date)
            .putString(KEY_LAST_SYNCED_AT, lastSyncedAt)
            .putString(KEY_TARGET_PACKAGE, targetPackage)
            .putInt(KEY_TOTAL_TASKS, totalTasks)
            .putInt(KEY_COMPLETED_TASKS, completedTasks)
            .putInt(KEY_REMAINING_TASKS, remainingTasks)
            .putInt(KEY_OVERALL_PCT, overallPercentage)
            .putString(KEY_GOALS_JSON, goalsJson)
            .apply()
    }

    fun setEnabled(context: Context, enabled: Boolean) {
        val p = prefs(context)
        val editor = p.edit().putBoolean(KEY_ENABLED, enabled)
        if (!enabled) {
            editor.putBoolean(KEY_IS_LOCKED, false)
        }
        editor.apply()
    }

    /**
     * Evaluates effective lock state offline, handling new local calendar days cleanly
     * so an old unlocked snapshot from a previous day is never trusted after midnight.
     */
    fun getEffectiveLockState(context: Context): LockSnapshot {
        val p = prefs(context)
        val today = todayLocalDate()
        val enabled = p.getBoolean(KEY_ENABLED, false)
        val savedLocked = p.getBoolean(KEY_IS_LOCKED, false)
        val lastEvalDate = p.getString(KEY_LAST_EVALUATED_DATE, "") ?: ""
        val lastSyncedAt = p.getString(KEY_LAST_SYNCED_AT, "") ?: ""
        val targetPackage = p.getString(KEY_TARGET_PACKAGE, TARGET_INSTAGRAM_PACKAGE) ?: TARGET_INSTAGRAM_PACKAGE
        val rawGoalsJson = p.getString(KEY_GOALS_JSON, "[]") ?: "[]"

        if (!enabled) {
            return LockSnapshot(
                enabled = false,
                isLocked = false,
                shouldBlock = false,
                dailyResetRequired = false,
                date = today,
                lastEvaluatedDate = lastEvalDate,
                lastSyncedAt = lastSyncedAt,
                targetPackage = targetPackage,
                totalRequiredTasks = 0,
                completedRequiredTasks = 0,
                remainingRequiredTasks = 0,
                overallPercentage = 0,
                goalsJson = rawGoalsJson
            )
        }

        val isStaleDay = lastEvalDate.isNotEmpty() && lastEvalDate != today
        if (isStaleDay) {
            // New day started before React UI refreshed: keep Instagram locked and reset
            // displayed task progress counts to 0% until today's sync lands.
            val totalTasks = p.getInt(KEY_TOTAL_TASKS, 0)
            val resetGoalsJson = resetGoalsForNewDay(rawGoalsJson)
            return LockSnapshot(
                enabled = true,
                isLocked = true,
                shouldBlock = true,
                dailyResetRequired = true,
                date = today,
                lastEvaluatedDate = lastEvalDate,
                lastSyncedAt = lastSyncedAt,
                targetPackage = targetPackage,
                totalRequiredTasks = totalTasks,
                completedRequiredTasks = 0,
                remainingRequiredTasks = totalTasks,
                overallPercentage = 0,
                goalsJson = resetGoalsJson
            )
        }

        val totalTasks = p.getInt(KEY_TOTAL_TASKS, 0)
        val completedTasks = p.getInt(KEY_COMPLETED_TASKS, 0)
        val remainingTasks = p.getInt(KEY_REMAINING_TASKS, 0)
        val overallPct = p.getInt(KEY_OVERALL_PCT, 0)
        val effectiveLocked = if (lastEvalDate.isEmpty()) true else savedLocked

        return LockSnapshot(
            enabled = true,
            isLocked = effectiveLocked,
            shouldBlock = effectiveLocked,
            dailyResetRequired = lastEvalDate.isEmpty(),
            date = today,
            lastEvaluatedDate = lastEvalDate,
            lastSyncedAt = lastSyncedAt,
            targetPackage = targetPackage,
            totalRequiredTasks = totalTasks,
            completedRequiredTasks = completedTasks,
            remainingRequiredTasks = remainingTasks,
            overallPercentage = overallPct,
            goalsJson = rawGoalsJson
        )
    }

    private fun resetGoalsForNewDay(rawGoalsJson: String): String {
        return try {
            val arr = JSONArray(rawGoalsJson)
            val next = JSONArray()
            for (i in 0 until arr.length()) {
                val obj = JSONObject(arr.getJSONObject(i).toString())
                val total = obj.optInt("totalTasks", 0)
                obj.put("completedTasks", 0)
                obj.put("remainingTasks", total)
                obj.put("completionPercentage", 0)
                obj.put("isCompleted", false)
                next.put(obj)
            }
            next.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    fun handleSystemDateOrBootEvent(context: Context) {
        val p = prefs(context)
        if (!p.getBoolean(KEY_ENABLED, false)) return
        val today = todayLocalDate()
        val lastEvalDate = p.getString(KEY_LAST_EVALUATED_DATE, "") ?: ""
        if (lastEvalDate.isNotEmpty() && lastEvalDate != today) {
            val totalTasks = p.getInt(KEY_TOTAL_TASKS, 0)
            val resetGoals = resetGoalsForNewDay(p.getString(KEY_GOALS_JSON, "[]") ?: "[]")
            p.edit()
                .putBoolean(KEY_IS_LOCKED, true)
                .putInt(KEY_COMPLETED_TASKS, 0)
                .putInt(KEY_REMAINING_TASKS, totalTasks)
                .putInt(KEY_OVERALL_PCT, 0)
                .putString(KEY_GOALS_JSON, resetGoals)
                .apply()
        }
    }

    fun shouldTriggerBlockScreen(context: Context): Boolean {
        val state = getEffectiveLockState(context)
        if (!state.shouldBlock) return false
        val now = System.currentTimeMillis()
        if (now - lastBlockTriggerAtMs < BLOCK_DEBOUNCE_MS) {
            return false
        }
        lastBlockTriggerAtMs = now
        return true
    }

    fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val expectedComponent = ComponentName(context, DisciplineAccessibilityService::class.java)
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            val componentStr = splitter.next()
            val component = ComponentName.unflattenFromString(componentStr)
            if (component != null && component == expectedComponent) {
                return true
            }
        }
        return false
    }

    fun hasUsageStatsPermission(context: Context): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            false
        }
    }

    fun canDrawOverlays(context: Context): Boolean {
        return Settings.canDrawOverlays(context)
    }

    fun isBatteryOptimizationIgnored(context: Context): Boolean {
        return try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(context.packageName)
        } catch (e: Exception) {
            false
        }
    }

    fun isInstagramInstalled(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    TARGET_INSTAGRAM_PACKAGE,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(TARGET_INSTAGRAM_PACKAGE, 0)
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    fun isInstagramForegroundViaUsageStats(context: Context): Boolean {
        if (!hasUsageStatsPermission(context)) return false
        return try {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val end = System.currentTimeMillis()
            val start = end - 15_000L
            val events = usm.queryEvents(start, end)
            val event = UsageEvents.Event()
            var lastPkg: String? = null
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    lastPkg = event.packageName
                }
            }
            lastPkg == TARGET_INSTAGRAM_PACKAGE
        } catch (e: Exception) {
            false
        }
    }
}

