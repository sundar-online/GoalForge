package com.goalforge.app.disciplinelock

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator

/**
 * Animated pure-black circular progress indicator matching GoalForge's Discipline Lock UI.
 */
class GoalRingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var targetProgress = 0f
    private var animatedProgress = 0f

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = Color.argb(28, 255, 255, 255)
        strokeCap = Paint.Cap.ROUND
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = Color.parseColor("#4D7CFF")
        strokeCap = Paint.Cap.ROUND
    }

    private val pctPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }

    private val subPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(140, 255, 255, 255)
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }

    private val oval = RectF()
    private var subtitleText: String = "0/0"

    fun setProgressData(percentage: Int, subtitle: String) {
        val clamped = percentage.coerceIn(0, 100).toFloat()
        subtitleText = subtitle
        progressPaint.color = when {
            clamped >= 100f -> Color.parseColor("#22C55E")
            clamped >= 50f -> Color.parseColor("#4D7CFF")
            clamped > 0f -> Color.parseColor("#F59E0B")
            else -> Color.parseColor("#EF4444")
        }

        if (clamped == targetProgress && animatedProgress == clamped) {
            invalidate()
            return
        }
        targetProgress = clamped
        ValueAnimator.ofFloat(animatedProgress, clamped).apply {
            duration = 450L
            interpolator = DecelerateInterpolator()
            addUpdateListener { anim ->
                animatedProgress = anim.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val density = resources.displayMetrics.density
        val stroke = 8f * density
        trackPaint.strokeWidth = stroke
        progressPaint.strokeWidth = stroke
        pctPaint.textSize = 18f * resources.displayMetrics.scaledDensity
        subPaint.textSize = 10f * resources.displayMetrics.scaledDensity

        val pad = stroke / 2f + 4f
        val size = minOf(width, height).toFloat()
        val left = (width - size) / 2f + pad
        val top = (height - size) / 2f + pad
        oval.set(left, top, left + size - 2f * pad, top + size - 2f * pad)

        canvas.drawArc(oval, 0f, 360f, false, trackPaint)
        val sweep = (animatedProgress / 100f) * 360f
        if (sweep > 0f) {
            canvas.drawArc(oval, -90f, sweep, false, progressPaint)
        }

        val cx = width / 2f
        val cy = height / 2f
        canvas.drawText("${animatedProgress.toInt()}%", cx, cy + 4f * density, pctPaint)
        canvas.drawText(subtitleText, cx, cy + 19f * density, subPaint)
    }
}

