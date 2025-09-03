#!/bin/bash

# React Native Bundle 构建脚本
# 用法: ./build.sh [版本号] [平台]

VERSION=${1:-"1.0.0"}
PLATFORM=${2:-"all"}
OUTPUT_DIR="./bundles"
PACKAGES_DIR="./packages"

echo "🚀 开始构建 React Native Bundle"
echo "📌 版本: $VERSION"
echo "🏗️ 平台: $PLATFORM"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"
mkdir -p "$PACKAGES_DIR"

# 清理旧文件
rm -rf "$OUTPUT_DIR"/*
rm -rf "$PACKAGES_DIR"/*

build_android() {
    echo "📱 构建 Android Bundle..."
    
    ANDROID_DIR="$OUTPUT_DIR/android"
    mkdir -p "$ANDROID_DIR/assets"
    
    # 生成Android Bundle
    npx react-native bundle \
        --platform android \
        --dev false \
        --entry-file index.js \
        --bundle-output "$ANDROID_DIR/index.android.bundle" \
        --assets-dest "$ANDROID_DIR/assets" \
        --reset-cache
    
    if [ $? -eq 0 ]; then
        echo "✅ Android Bundle 构建成功"
        
        # 计算文件信息
        BUNDLE_SIZE=$(stat -f%z "$ANDROID_DIR/index.android.bundle" 2>/dev/null || stat -c%s "$ANDROID_DIR/index.android.bundle")
        BUNDLE_HASH=$(shasum -a 256 "$ANDROID_DIR/index.android.bundle" | cut -d' ' -f1)
        
        echo "   📄 Bundle大小: $(( $BUNDLE_SIZE / 1024 / 1024 )) MB"
        echo "   🔐 Bundle哈希: $BUNDLE_HASH"
        
        # 生成清单文件
        cat > "$ANDROID_DIR/manifest.json" << EOF
{
  "version": "$VERSION",
  "platform": "android",
  "buildTime": $(date +%s)000,
  "bundle": {
    "path": "index.android.bundle",
    "hash": "$BUNDLE_HASH",
    "size": $BUNDLE_SIZE
  }
}
EOF
        
        # 创建更新包
        echo "📦 创建 Android 更新包..."
        cd "$ANDROID_DIR"
        zip -r "../../packages/android-$VERSION.zip" . > /dev/null
        cd - > /dev/null
        
        PACKAGE_SIZE=$(stat -f%z "$PACKAGES_DIR/android-$VERSION.zip" 2>/dev/null || stat -c%s "$PACKAGES_DIR/android-$VERSION.zip")
        PACKAGE_HASH=$(shasum -a 256 "$PACKAGES_DIR/android-$VERSION.zip" | cut -d' ' -f1)
        
        echo "   📦 更新包大小: $(( $PACKAGE_SIZE / 1024 / 1024 )) MB"
        echo "   🔐 更新包哈希: $PACKAGE_HASH"
        
    else
        echo "❌ Android Bundle 构建失败"
        return 1
    fi
}

build_ios() {
    echo "🍎 构建 iOS Bundle..."
    
    IOS_DIR="$OUTPUT_DIR/ios"
    mkdir -p "$IOS_DIR/assets"
    
    # 生成iOS Bundle
    npx react-native bundle \
        --platform ios \
        --dev false \
        --entry-file index.js \
        --bundle-output "$IOS_DIR/main.jsbundle" \
        --assets-dest "$IOS_DIR/assets" \
        --reset-cache
    
    if [ $? -eq 0 ]; then
        echo "✅ iOS Bundle 构建成功"
        
        # 计算文件信息
        BUNDLE_SIZE=$(stat -f%z "$IOS_DIR/main.jsbundle" 2>/dev/null || stat -c%s "$IOS_DIR/main.jsbundle")
        BUNDLE_HASH=$(shasum -a 256 "$IOS_DIR/main.jsbundle" | cut -d' ' -f1)
        
        echo "   📄 Bundle大小: $(( $BUNDLE_SIZE / 1024 / 1024 )) MB"
        echo "   🔐 Bundle哈希: $BUNDLE_HASH"
        
        # 生成清单文件
        cat > "$IOS_DIR/manifest.json" << EOF
{
  "version": "$VERSION",
  "platform": "ios",
  "buildTime": $(date +%s)000,
  "bundle": {
    "path": "main.jsbundle",
    "hash": "$BUNDLE_HASH",
    "size": $BUNDLE_SIZE
  }
}
EOF
        
        # 创建更新包
        echo "📦 创建 iOS 更新包..."
        cd "$IOS_DIR"
        zip -r "../../packages/ios-$VERSION.zip" . > /dev/null
        cd - > /dev/null
        
        PACKAGE_SIZE=$(stat -f%z "$PACKAGES_DIR/ios-$VERSION.zip" 2>/dev/null || stat -c%s "$PACKAGES_DIR/ios-$VERSION.zip")
        PACKAGE_HASH=$(shasum -a 256 "$PACKAGES_DIR/ios-$VERSION.zip" | cut -d' ' -f1)
        
        echo "   📦 更新包大小: $(( $PACKAGE_SIZE / 1024 / 1024 )) MB"
        echo "   🔐 更新包哈希: $PACKAGE_HASH"
        
    else
        echo "❌ iOS Bundle 构建失败"
        return 1
    fi
}

# 根据参数构建对应平台
case $PLATFORM in
    "android")
        build_android
        ;;
    "ios")
        build_ios
        ;;
    "all")
        build_android && build_ios
        ;;
    *)
        echo "❌ 不支持的平台: $PLATFORM"
        echo "支持的平台: android, ios, all"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 构建完成！"
    echo "📁 Bundle文件: $OUTPUT_DIR"
    echo "📦 更新包: $PACKAGES_DIR"
    echo ""
    echo "📋 使用方法:"
    echo "   1. 将更新包上传到你的服务器"
    echo "   2. 配置更新服务器API返回对应的包信息"
    echo "   3. 在应用中使用 UpdateManager 检查和安装更新"
else
    echo ""
    echo "❌ 构建过程中出现错误"
    exit 1
fi