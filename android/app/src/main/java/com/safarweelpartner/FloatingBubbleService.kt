package com.safarweelpartner

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs

class FloatingBubbleService : Service() {

    private lateinit var windowManager: WindowManager
    private var bubbleView: View? = null
    private var requestOverlayView: View? = null

    private var timerHandler: android.os.Handler? = null
    private var timerRunnable: Runnable? = null
    private var timeTotalMs = 30000L
    private var timeLeftMs = 30000L

    companion object {
        var reactContext: ReactContext? = null
        const val ACTION_START_SERVICE = "ACTION_START_SERVICE"
        const val ACTION_STOP_SERVICE = "ACTION_STOP_SERVICE"
        const val ACTION_SHOW_BUBBLE = "ACTION_SHOW_BUBBLE"
        const val ACTION_HIDE_BUBBLE = "ACTION_HIDE_BUBBLE"
        const val ACTION_SHOW_REQUEST = "ACTION_SHOW_REQUEST"
        const val ACTION_HIDE_REQUEST = "ACTION_HIDE_REQUEST"
        const val ACTION_ACCEPT_REQUEST_FROM_NOTIFICATION = "ACTION_ACCEPT_REQUEST_FROM_NOTIFICATION"
        const val ACTION_DECLINE_REQUEST_FROM_NOTIFICATION = "ACTION_DECLINE_REQUEST_FROM_NOTIFICATION"

        const val EXTRA_FARE = "EXTRA_FARE"
        const val EXTRA_SURGE = "EXTRA_SURGE"
        const val EXTRA_PICKUP_DIST = "EXTRA_PICKUP_DIST"
        const val EXTRA_PICKUP_TIME = "EXTRA_PICKUP_TIME"
        const val EXTRA_PICKUP_ADDR = "EXTRA_PICKUP_ADDR"
        const val EXTRA_DROP_DIST = "EXTRA_DROP_DIST"
        const val EXTRA_DROP_ADDR = "EXTRA_DROP_ADDR"
        const val EXTRA_VEHICLE_TYPE = "EXTRA_VEHICLE_TYPE"
        const val EXTRA_DURATION = "EXTRA_DURATION"

        const val EXTRA_PICKUP = "EXTRA_PICKUP"
        const val EXTRA_DROP = "EXTRA_DROP"

        private const val CHANNEL_ID = "safarweel_partner_online"
        private const val REQUEST_CHANNEL_ID = "safarweel_ride_requests"
        private const val NOTIFICATION_ID = 1001
        private const val REQUEST_NOTIFICATION_ID = 1002
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForegroundNotification()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val onlineChannel = NotificationChannel(
                CHANNEL_ID,
                "Safarweel Partner Online",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when driver is online and available for rides"
                setShowBadge(false)
            }
            manager.createNotificationChannel(onlineChannel)

            val requestChannel = NotificationChannel(
                REQUEST_CHANNEL_ID,
                "Safarweel Ride Requests",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows heads-up notifications for new incoming ride requests"
                enableLights(true)
                lightColor = Color.BLUE
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(requestChannel)
        }
    }

