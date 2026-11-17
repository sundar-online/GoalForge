package com.goalforge.app.disciplinelock

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/**
 * Lightweight AccessibilityService configured specifically for com.instagram.android
 * with android:canRetrieveWindowContent="false".
 *
 * Only detects foreground launch events of Instagram; never reads screen text,
 * messages, keystrokes, or unrelated application data.
 */
class DisciplineAccessibilityService : AccessibilityService() {

    @Volatile
    private var serviceConnected = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        serviceConnected = true
        DisciplineLockManager.handleSystemDateOrBootEvent(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!serviceConnected || event == null) return

        // When OFF: perform zero background processing or blocking.
        if (!DisciplineLockManager.isEnabled(this)) return

        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkgName = event.packageName?.toString() ?: return
        if (pkgName != DisciplineLockManager.TARGET_INSTAGRAM_PACKAGE) return

        // Double check effective offline lock state (including midnight date rollover).
        if (DisciplineLockManager.shouldTriggerBlockScreen(this)) {
            val intent = Intent(this, DisciplineLockActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                )
            }
            try {
                startActivity(intent)
            } catch (e: Exception) {
                // On strict OEM background launch policies, user is guided to grant Overlay permission.
            }
        }
    }

    override fun onInterrupt() {
        // No continuous stream to tear down.
    }

    override fun onUnbind(intent: Intent?): Boolean {
        serviceConnected = false
        return super.onUnbind(intent)
    }
}

