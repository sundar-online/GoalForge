package com.goalforge.app.disciplinelock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Bundle
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.goalforge.app.MainActivity
import com.goalforge.app.R
import org.json.JSONArray

/**
 * Pure-black GoalForge native blocking screen shown when Instagram is launched
 * while Discipline Lock is enabled and required daily tasks are incomplete.
 */
class DisciplineLockActivity : AppCompatActivity() {

    private lateinit var tvLockBadge: TextView
    private lateinit var llGoalCirclesContainer: LinearLayout
    private lateinit var tvEmptyGoalsHint: TextView
    private lateinit var tvPromptMessage: TextView
    private lateinit var tvCompletedTasks: TextView
    private lateinit var tvTotalTasks: TextView
    private lateinit var tvRemainingTasks: TextView
    private lateinit var tvStatusFooter: TextView
    private lateinit var btnOpenGoalForge: Button

    private val lockUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            renderLockState()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_discipline_lock)

        tvLockBadge = findViewById(R.id.tvLockBadge)
        llGoalCirclesContainer = findViewById(R.id.llGoalCirclesContainer)
        tvEmptyGoalsHint = findViewById(R.id.tvEmptyGoalsHint)
        tvPromptMessage = findViewById(R.id.tvPromptMessage)
        tvCompletedTasks = findViewById(R.id.tvCompletedTasks)
        tvTotalTasks = findViewById(R.id.tvTotalTasks)
        tvRemainingTasks = findViewById(R.id.tvRemainingTasks)
        tvStatusFooter = findViewById(R.id.tvStatusFooter)
        btnOpenGoalForge = findViewById(R.id.btnOpenGoalForge)

        val isPreview = intent?.getBooleanExtra(EXTRA_PREVIEW_MODE, false) == true

        btnOpenGoalForge.setOnClickListener {
            val state = DisciplineLockManager.getEffectiveLockState(this)
            if (isPreview) {
                finish()
                return@setOnClickListener
            }
            if (state.enabled && !state.shouldBlock) {
                // Discipline unlocked -> allow user to proceed back to Instagram or close overlay.
                finish()
            } else {
                val mainIntent = Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
                startActivity(mainIntent)
                finish()
            }
        }

        // Prevent Back button from dropping straight back into blocked Instagram.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val state = DisciplineLockManager.getEffectiveLockState(this@DisciplineLockActivity)
                if (isPreview || !state.shouldBlock) {
                    finish()
                } else {
                    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    startActivity(homeIntent)
                    finish()
                }
            }
        })

        renderLockState()
    }

    override fun onStart() {
        super.onStart()
        ContextCompat.registerReceiver(
            this,
            lockUpdateReceiver,
            IntentFilter(DisciplineLockManager.ACTION_LOCK_STATE_UPDATED),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun onResume() {
        super.onResume()
        renderLockState()
    }

    override fun onStop() {
        try {
            unregisterReceiver(lockUpdateReceiver)
        } catch (e: Exception) {
            // Receiver already unregistered
        }
        super.onStop()
    }

    private fun renderLockState() {
        val state = DisciplineLockManager.getEffectiveLockState(this)
        val isPreview = intent?.getBooleanExtra(EXTRA_PREVIEW_MODE, false) == true

        if (!state.enabled && !isPreview) {
            finish()
            return
        }

        val unlocked = !state.shouldBlock
        tvCompletedTasks.text = state.completedRequiredTasks.toString()
        tvTotalTasks.text = state.totalRequiredTasks.toString()
        tvRemainingTasks.text = state.remainingRequiredTasks.toString()

        if (unlocked && state.enabled) {
            tvLockBadge.text = "Discipline unlocked!"
            tvLockBadge.setTextColor(Color.parseColor("#22C55E"))
            tvPromptMessage.text = "Discipline unlocked!"
            tvStatusFooter.text = "STATUS: Discipline unlocked!"
            btnOpenGoalForge.text = if (isPreview) "Close Preview" else "Continue to Instagram"
        } else {
            tvLockBadge.text = "Instagram Locked."
            tvLockBadge.setTextColor(Color.parseColor("#4D7CFF"))
            tvPromptMessage.text = "Complete your goals before scrolling."
            tvStatusFooter.text = "STATUS: Instagram Locked."
            btnOpenGoalForge.text = if (isPreview) "Close Preview" else "Complete Tasks in GoalForge"
        }

        renderGoalCircles(state.goalsJson, state.totalRequiredTasks)
    }

    private fun renderGoalCircles(goalsJson: String, totalRequiredTasks: Int) {
        llGoalCirclesContainer.removeAllViews()
        val arr = try {
            JSONArray(goalsJson)
        } catch (e: Exception) {
            JSONArray()
        }

        if (arr.length() == 0) {
            tvEmptyGoalsHint.visibility = View.VISIBLE
            return
        }
        tvEmptyGoalsHint.visibility = if (totalRequiredTasks == 0) View.VISIBLE else View.GONE

        val density = resources.displayMetrics.density
        val ringSizePx = (if (arr.length() <= 2) 114 * density else 96 * density).toInt()
        val count = minOf(arr.length(), 3)

        for (i in 0 until count) {
            val obj = arr.getJSONObject(i)
            val title = obj.optString("title", "Goal")
            val pct = obj.optInt("completionPercentage", 0)
            val done = obj.optInt("completedTasks", 0)
            val total = obj.optInt("totalTasks", 0)
            val isRestDay = obj.optBoolean("isRestDay", false)

            val column = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                ).apply {
                    marginStart = (4 * density).toInt()
                    marginEnd = (4 * density).toInt()
                }
            }

            val ring = GoalRingView(this).apply {
                layoutParams = LinearLayout.LayoutParams(ringSizePx, ringSizePx)
                val sub = if (isRestDay) "Rest" else "$done/$total"
                setProgressData(pct, sub)
            }

            val label = TextView(this).apply {
                text = title
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                gravity = Gravity.CENTER
                maxLines = 2
                ellipsize = TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (8 * density).toInt()
                }
            }

            column.addView(ring)
            column.addView(label)
            llGoalCirclesContainer.addView(column)
        }
    }

    companion object {
        const val EXTRA_PREVIEW_MODE = "extra_preview_mode"
    }
}