    private fun startForegroundNotification() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val smallIconRes = resources.getIdentifier("ic_app_logo", "drawable", packageName).let {
            if (it != 0) it else resources.getIdentifier("ic_launcher", "mipmap", packageName)
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Safarweel Partner")
            .setContentText("You are online — waiting for ride requests")
            .setSmallIcon(if (smallIconRes != 0) smallIconRes else android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        android.util.Log.d("FloatingBubbleService", "Foreground service started with notification")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_SERVICE -> {
                android.util.Log.d("FloatingBubbleService", "Service container started")
                val prefs = getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
                val isLoggedIn = prefs.getBoolean("is_logged_in", false)
                if (!isLoggedIn) {
                    android.util.Log.w("FloatingBubbleService", "Service container started while logged out — stopping service")
                    removeFloatingBubble()
                    removeRequestOverlay()
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                }
            }
            ACTION_SHOW_BUBBLE -> {
                android.util.Log.d("FloatingBubbleService", "ACTION_SHOW_BUBBLE received")
                val prefs = getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
                val isLoggedIn = prefs.getBoolean("is_logged_in", false)
                val wasAccepted = prefs.getBoolean("ride_accepted_via_overlay", false)
                if (isLoggedIn && !wasAccepted) {
                    createFloatingBubble()
                } else {
                    android.util.Log.d("FloatingBubbleService", "Skipping show bubble — isLoggedIn=$isLoggedIn, wasAccepted=$wasAccepted")
                }
            }
            ACTION_HIDE_BUBBLE -> {
                android.util.Log.d("FloatingBubbleService", "ACTION_HIDE_BUBBLE received")
                removeFloatingBubble()
            }
            ACTION_STOP_SERVICE -> {
                android.util.Log.d("FloatingBubbleService", "ACTION_STOP_SERVICE received")
                removeFloatingBubble()
                removeRequestOverlay()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_SHOW_REQUEST -> {
                val fare = intent.getStringExtra(EXTRA_FARE) ?: "₹0"
                val surge = intent.getStringExtra(EXTRA_SURGE) ?: ""
                val pickupDist = intent.getStringExtra(EXTRA_PICKUP_DIST) ?: "0 Km"
                val pickupTime = intent.getStringExtra(EXTRA_PICKUP_TIME) ?: "0 mins"
                val pickupAddr = intent.getStringExtra(EXTRA_PICKUP_ADDR) ?: ""
                val dropDist = intent.getStringExtra(EXTRA_DROP_DIST) ?: "0 Km"
                val dropAddr = intent.getStringExtra(EXTRA_DROP_ADDR) ?: ""
                val vehicleType = intent.getStringExtra(EXTRA_VEHICLE_TYPE) ?: "Bike"
                val duration = intent.getIntExtra(EXTRA_DURATION, 60)

                showIncomingRequestOverlay(
                    fare, surge, pickupDist, pickupTime, pickupAddr,
                    dropDist, dropAddr, vehicleType, duration
                )
            }
            ACTION_HIDE_REQUEST -> {
                removeRequestOverlay()
            }
            ACTION_ACCEPT_REQUEST_FROM_NOTIFICATION -> {
                android.util.Log.d("FloatingBubbleService", "ACTION_ACCEPT_REQUEST_FROM_NOTIFICATION received")
                // Mark that the ride was accepted via overlay BEFORE opening the app.
                // JS-side useFcmToken will read this flag and skip showing the overlay again.
                getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
                    .edit()
                    .putBoolean("ride_accepted_via_overlay", true)
                    .apply()
                sendEventToRN("onFloatingRequestAccept", null)
                removeRequestOverlay()
                removeFloatingBubble()
                openApp()
            }
            ACTION_DECLINE_REQUEST_FROM_NOTIFICATION -> {
                android.util.Log.d("FloatingBubbleService", "ACTION_DECLINE_REQUEST_FROM_NOTIFICATION received")
                sendEventToRN("onFloatingRequestDecline", null)
                removeRequestOverlay()
                restoreBubbleIfNeeded()
            }
        }
        return START_STICKY
    }

    private fun createFloatingBubble() {
        val prefs = getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("is_logged_in", false)) {
            android.util.Log.w("FloatingBubbleService", "User is logged out, refusing to create bubble")
            removeFloatingBubble()
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            android.util.Log.w("FloatingBubbleService", "Overlay permission not granted, cannot create bubble")
            return
        }
        if (bubbleView != null) {
            android.util.Log.d("FloatingBubbleService", "Bubble already exists, skipping")
            return
        }

        android.util.Log.d("FloatingBubbleService", "Creating floating bubble...")

        // 1. Programmatically design the circular bubble layout
        val bubbleSize = dpToPx(60)
        val container = FrameLayout(this)
        
        // Circular shape background
        val shape = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.WHITE)
            setStroke(dpToPx(2), Color.parseColor("#fe4c01"))
        }
        container.background = shape
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            container.clipToOutline = true
        }

        // App Logo ImageView inside (full rounded circle)
        val logoImageView = android.widget.ImageView(this).apply {
            val logoResId = resources.getIdentifier("ic_app_logo", "drawable", packageName).let {
                if (it != 0) it else resources.getIdentifier("ic_launcher_round", "mipmap", packageName).let { mId ->
                    if (mId != 0) mId else resources.getIdentifier("ic_launcher", "mipmap", packageName)
                }
            }
            if (logoResId != 0) {
                setImageResource(logoResId)
            } else {
                setImageResource(android.R.drawable.sym_def_app_icon)
            }
            scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
            setPadding(0, 0, 0, 0)
        }
        val imageParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        container.addView(logoImageView, imageParams)

        // 2. Set window manager layout params
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 100
            y = 300
        }

        bubbleView = container

        // 3. Set Touch/Drag listener
        container.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var startClickTime = 0L

            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                if (event == null) return false
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        startClickTime = System.currentTimeMillis()
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params.x = initialX + (event.rawX - initialTouchX).toInt()
                        params.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(bubbleView, params)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val duration = System.currentTimeMillis() - startClickTime
                        val movedX = abs(event.rawX - initialTouchX)
                        val movedY = abs(event.rawY - initialTouchY)
                        // If tiny move and short duration, treat as tap
                        if (movedX < 10 && movedY < 10 && duration < 300) {
                            openApp()
                        }
                        return true
                    }
                }
                return false
            }
        })

        // 4. Add to window
        try {
            windowManager.addView(bubbleView, params)
            android.util.Log.d("FloatingBubbleService", "Bubble added to window successfully")
        } catch (e: Exception) {
            android.util.Log.e("FloatingBubbleService", "Failed to add bubble: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun removeFloatingBubble() {
        bubbleView?.let {
            try {
                windowManager.removeView(it)
                android.util.Log.d("FloatingBubbleService", "Bubble removed from window")
            } catch (e: Exception) {
                e.printStackTrace()
            }
            bubbleView = null
        }
    }

    private fun showIncomingRequestOverlay(
        fare: String,
        surge: String,
        pickupDist: String,
        pickupTime: String,
        pickupAddress: String,
        dropDist: String,
        dropAddress: String,
        vehicleType: String,
        durationSeconds: Int
    ) {
        val prefs = getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("is_logged_in", false)) {
            android.util.Log.w("FloatingBubbleService", "User is logged out, refusing to show request overlay")
            removeRequestOverlay()
            removeFloatingBubble()
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            android.util.Log.w("FloatingBubbleService", "Overlay permission not granted, cannot show request overlay")
            return
        }
        if (requestOverlayView != null) {
            removeRequestOverlay()
        }
        removeFloatingBubble()

        // 1. Programmatic alert card layout
        val wrapper = FrameLayout(this)

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16))
            gravity = Gravity.NO_GRAVITY
        }

        try {
            // Rounded corners card effect with green border
            val bgDrawable = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = dpToPx(16).toFloat()
                setStroke(dpToPx(2), Color.parseColor("#34D399")) // mint green border
            }
            container.background = bgDrawable

            val containerParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                leftMargin = dpToPx(16)
                rightMargin = dpToPx(16)
                topMargin = dpToPx(8)
                bottomMargin = dpToPx(8)
            }
            wrapper.addView(container, containerParams)

            // Top Row: Vehicle badge
            val badgeContainer = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
            }
            val badge = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#F3F4F6"))
                    cornerRadius = dpToPx(8).toFloat()
                }
            }

            // Vehicle icon image from local resource drawable
            val vehicleImageView = android.widget.ImageView(this).apply {
                val lp = LinearLayout.LayoutParams(dpToPx(16), dpToPx(16)).apply {
                    rightMargin = dpToPx(6)
                }
                layoutParams = lp
                scaleType = android.widget.ImageView.ScaleType.FIT_CENTER

                val drawableName = when (vehicleType.lowercase(java.util.Locale.ROOT)) {
                    "auto" -> "ic_auto"
                    "cab", "car" -> "ic_car"
                    else -> "ic_bike"
                }
                val drawableId = resources.getIdentifier(drawableName, "drawable", packageName)
                if (drawableId != 0) {
                    setImageResource(drawableId)
                } else {
                    setImageResource(android.R.drawable.ic_menu_directions)
                }
            }
            badge.addView(vehicleImageView)

            val badgeText = TextView(this).apply {
                text = vehicleType
                setTextColor(Color.parseColor("#4B5563"))
                textSize = 12f
                typeface = Typeface.DEFAULT_BOLD
            }
            badge.addView(badgeText)
            badgeContainer.addView(badge)
            container.addView(badgeContainer)

            // Fare Row: e.g. ₹44 + ₹3
            val fareLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dpToPx(8), 0, dpToPx(8))
            }
            val fareTv = TextView(this).apply {
                text = fare
                setTextColor(Color.parseColor("#111827"))
                typeface = Typeface.create("sans-serif-black", Typeface.BOLD)
                textSize = 28f
            }
            fareLayout.addView(fareTv)

            if (surge.isNotEmpty()) {
                val plusTv = TextView(this).apply {
                    text = " + "
                    setTextColor(Color.parseColor("#111827"))
                    typeface = Typeface.create("sans-serif-black", Typeface.BOLD)
                    textSize = 28f
                }
                fareLayout.addView(plusTv)

                val surgeTv = TextView(this).apply {
                    text = surge
                    setTextColor(Color.parseColor("#10B981")) // green color
                    typeface = Typeface.create("sans-serif-black", Typeface.BOLD)
                    textSize = 28f
                }
                fareLayout.addView(surgeTv)
            }
            container.addView(fareLayout)

            // Route timeline layout
            val routeLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, dpToPx(4), 0, dpToPx(16))
            }

            // Left column: Timeline indicators
            val timelineLeft = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                val lp = LinearLayout.LayoutParams(dpToPx(24), LinearLayout.LayoutParams.MATCH_PARENT)
                layoutParams = lp
            }

            val topDot = View(this).apply {
                val lp = LinearLayout.LayoutParams(dpToPx(8), dpToPx(8)).apply {
                    topMargin = dpToPx(6)
                }
                layoutParams = lp
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.BLACK)
                }
            }
            timelineLeft.addView(topDot)

            val line = View(this).apply {
                val lp = LinearLayout.LayoutParams(dpToPx(2), dpToPx(44))
                layoutParams = lp
                setBackgroundColor(Color.parseColor("#E5E7EB"))
            }
            timelineLeft.addView(line)

            val bottomArrow = TextView(this).apply {
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                layoutParams = lp
                text = "▼"
                setTextColor(Color.BLACK)
                textSize = 10f
            }
            timelineLeft.addView(bottomArrow)
            routeLayout.addView(timelineLeft)

            // Right column: Texts
            val timelineRight = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                layoutParams = lp
            }

            val pickupTitleTv = TextView(this).apply {
                text = "$pickupDist ($pickupTime)"
                setTextColor(Color.BLACK)
                typeface = Typeface.DEFAULT_BOLD
                textSize = 15f
            }
            timelineRight.addView(pickupTitleTv)

            val pickupAddressTv = TextView(this).apply {
                text = pickupAddress
                setTextColor(Color.parseColor("#4B5563"))
                textSize = 12f
                setPadding(0, dpToPx(2), 0, dpToPx(8))
            }
            timelineRight.addView(pickupAddressTv)

            val dropTitleTv = TextView(this).apply {
                text = dropDist
                setTextColor(Color.BLACK)
                typeface = Typeface.DEFAULT_BOLD
                textSize = 15f
            }
            timelineRight.addView(dropTitleTv)

            val dropAddressTv = TextView(this).apply {
                text = dropAddress
                setTextColor(Color.parseColor("#4B5563"))
                textSize = 12f
                setPadding(0, dpToPx(2), 0, 0)
            }
            routeLayout.addView(timelineRight)
            timelineRight.addView(dropAddressTv)

            container.addView(routeLayout)

            // Bottom Row: Timer & Accept Button
            val bottomRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            val timerSize = dpToPx(48)
            val circularTimer = CircularTimerView(this).apply {
                val lp = LinearLayout.LayoutParams(timerSize, timerSize)
                layoutParams = lp
                setOnClickListener {
                    sendEventToRN("onFloatingRequestDecline", null)
                    removeRequestOverlay()
                    restoreBubbleIfNeeded()
                }
            }
            bottomRow.addView(circularTimer)

            val spacer = View(this).apply {
                val lp = LinearLayout.LayoutParams(dpToPx(16), 1)
                layoutParams = lp
            }
            bottomRow.addView(spacer)

            val acceptButton = Button(this).apply {
                text = "Accept"
                textSize = 16f
                isAllCaps = false
                setTextColor(Color.WHITE)
                typeface = Typeface.DEFAULT_BOLD
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#fe4c01")) // orange color
                    cornerRadius = dpToPx(24).toFloat()
                }
                val lp = LinearLayout.LayoutParams(0, dpToPx(48), 1f)
                layoutParams = lp
                setOnClickListener {
                    // Mark that the ride was accepted via overlay BEFORE opening the app.
                    // JS-side useFcmToken will read this flag and skip showing the overlay again.
                    context.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
                        .edit()
                        .putBoolean("ride_accepted_via_overlay", true)
                        .apply()
                    sendEventToRN("onFloatingRequestAccept", null)
                    removeRequestOverlay()
                    removeFloatingBubble()
                    openApp()
                }
            }
            bottomRow.addView(acceptButton)
            container.addView(bottomRow)

            // 2. Overlay Layout Params
            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP
                x = 0
                y = dpToPx(32) // Render below status bar area
            }

            requestOverlayView = wrapper

            // 3. Add to window
            windowManager.addView(requestOverlayView, params)
            startOverlayTimer(durationSeconds, circularTimer)
        } catch (e: Exception) {
            android.util.Log.e("FloatingBubbleService", "Error showing incoming request overlay: ${e.message}", e)
        }
    }

    private fun startOverlayTimer(durationSeconds: Int, timerView: CircularTimerView) {
        stopOverlayTimer()
        timeTotalMs = durationSeconds * 1000L
        timeLeftMs = timeTotalMs

        timerHandler = android.os.Handler(android.os.Looper.getMainLooper())
        timerRunnable = object : Runnable {
            override fun run() {
                timeLeftMs -= 100L
                if (timeLeftMs <= 0) {
                    timerView.progress = 0f
                    sendEventToRN("onFloatingRequestTimeout", null)
                    removeRequestOverlay()
                    restoreBubbleIfNeeded()
                } else {
                    timerView.progress = timeLeftMs.toFloat() / timeTotalMs.toFloat()
                    timerHandler?.postDelayed(this, 100)
                }
            }
        }
        timerHandler?.postDelayed(timerRunnable!!, 100)
    }

    private fun stopOverlayTimer() {
        timerRunnable?.let { timerHandler?.removeCallbacks(it) }
        timerRunnable = null
        timerHandler = null
    }

    private fun removeRequestOverlay() {
        stopOverlayTimer()
        requestOverlayView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            requestOverlayView = null
        }
    }

    private fun openApp() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        launchIntent?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(it)
        }
    }

    private fun sendEventToRN(eventName: String, params: WritableMap?) {
        try {
            val context = reactContext
            if (context != null && context.hasActiveReactInstance()) {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params ?: Arguments.createMap())
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    private fun restoreBubbleIfNeeded() {
        val prefs = getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
        val isLoggedIn = prefs.getBoolean("is_logged_in", false)
        val wasAccepted = prefs.getBoolean("ride_accepted_via_overlay", false)
        if (isLoggedIn && !wasAccepted) {
            createFloatingBubble()
        }
    }

    override fun onDestroy() {
        removeFloatingBubble()
        removeRequestOverlay()
        super.onDestroy()
    }
}

class CircularTimerView(context: Context) : android.view.View(context) {
    private val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
    private val rectF = android.graphics.RectF()
    var progress: Float = 1.0f // 1.0 (full) to 0.0 (empty)
        set(value) {
            field = value
            invalidate()
        }

    override fun onDraw(canvas: android.graphics.Canvas) {
        super.onDraw(canvas)

        val w = width.toFloat()
        val h = height.toFloat()
        val size = Math.min(w, h)
        val stroke = size * 0.08f
        val radius = (size - stroke) / 2f
        val cx = w / 2f
        val cy = h / 2f

        // Draw background grey circle
        paint.color = android.graphics.Color.parseColor("#E5E7EB")
        paint.style = android.graphics.Paint.Style.STROKE
        paint.strokeWidth = stroke
        canvas.drawCircle(cx, cy, radius, paint)

        // Draw foreground red arc
        paint.color = android.graphics.Color.parseColor("#EF4444") // red
        paint.strokeCap = android.graphics.Paint.Cap.ROUND
        rectF.set(cx - radius, cy - radius, cx + radius, cy + radius)
        val sweepAngle = 360f * progress
        canvas.drawArc(rectF, -90f, sweepAngle, false, paint)

        // Draw minus sign in the center
        paint.color = android.graphics.Color.parseColor("#4B5563") // dark grey
        paint.style = android.graphics.Paint.Style.STROKE
        paint.strokeWidth = size * 0.06f
        val lineLen = size * 0.20f
        canvas.drawLine(cx - lineLen, cy, cx + lineLen, cy, paint)
    }
}
