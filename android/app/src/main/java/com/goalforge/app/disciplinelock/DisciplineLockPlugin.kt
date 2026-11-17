package com.goalforge.app.disciplinelock

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

@CapacitorPlugin(name = "DisciplineLock")
class DisciplineLockPlugin : Plugin() {

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val type = call.getString("type", "all") ?: "all"
        val ctx = context

        val intent: Intent? = when (type) {
            "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            "overlay" -> Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${ctx.packageName}")
            )
            "usage_access" -> Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            "battery" -> Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${ctx.packageName}")
            )
            else -> {
                if (!DisciplineLockManager.isAccessibilityServiceEnabled(ctx)) {
                    Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                } else if (!DisciplineLockManager.canDrawOverlays(ctx)) {
                    Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${ctx.packageName}")
                    )
                } else if (!DisciplineLockManager.isBatteryOptimizationIgnored(ctx)) {
                    Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:${ctx.packageName}")
                    )
                } else {
                    null
                }
            }
        }

        if (intent != null) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(intent)
            } catch (e: Exception) {
                // Fallback to app details settings if specific action isn't supported on OEM ROM
                val fallback = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:${ctx.packageName}")
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                ctx.startActivity(fallback)
            }
        }

        call.resolve(buildPermissionStatusObject())
    }

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        call.resolve(buildPermissionStatusObject())
    }

    @PluginMethod
    fun enableBlocking(call: PluginCall) {
        persistCallSnapshot(call, forceEnabled = true)
        notifyLockUpdated()
        call.resolve(buildLockStatusObject())
    }

    @PluginMethod
    fun disableBlocking(call: PluginCall) {
        DisciplineLockManager.setEnabled(context, false)
        notifyLockUpdated()
        call.resolve(buildLockStatusObject())
    }

    @PluginMethod
    fun updateLockStatus(call: PluginCall) {
        persistCallSnapshot(call, forceEnabled = null)
        notifyLockUpdated()
        call.resolve(buildLockStatusObject())
    }

    @PluginMethod
    fun getLockStatus(call: PluginCall) {
        call.resolve(buildLockStatusObject())
    }

    @PluginMethod
    fun syncGoalCompletion(call: PluginCall) {
        persistCallSnapshot(call, forceEnabled = null)
        notifyLockUpdated()
        call.resolve(buildLockStatusObject())
    }

    @PluginMethod
    fun checkInstagramStatus(call: PluginCall) {
        val state = DisciplineLockManager.getEffectiveLockState(context)
        val installed = DisciplineLockManager.isInstagramInstalled(context)
        val isForeground = DisciplineLockManager.isInstagramForegroundViaUsageStats(context)

        val ret = JSObject().apply {
            put("targetPackage", DisciplineLockManager.TARGET_INSTAGRAM_PACKAGE)
            put("installed", installed)
            put("isForeground", isForeground)
            put("blocked", state.enabled && state.shouldBlock)
            put("isNativeSupported", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun openNativeLockScreen(call: PluginCall) {
        val intent = Intent(context, DisciplineLockActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra(DisciplineLockActivity.EXTRA_PREVIEW_MODE, true)
        }
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    override fun handleOnResume() {
        super.handleOnResume()
        DisciplineLockManager.handleSystemDateOrBootEvent(context)
        notifyListeners("permissionStatusChanged", buildPermissionStatusObject())
        notifyListeners("lockStateChanged", buildLockStatusObject())
    }

    private fun persistCallSnapshot(call: PluginCall, forceEnabled: Boolean?) {
        val current = DisciplineLockManager.getEffectiveLockState(context)
        val enabled = forceEnabled ?: (call.getBoolean("enabled", current.enabled) ?: current.enabled)
        val isLocked = if (!enabled) false else (call.getBoolean("isLocked", current.isLocked) ?: current.isLocked)
        val date = call.getString("date", DisciplineLockManager.todayLocalDate()) ?: DisciplineLockManager.todayLocalDate()
        val lastSyncedAt = call.getString("lastSyncedAt", current.lastSyncedAt) ?: current.lastSyncedAt
        val totalTasks = call.getInt("totalRequiredTasks", current.totalRequiredTasks) ?: current.totalRequiredTasks
        val completedTasks = call.getInt("completedRequiredTasks", current.completedRequiredTasks) ?: current.completedRequiredTasks
        val remainingTasks = call.getInt("remainingRequiredTasks", current.remainingRequiredTasks) ?: current.remainingRequiredTasks
        val overallPct = call.getInt("overallPercentage", current.overallPercentage) ?: current.overallPercentage
        val targetPackage = call.getString("targetPackage", DisciplineLockManager.TARGET_INSTAGRAM_PACKAGE)
            ?: DisciplineLockManager.TARGET_INSTAGRAM_PACKAGE

        val goalsArray: JSArray? = call.getArray("goals")
        val goalsJson = goalsArray?.toString() ?: current.goalsJson

        DisciplineLockManager.saveSnapshot(
            context = context,
            enabled = enabled,
            isLocked = isLocked,
            date = date,
            lastSyncedAt = lastSyncedAt,
            totalTasks = totalTasks,
            completedTasks = completedTasks,
            remainingTasks = remainingTasks,
            overallPercentage = overallPct,
            goalsJson = goalsJson,
            targetPackage = targetPackage
        )
    }

    private fun notifyLockUpdated() {
        val intent = Intent(DisciplineLockManager.ACTION_LOCK_STATE_UPDATED).apply {
            setPackage(context.packageName)
        }
        context.sendBroadcast(intent)
    }

    private fun buildPermissionStatusObject(): JSObject {
        val accessibility = DisciplineLockManager.isAccessibilityServiceEnabled(context)
        val usageStats = DisciplineLockManager.hasUsageStatsPermission(context)
        val overlay = DisciplineLockManager.canDrawOverlays(context)
        val battery = DisciplineLockManager.isBatteryOptimizationIgnored(context)
        val instagramInstalled = DisciplineLockManager.isInstagramInstalled(context)

        return JSObject().apply {
            put("isNativeSupported", true)
            put("accessibilityEnabled", accessibility)
            put("usageStatsGranted", usageStats)
            put("overlayGranted", overlay)
            put("batteryOptimizationIgnored", battery)
            put("instagramInstalled", instagramInstalled)
            put("allCriticalGranted", accessibility)
        }
    }

    private fun buildLockStatusObject(): JSObject {
        val state = DisciplineLockManager.getEffectiveLockState(context)
        val goalsArr = try {
            JSArray(JSONArray(state.goalsJson).toString())
        } catch (e: Exception) {
            JSArray()
        }

        return JSObject().apply {
            put("enabled", state.enabled)
            put("isLocked", state.shouldBlock)
            put("needsRecalculation", state.dailyResetRequired)
            put("date", state.date)
            put("lastEvaluatedDate", state.lastEvaluatedDate)
            put("lastSyncedAt", state.lastSyncedAt)
            put("targetPackage", state.targetPackage)
            put("totalRequiredTasks", state.totalRequiredTasks)
            put("completedRequiredTasks", state.completedRequiredTasks)
            put("remainingRequiredTasks", state.remainingRequiredTasks)
            put("overallPercentage", state.overallPercentage)
            put("goals", goalsArr)
            put("isNativeSupported", true)
        }
    }
}

