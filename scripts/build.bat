@echo off
setlocal EnableDelayedExpansion

:: React Native Bundle 构建脚本 (Windows)
:: 用法: build.bat [版本号] [平台]

set VERSION=%1
set PLATFORM=%2

if "%VERSION%"=="" set VERSION=1.0.0
if "%PLATFORM%"=="" set PLATFORM=all

set OUTPUT_DIR=.\bundles
set PACKAGES_DIR=.\packages

echo 🚀 开始构建 React Native Bundle
echo 📌 版本: %VERSION%
echo 🏗️ 平台: %PLATFORM%
echo.

:: 创建输出目录
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if not exist "%PACKAGES_DIR%" mkdir "%PACKAGES_DIR%"

:: 清理旧文件
if exist "%OUTPUT_DIR%\*" rmdir /s /q "%OUTPUT_DIR%" && mkdir "%OUTPUT_DIR%"
if exist "%PACKAGES_DIR%\*" rmdir /s /q "%PACKAGES_DIR%" && mkdir "%PACKAGES_DIR%"

:: 构建Android Bundle
if "%PLATFORM%"=="android" goto build_android
if "%PLATFORM%"=="all" goto build_android
goto check_ios

:build_android
echo 📱 构建 Android Bundle...

set ANDROID_DIR=%OUTPUT_DIR%\android
mkdir "%ANDROID_DIR%\assets" 2>nul

:: 生成Android Bundle
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "%ANDROID_DIR%\index.android.bundle" --assets-dest "%ANDROID_DIR%\assets" --reset-cache

if %errorlevel% neq 0 (
    echo ❌ Android Bundle 构建失败
    exit /b 1
)

echo ✅ Android Bundle 构建成功

:: 生成清单文件
echo { > "%ANDROID_DIR%\manifest.json"
echo   "version": "%VERSION%", >> "%ANDROID_DIR%\manifest.json"
echo   "platform": "android", >> "%ANDROID_DIR%\manifest.json"
echo   "buildTime": %DATE:~0,4%%DATE:~5,2%%DATE:~8,2%000, >> "%ANDROID_DIR%\manifest.json"
echo   "bundle": { >> "%ANDROID_DIR%\manifest.json"
echo     "path": "index.android.bundle" >> "%ANDROID_DIR%\manifest.json"
echo   } >> "%ANDROID_DIR%\manifest.json"
echo } >> "%ANDROID_DIR%\manifest.json"

:: 创建更新包
echo 📦 创建 Android 更新包...
cd "%ANDROID_DIR%"
powershell -command "Compress-Archive -Path '.\*' -DestinationPath '..\..\packages\android-%VERSION%.zip' -Force"
cd ..\..

echo    📦 Android 更新包已创建

:check_ios
if "%PLATFORM%"=="ios" goto build_ios
if "%PLATFORM%"=="all" goto build_ios
goto finish

:build_ios
echo 🍎 构建 iOS Bundle...

set IOS_DIR=%OUTPUT_DIR%\ios
mkdir "%IOS_DIR%\assets" 2>nul

:: 生成iOS Bundle
call npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output "%IOS_DIR%\main.jsbundle" --assets-dest "%IOS_DIR%\assets" --reset-cache

if %errorlevel% neq 0 (
    echo ❌ iOS Bundle 构建失败
    exit /b 1
)

echo ✅ iOS Bundle 构建成功

:: 生成清单文件
echo { > "%IOS_DIR%\manifest.json"
echo   "version": "%VERSION%", >> "%IOS_DIR%\manifest.json"
echo   "platform": "ios", >> "%IOS_DIR%\manifest.json"
echo   "buildTime": %DATE:~0,4%%DATE:~5,2%%DATE:~8,2%000, >> "%IOS_DIR%\manifest.json"
echo   "bundle": { >> "%IOS_DIR%\manifest.json"
echo     "path": "main.jsbundle" >> "%IOS_DIR%\manifest.json"
echo   } >> "%IOS_DIR%\manifest.json"
echo } >> "%IOS_DIR%\manifest.json"

:: 创建更新包
echo 📦 创建 iOS 更新包...
cd "%IOS_DIR%"
powershell -command "Compress-Archive -Path '.\*' -DestinationPath '..\..\packages\ios-%VERSION%.zip' -Force"
cd ..\..

echo    📦 iOS 更新包已创建

:finish
echo.
echo 🎉 构建完成！
echo 📁 Bundle文件: %OUTPUT_DIR%
echo 📦 更新包: %PACKAGES_DIR%
echo.
echo 📋 使用方法:
echo    1. 将更新包上传到你的服务器
echo    2. 配置更新服务器API返回对应的包信息
echo    3. 在应用中使用 UpdateManager 检查和安装更新

pause