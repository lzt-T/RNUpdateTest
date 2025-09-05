/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  StatusBar,
  useColorScheme,
  Text,
  Alert,
  Button,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UpdateManager } from './rn-update-manager/lib';
import { useEffect, useRef, useState } from 'react';
import packageJson from './package.json';
import RNExitApp from 'react-native-exit-app';
import ApkInstaller from './ApkInstaller';
import RNFS from 'react-native-fs';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const UpdateScreen = useRef<any>(null);

  const checkForUpdate = async () => {
    setIsChecking(true);
    try {
      const hasUpdate = await UpdateScreen.current.checkForUpdate();
      setHasUpdate(hasUpdate);
      if (hasUpdate) {
        Alert.alert('发现新版本', '是否立即更新？');
      } else {
        Alert.alert('已是最新版本', '当前已是最新版本');
      }
    } catch (error) {
      Alert.alert('检查失败', error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const onInstallUpdate = async () => {
    setIsUpdating(true);
    try {
      await UpdateScreen.current.installUpdate();
    } catch (error) {
      Alert.alert('更新失败', error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    UpdateScreen.current = new UpdateManager({
      updateServerUrl: 'https://xjoker.top',
      appVersion: packageJson.version,
      autoCheck: false,
      onCheckComplete: (isTrue, updateInfo) => {
        console.log('更新信息:', updateInfo);
      },
      onFullUpdateComplete: updateInfo => {
        Alert.alert(
          '更新完成',
          `应用已成功更新到版本 ${updateInfo.version}\n\n为确保更新生效，请手动重启应用。`,
          [
            { text: '稍后重启', style: 'cancel' },
            {
              text: '立即退出',
              onPress: () => {
                if (Platform.OS === 'android') {
                  RNExitApp.exitApp();
                }
              },
            },
          ],
        );
      },
      onApkDownloadComplete: (updateInfo, apkFilePath) => {
        Alert.alert('更新包已准备好', '是否立即安装？', [
          { text: '稍后' },
          {
            text: '立即安装',
            onPress: () => {
              console.log('安装更新包，路径:', apkFilePath);
              ApkInstaller.installApk(apkFilePath)
                .then(() => {
                  console.log('安装已启动');
                })
                .catch(error => {
                  console.error('安装失败:', error);
                  Alert.alert('安装失败', error.message);
                });
            },
          },
        ]);
      },
      onProgress: progress => {
        console.log('progress', progress);
      },
      onError: error => {
        console.log('error', error);

        Alert.alert('错误', error.message);
      },
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <Text>RN Update Manager 测试, 新版本{packageJson.version}111111</Text>

      <Button
        title={isChecking ? '检查中...' : '检查更新'}
        onPress={checkForUpdate}
        disabled={isChecking || isUpdating}
      />

      {hasUpdate && (
        <Button
          title={isUpdating ? '更新中...' : '立即更新'}
          onPress={onInstallUpdate}
          disabled={isUpdating}
        />
      )}

      <Button
        title="测试安装APK"
        onPress={() => {
          const testApkPath = `${RNFS.DocumentDirectoryPath}/apk-updates/app-update.apk`;

          console.log(testApkPath, 'testApkPath');

          console.log('测试安装路径:', testApkPath);
          ApkInstaller.installApk(testApkPath)
            .then(() => console.log('安装请求已发送'))
            .catch(err => {
              console.error('安装失败:', err);
              Alert.alert('安装失败', err.message);
            });
        }}
      />
    </SafeAreaProvider>
  );
}

export default App;
