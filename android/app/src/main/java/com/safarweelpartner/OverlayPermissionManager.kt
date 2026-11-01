package com.safarweelpartner

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.Locale

class OverlayPermissionManager(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "OverlayPermissionManager"

    @ReactMethod
    fun isGranted(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_PERMISSION", e.message)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
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
            promise.reject("ERR_REQUEST_PERMISSION", e.message)
        }
    }

    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:${reactContext.packageName}")
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_SETTINGS", e.message)
        }
    }

    @ReactMethod
    fun getDeviceBrand(promise: Promise) {
        try {
            val brand = Build.BRAND.lowercase(Locale.ROOT)
            val manufacturer = Build.MANUFACTURER.lowercase(Locale.ROOT)
            val details = WritableNativeMap()
            details.putString("brand", brand)
            details.putString("manufacturer", manufacturer)
            details.putBoolean("isXiaomi", brand.contains("xiaomi") || manufacturer.contains("xiaomi") || brand.contains("redmi") || manufacturer.contains("redmi") || brand.contains("poco") || manufacturer.contains("poco"))
            details.putBoolean("isOppo", brand.contains("oppo") || manufacturer.contains("oppo") || brand.contains("realme") || manufacturer.contains("realme") || brand.contains("oneplus") || manufacturer.contains("oneplus"))
            details.putBoolean("isVivo", brand.contains("vivo") || manufacturer.contains("vivo"))
            details.putBoolean("isSamsung", brand.contains("samsung") || manufacturer.contains("samsung"))
            promise.resolve(details)
        } catch (e: Exception) {
            promise.reject("ERR_GET_BRAND", e.message)
        }
    }

    @ReactMethod
    fun openOemSettings(promise: Promise) {
        try {
            val brand = Build.BRAND.lowercase(Locale.ROOT)
            val manufacturer = Build.MANUFACTURER.lowercase(Locale.ROOT)
            val packageName = reactContext.packageName
            var intentOpened = false

            val pm = reactContext.packageManager

            if (brand.contains("xiaomi") || manufacturer.contains("xiaomi") || brand.contains("redmi") || manufacturer.contains("redmi") || brand.contains("poco") || manufacturer.contains("poco")) {
                // Xiaomi MIUI / HyperOS App Permission Editor
                try {
                    val intent = Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                        setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsEditorActivity")
                        putExtra("extra_pkgname", packageName)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (intent.resolveActivity(pm) != null) {
                        reactContext.startActivity(intent)
                        intentOpened = true
                    }
                } catch (e1: Exception) {
                    // Fallback handled below
                }
            } else if (brand.contains("oppo") || manufacturer.contains("oppo") || brand.contains("realme") || manufacturer.contains("realme") || brand.contains("oneplus") || manufacturer.contains("oneplus")) {
                // Oppo/Realme Startup / Floating Window manager
                try {
                    val intent = Intent().apply {
                        setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.PermissionManagerActivity")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (intent.resolveActivity(pm) != null) {
                        reactContext.startActivity(intent)
                        intentOpened = true
                    } else {
                        val fallbackIntent = Intent().apply {
                            setClassName("com.oppo.safe", "com.oppo.safe.permission.PermissionAppListActivity")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (fallbackIntent.resolveActivity(pm) != null) {
                            reactContext.startActivity(fallbackIntent)
                            intentOpened = true
                        }
                    }
                } catch (e1: Exception) {
                    // Fallback handled below
                }
            } else if (brand.contains("vivo") || manufacturer.contains("vivo")) {
                // Vivo custom manager
                try {
                    val intent = Intent().apply {
                        setClassName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.FloatWindowManager")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (intent.resolveActivity(pm) != null) {
                        reactContext.startActivity(intent)
                        intentOpened = true
                    } else {
                        val fallbackIntent = Intent().apply {
                            setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (fallbackIntent.resolveActivity(pm) != null) {
                            reactContext.startActivity(fallbackIntent)
                            intentOpened = true
                        }
                    }
                } catch (e1: Exception) {
                    // Fallback handled below
                }
            }

            if (!intentOpened) {
                // Default fallback: App Details Settings
                val intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$packageName")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_OEM_SETTINGS", e.message)
        }
    }
}
