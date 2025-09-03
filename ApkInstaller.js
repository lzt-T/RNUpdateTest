import { NativeModules, Platform } from 'react-native';

const { ApkInstaller } = NativeModules;

/**
 * 安装APK文件
 * @param {string} apkPath - APK文件的完整路径
 * @returns {Promise<string>} - 安装过程的结果
 */
export const installApk = (apkPath) => {
  if (Platform.OS !== 'android') {
    return Promise.reject(new Error('This feature is only available on Android'));
  }

  if (!apkPath) {
    return Promise.reject(new Error('APK path cannot be empty'));
  }

  return ApkInstaller.installApk(apkPath);
};

export default {
  installApk,
};