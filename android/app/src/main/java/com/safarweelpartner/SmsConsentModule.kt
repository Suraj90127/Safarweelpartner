package com.safarweelpartner

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import java.util.regex.Pattern

class SmsConsentModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private val SMS_CONSENT_REQUEST_CODE = 2026
    private var isReceiverRegistered = false

    private val smsReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (SmsRetriever.SMS_RETRIEVED_ACTION == intent?.action) {
                val extras = intent.extras ?: return
                val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return

                when (status.statusCode) {
                    CommonStatusCodes.SUCCESS -> {
                        // Consent intent is received.
                        val consentIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT, Intent::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT)
                        }

                        try {
                            val activity = reactContext.currentActivity
                            if (activity != null && consentIntent != null) {
                                // Remediate Intent Redirection (Google Play Device and Network Abuse policy):
                                // 1. Strip and verify URI permission flags
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    consentIntent.removeFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    consentIntent.removeFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                                }
                                consentIntent.flags = consentIntent.flags and
                                    (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION).inv()

                                // 2. Explicitly bind package to Google Play Services to prevent redirection
                                consentIntent.setPackage("com.google.android.gms")

                                // 3. Verify destination component strictly belongs to Google Play Services
                                val componentName = consentIntent.resolveActivity(activity.packageManager)
                                val flags = consentIntent.flags
                                val safeFlags = (flags and Intent.FLAG_GRANT_READ_URI_PERMISSION == 0) &&
                                    (flags and Intent.FLAG_GRANT_WRITE_URI_PERMISSION == 0)

                                if (componentName != null && "com.google.android.gms" == componentName.packageName && safeFlags) {
                                    activity.startActivityForResult(consentIntent, SMS_CONSENT_REQUEST_CODE)
                                } else {
                                    sendErrorEvent("Untrusted consent intent target: ${componentName?.packageName}")
                                }
                            } else {
                                sendErrorEvent("Activity or Intent is null")
                            }
                        } catch (e: ActivityNotFoundException) {
                            sendErrorEvent(e.message ?: "ActivityNotFoundException")
                        } catch (e: SecurityException) {
                            sendErrorEvent(e.message ?: "SecurityException")
                        }
                    }
                    CommonStatusCodes.TIMEOUT -> {
                        sendErrorEvent("Timeout waiting for SMS")
                    }
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "SmsConsentModule"

    @ReactMethod
    fun startSmsListener(promise: Promise) {
        try {
            val task = SmsRetriever.getClient(reactContext).startSmsUserConsent(null)
            task.addOnSuccessListener {
                registerReceiver()
                promise.resolve(true)
            }
            task.addOnFailureListener { e ->
                promise.reject("START_FAILED", e.message)
            }
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message)
        }
    }

    @ReactMethod
    fun stopSmsListener() {
        unregisterReceiver()
    }

    private fun registerReceiver() {
        if (!isReceiverRegistered) {
            val intentFilter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(
                    smsReceiver,
                    intentFilter,
                    SmsRetriever.SEND_PERMISSION,
                    null,
                    Context.RECEIVER_EXPORTED
                )
            } else {
                reactContext.registerReceiver(
                    smsReceiver,
                    intentFilter,
                    SmsRetriever.SEND_PERMISSION,
                    null
                )
            }
            isReceiverRegistered = true
        }
    }

    private fun unregisterReceiver() {
        if (isReceiverRegistered) {
            try {
                reactContext.unregisterReceiver(smsReceiver)
            } catch (e: Exception) {
                // Ignore if not registered
            }
            isReceiverRegistered = false
        }
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == SMS_CONSENT_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val message = data.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
                if (message != null) {
                    val otp = extractOtp(message)
                    if (otp != null) {
                        sendOtpEvent(otp)
                    } else {
                        sendErrorEvent("OTP not found in message")
                    }
                } else {
                    sendErrorEvent("Message is null")
                }
            } else {
                sendErrorEvent("Consent denied by user")
            }
            unregisterReceiver()
        }
    }

    override fun onNewIntent(intent: Intent) {
        // Not used
    }

    private fun extractOtp(message: String): String? {
        // Look for 4 to 6 digit numeric code in the message
        val pattern = Pattern.compile("(\\d{4,6})")
        val matcher = pattern.matcher(message)
        if (matcher.find()) {
            return matcher.group(0)
        }
        return null
    }

    private fun sendOtpEvent(otp: String) {
        val params = Arguments.createMap()
        params.putString("otp", otp)
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onOtpReceived", params)
    }

    private fun sendErrorEvent(error: String) {
        val params = Arguments.createMap()
        params.putString("error", error)
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onOtpError", params)
    }
}
