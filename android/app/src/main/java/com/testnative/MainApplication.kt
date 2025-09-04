package com.testnative

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import java.io.File
import android.util.Log
import org.json.JSONObject

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              add(ApkInstallerPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        // 关键方法：检查是否有更新的Bundle
        override fun getJSBundleFile(): String? {
          return try {
            val updatedBundle = checkForUpdatedBundle()
            if (updatedBundle != null) {
              Log.d("RNUpdate", "Using updated bundle: $updatedBundle")
              updatedBundle
            } else {
              Log.d("RNUpdate", "Using default bundle")
              super.getJSBundleFile()
            }
          } catch (e: Exception) {
            Log.e("RNUpdate", "Error checking updated bundle", e)
            super.getJSBundleFile()
          }
        }
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }

  // 第一个为需要校验的版本，第二个为当前版本
  fun compareVersions(version1: String, version2: String): Int {
    // 将版本字符串按 "." 分割成整数列表
    val v1Parts = version1.split('.').map { it.toInt() }
    val v2Parts = version2.split('.').map { it.toInt() }

    // 获取最长的版本号长度
    val maxLength = maxOf(v1Parts.size, v2Parts.size)

    // 逐个比较版本号的每个部分
    for (i in 0 until maxLength) {
      val v1Part = v1Parts.getOrNull(i) ?: 0
      val v2Part = v2Parts.getOrNull(i) ?: 0

      when {
        v1Part > v2Part -> return 1
        v1Part < v2Part -> return -1
      }
    }
    return 0
  }


  
  private fun checkForUpdatedBundle(): String? {
    return try {
      val packageInfo = applicationContext.packageManager.getPackageInfo(applicationContext.packageName, 0)
      val versionName = packageInfo.versionName
      var fullVersion = "0.0.0"
      Log.d("AppInfo", "app Version Name: $versionName")
      val bundlePath = "${filesDir}/ota-updates/index.android.bundle"
      val bundleVersionPath= "${filesDir}/ota-updates/version.json"
      val bundleFile = File(bundlePath)
      // 全量更新版本内容
      val bundleVersionFile = File(bundleVersionPath)
      if(bundleVersionFile.exists()){
        val versionJson = JSONObject(bundleVersionFile.readText())
        val version = versionJson.getString("version")
        fullVersion = version
      }
      Log.d("AppInfo", "Full Version: $fullVersion")
      Log.d("RNUpdate", "Checking bundle at: $bundlePath")
      Log.d("RNUpdate", "Bundle exists: ${bundleFile.exists()}")

      // 比较版本号
      val isFull=compareVersions(fullVersion, String.format("%s", versionName))
      
      
      if (bundleFile.exists() && bundleFile.length() > 0 && bundleFile.canRead() && bundleVersionFile.exists() && isFull> 0) {
        Log.d("RNUpdate", "Bundle size: ${bundleFile.length()} bytes")
        Log.d("RNUpdate", "Bundle readable: ${bundleFile.canRead()}")
        
        // 设置文件权限为可读
        try {
          bundleFile.setReadable(true, false)
          Log.d("RNUpdate", "Set bundle readable permissions")
        } catch (e: Exception) {
          Log.e("RNUpdate", "Failed to set permissions", e)
        }
        
        // 返回绝对路径，不使用file://前缀
        bundlePath
      } else {
        Log.d("RNUpdate", "Bundle not found, empty, or not readable")
        null
      }
    } catch (e: Exception) {
      Log.e("RNUpdate", "Error in checkForUpdatedBundle", e)
      null
    }
  }
}
