package com.testnative

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.FileProvider

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import java.io.File

class ApkInstallerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val TAG = "ApkInstallerModule"
    }

    override fun getName(): String {
        return "ApkInstaller"
    }

    @ReactMethod
    fun installApk(apkPath: String, promise: Promise) {
        try {
            val apkFile = File(apkPath)
            
            if (!apkFile.exists()) {
                Log.e(TAG, "APK file not found: $apkPath")
                promise.reject("FILE_NOT_FOUND", "APK file not found at path: $apkPath")
                return
            }
            
            val intent = Intent(Intent.ACTION_VIEW)
            val apkUri: Uri
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // For Android 7.0+ we need to use FileProvider
                apkUri = FileProvider.getUriForFile(
                    reactContext,
                    reactContext.packageName + ".fileprovider",
                    apkFile
                )
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } else {
                // For older versions
                apkUri = Uri.fromFile(apkFile)
            }
            
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            reactContext.startActivity(intent)
            promise.resolve("Installation process started")
        } catch (e: Exception) {
            Log.e(TAG, "Error installing APK", e)
            promise.reject("INSTALL_ERROR", "Failed to install APK: ${e.message}", e)
        }
    }
}