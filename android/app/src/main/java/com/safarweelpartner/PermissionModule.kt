package com.safarweelpartner

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.*
import android.media.MediaPlayer
import android.app.Activity
import android.view.View

class PermissionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private var mediaPlayer: MediaPlayer? = null
    private var isDriverOnline: Boolean = false
    private var isAppInForeground: Boolean = true

    init {
        FloatingBubbleService.reactContext = reactContext
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = "PermissionModule"

    // ── Lifecycle callbacks ─────────────────────────────────────────────────
    // These fire when the React Native activity goes to background/foreground

    override fun onHostResume() {
        android.util.Log.d("PermissionModule", "onHostResume — isDriverOnline=$isDriverOnline")
        isAppInForeground = true
        if (isDriverOnline) {
            // App came to foreground: hide the bubble
            sendActionToService(FloatingBubbleService.ACTION_HIDE_BUBBLE)
        }
    }

    override fun onHostPause() {
        android.util.Log.d("PermissionModule", "onHostPause — isDriverOnline=$isDriverOnline")
        isAppInForeground = false
        if (isDriverOnline) {
            val prefs = reactContext.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
            val isLoggedIn = prefs.getBoolean("is_logged_in", false)
            if (!isLoggedIn) {
                return
            }
            val wasAccepted = prefs.getBoolean("ride_accepted_via_overlay", false)
            if (!wasAccepted) {
                // App went to background: show the bubble
                sendActionToService(FloatingBubbleService.ACTION_SHOW_BUBBLE)
            }
        }
    }

    override fun onHostDestroy() {
        android.util.Log.d("PermissionModule", "onHostDestroy")
        isAppInForeground = false
        stopSound()
        if (isDriverOnline) {
            stopFloatingBubbleService()
            isDriverOnline = false
        }
    }

    // ── Online status & Login bridge ────────────────────────────────────────

    @ReactMethod
    fun setLoggedIn(loggedIn: Boolean) {
        android.util.Log.d("PermissionModule", "setLoggedIn called: loggedIn=$loggedIn")
        try {
            val prefs = reactContext.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("is_logged_in", loggedIn).apply()
            if (!loggedIn) {
                isDriverOnline = false
                sendActionToService(FloatingBubbleService.ACTION_HIDE_BUBBLE)
                sendActionToService(FloatingBubbleService.ACTION_STOP_SERVICE)
                stopFloatingBubbleService()
            }
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error in setLoggedIn: ${e.message}")
        }
    }

    @ReactMethod
    fun setOnlineStatus(online: Boolean) {
        android.util.Log.d("PermissionModule", "setOnlineStatus called: online=$online")
        val prefs = reactContext.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
        val isLoggedIn = prefs.getBoolean("is_logged_in", false)
        if (!isLoggedIn && online) {
            android.util.Log.w("PermissionModule", "Cannot set online status when driver is logged out")
            isDriverOnline = false
            return
        }
        isDriverOnline = online
        if (online) {
            startFloatingBubbleService()
        } else {
            sendActionToService(FloatingBubbleService.ACTION_HIDE_BUBBLE)
            sendActionToService(FloatingBubbleService.ACTION_STOP_SERVICE)
            stopFloatingBubbleService()
        }
    }

    // ── Overlay permission ──────────────────────────────────────────────────

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_REQUEST_ERROR", e.message)
        }
    }

    // ── Battery optimization ────────────────────────────────────────────────

    @ReactMethod
    fun checkBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                promise.resolve(powerManager.isIgnoringBatteryOptimizations(reactContext.packageName))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent.resolveActivity(reactContext.packageManager) != null) {
                    reactContext.startActivity(intent)
                } else {
                    val fallbackIntent = Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(fallbackIntent)
                }
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_REQUEST_ERROR", e.message)
        }
    }

    // ── Sound ───────────────────────────────────────────────────────────────

    @ReactMethod
    fun playSound() {
        try {
            stopSound()
            val resId = reactContext.resources.getIdentifier("sound", "raw", reactContext.packageName)
            if (resId != 0) {
                mediaPlayer = MediaPlayer.create(reactContext, resId)
                mediaPlayer?.isLooping = true
                mediaPlayer?.start()
            } else {
                android.util.Log.e("PermissionModule", "sound.mp3 not found in res/raw")
            }
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error playing sound: ${e.message}")
        }
    }

    @ReactMethod
    fun stopSound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            mediaPlayer = null
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error stopping sound: ${e.message}")
        }
    }

    // ── Service management ──────────────────────────────────────────────────

    @ReactMethod
    fun startFloatingBubbleService() {
        try {
            val intent = Intent(reactContext, FloatingBubbleService::class.java).apply {
                action = FloatingBubbleService.ACTION_START_SERVICE
            }
            // Use startForegroundService on Android 8+ to avoid background start crash
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                android.util.Log.d("PermissionModule", "Starting foreground service")
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error starting service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopFloatingBubbleService() {
        try {
            val intent = Intent(reactContext, FloatingBubbleService::class.java).apply {
                action = FloatingBubbleService.ACTION_STOP_SERVICE
            }
            reactContext.startService(intent)
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error stopping service: ${e.message}")
        }
    }

    @ReactMethod
    fun showFloatingBubble() {
        val prefs = reactContext.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
        val isLoggedIn = prefs.getBoolean("is_logged_in", false)
        if (!isLoggedIn) {
            return
        }
        val wasAccepted = prefs.getBoolean("ride_accepted_via_overlay", false)
        if (!wasAccepted) {
            sendActionToService(FloatingBubbleService.ACTION_SHOW_BUBBLE)
        }
    }

    @ReactMethod
    fun stopFloatingBubble() {
        sendActionToService(FloatingBubbleService.ACTION_HIDE_BUBBLE)
    }

    @ReactMethod
    fun showFloatingRequest(
        fare: String?,
        surge: String?,
        pickupDist: String?,
        pickupTime: String?,
        pickupAddr: String?,
        dropDist: String?,
        dropAddr: String?,
        vehicleType: String?,
        duration: Int
    ) {
        try {
            val intent = Intent(reactContext, FloatingBubbleService::class.java).apply {
                action = FloatingBubbleService.ACTION_SHOW_REQUEST
                putExtra(FloatingBubbleService.EXTRA_FARE, fare ?: "₹0")
                putExtra(FloatingBubbleService.EXTRA_SURGE, surge ?: "")
                putExtra(FloatingBubbleService.EXTRA_PICKUP_DIST, pickupDist ?: "0 Km")
                putExtra(FloatingBubbleService.EXTRA_PICKUP_TIME, pickupTime ?: "0 mins")
                putExtra(FloatingBubbleService.EXTRA_PICKUP_ADDR, pickupAddr ?: "")
                putExtra(FloatingBubbleService.EXTRA_DROP_DIST, dropDist ?: "0 Km")
                putExtra(FloatingBubbleService.EXTRA_DROP_ADDR, dropAddr ?: "")
                putExtra(FloatingBubbleService.EXTRA_VEHICLE_TYPE, vehicleType ?: "Bike")
                putExtra(FloatingBubbleService.EXTRA_DURATION, if (duration > 0) duration else 60)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error showing floating request: ${e.message}")
        }
    }

    @ReactMethod
    fun hideFloatingRequest() {
        sendActionToService(FloatingBubbleService.ACTION_HIDE_REQUEST)
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    private fun sendActionToService(action: String) {
        try {
            val intent = Intent(reactContext, FloatingBubbleService::class.java).apply {
                this.action = action
            }
            reactContext.startService(intent)
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error sending action $action: ${e.message}")
        }
    }

    @ReactMethod
    fun setNavigationBarColor(colorHex: String, darkIcons: Boolean) {
        val activity = reactContext.currentActivity
        if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            activity.runOnUiThread {
                try {
                    val window = activity.window
                    val color = android.graphics.Color.parseColor(colorHex)
                    window.navigationBarColor = color
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        var flags = window.decorView.systemUiVisibility
                        if (darkIcons) {
                            flags = flags or android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                        } else {
                            flags = flags and android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
                        }
                        window.decorView.systemUiVisibility = flags
                    }
                } catch (e: Exception) {
                    android.util.Log.e("PermissionModule", "Error setting navigation bar color: ${e.message}")
                }
            }
        }
    }

    /**
     * Brings the app to the foreground. Used after accepting a ride from the
     * background overlay so that navigation can actually display the screen.
     */
    @ReactMethod
    fun bringToForeground() {
        try {
            val intent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
            intent?.let {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                reactContext.startActivity(it)
            }
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error bringing app to foreground: ${e.message}")
        }
    }

    /**
     * Returns true if the driver tapped Accept on the native floating overlay
     * while the app was not in the foreground. JS uses this to prevent the
     * incoming ride overlay from re-appearing when the app opens.
     */
    @ReactMethod
    fun wasRideAcceptedViaOverlay(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
            val flag = prefs.getBoolean("ride_accepted_via_overlay", false)
            promise.resolve(flag)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Clears the ride-accepted-via-overlay flag. Call this after handling the flag.
     */
    @ReactMethod
    fun clearRideAcceptedViaOverlay() {
        try {
            val prefs = reactContext.getSharedPreferences("Safarweel_prefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("ride_accepted_via_overlay", false).apply()
        } catch (e: Exception) {
            android.util.Log.e("PermissionModule", "Error clearing overlay accept flag: ${e.message}")
        }
    }

    /**
     * Native clipboard helper so no third-party TurboModule is required.
     */
    @ReactMethod
    fun copyToClipboard(text: String, promise: Promise) {
        try {
            val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
            if (clipboard != null) {
                val clip = android.content.ClipData.newPlainText("Copied Text", text)
                clipboard.setPrimaryClip(clip)
                promise.resolve(true)
            } else {
                promise.reject("CLIPBOARD_ERROR", "Clipboard manager unavailable")
            }
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e.message)
        }
    }
}
