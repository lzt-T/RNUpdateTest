#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// 解析命令行参数
const args = process.argv.slice(2);
let cmdBuildApk = false;

for (const arg of args) {
  if (arg.startsWith('--build-apk=')) {
    cmdBuildApk = arg.split('=')[1] === 'true';
  }
}

// 配置
const packageJson = require('../package.json');
const config = {
  version: process.env.APP_VERSION || packageJson.version,
  baseUrl: process.env.BASE_URL || 'https://xjoker.top',
  outputDir: './app-updates',
  tempDir: './temp-bundles', // 临时目录，用完即删
  platforms: ['android', 'ios'],
  // 添加APK构建支持
  buildApk: cmdBuildApk,
  apkPath:
    process.env.APK_PATH ||
    './android/app/build/outputs/apk/release/app-release.apk',
  androidDir: './android',
};

console.log(`🚀 开始构建 React Native Bundle v${config.version}`);

// 创建输出目录
function createDirectories() {
  // 清空输出目录,包括文件夹
  if (fs.existsSync(config.outputDir)) {
    fs.rmSync(config.outputDir, { recursive: true, force: true });
  }

  const dirs = [
    config.outputDir,
    config.tempDir,
    path.join(config.outputDir, 'manifest'),
  ];

  // 如果需要构建APK，添加APK目录
  if (config.buildApk) {
    dirs.push(path.join(config.outputDir, 'versions', config.version, 'apk'));
  } else {
    dirs.push(
      path.join(config.outputDir, 'versions', config.version, 'android'),
    );
    dirs.push(path.join(config.outputDir, 'versions', config.version, 'ios'));
  }

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });
}

// 构建单个平台的Bundle
function buildPlatformBundle(platform) {
  console.log(`📦 构建 ${platform} Bundle...`);

  const bundleFileName =
    platform === 'ios' ? 'main.jsbundle' : 'index.android.bundle';
  const bundleOutput = path.join(config.tempDir, platform, bundleFileName);
  const assetsOutput = path.join(config.tempDir, platform, 'assets');

  // 创建平台目录
  fs.mkdirSync(path.dirname(bundleOutput), { recursive: true });

  // 构建Bundle命令
  const bundleCommand = [
    'npx react-native bundle',
    `--platform ${platform}`,
    '--dev false',
    '--entry-file index.js',
    `--bundle-output ${bundleOutput}`,
    `--assets-dest ${assetsOutput}`,
    '--reset-cache',
  ].join(' ');

  try {
    execSync(bundleCommand, { stdio: 'inherit' });
    console.log(`✅ ${platform} Bundle构建完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${platform} Bundle构建失败:`, error.message);
    return false;
  }
}

// 计算文件哈希
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return 'sha256:' + hashSum.digest('hex');
}

// 获取文件大小
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

// 创建ZIP包
function createZipPackage(platform) {
  console.log(`📦 打包 ${platform} 更新包...`);

  const bundleDir = path.join(config.tempDir, platform);
  const zipPath = path.join(
    config.outputDir,
    'versions',
    config.version,
    platform,
    'full.zip',
  );

  if (!fs.existsSync(bundleDir)) {
    console.error(`❌ ${platform} Bundle目录不存在: ${bundleDir}`);
    return null;
  }

  try {
    // 使用系统的zip命令或7zip
    const zipCommand =
      process.platform === 'win32'
        ? `powershell Compress-Archive -Path "${bundleDir}\\*" -DestinationPath "${zipPath}" -Force`
        : `cd "${bundleDir}" && zip -r "${path.resolve(zipPath)}" .`;

    execSync(zipCommand, { stdio: 'pipe' });

    // 生成哈希文件
    const hash = calculateFileHash(zipPath);
    const hashPath = zipPath + '.hash';
    fs.writeFileSync(hashPath, hash);

    console.log(`✅ ${platform} 更新包创建完成: ${zipPath}`);

    return {
      zipPath,
      hash,
      size: getFileSize(zipPath),
    };
  } catch (error) {
    console.error(`❌ ${platform} 打包失败:`, error.message);
    return null;
  }
}

// 构建并复制APK文件并生成相关信息
async function buildAndCopyApkFile() {
  console.log('🔨 开始构建 Android APK...');
  try {
    // 构建APK命令
    const buildCommand =
      process.platform === 'win32'
        ? 'cd ' + config.androidDir + ' && gradlew.bat assembleRelease'
        : 'cd ' + config.androidDir + ' && ./gradlew assembleRelease';

    console.log(`执行命令: ${buildCommand}`);
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('✅ Android APK 构建成功');
  } catch (error) {
    console.error('❌ Android APK 构建失败:', error.message);
    return null;
  }

  // 检查APK文件是否存在
  if (!fs.existsSync(config.apkPath)) {
    console.error(`❌ APK文件不存在: ${config.apkPath}`);
    return null;
  }

  const apkOutputDir = path.join(
    config.outputDir,
    'versions',
    config.version,
    'apk',
  );
  const apkOutputPath = path.join(apkOutputDir, 'app-release.apk');

  try {
    // 复制APK文件
    fs.copyFileSync(config.apkPath, apkOutputPath);

    // 生成哈希文件
    const hash = calculateFileHash(apkOutputPath);
    const hashPath = apkOutputPath + '.hash';
    fs.writeFileSync(hashPath, hash);

    console.log(`✅ APK文件复制完成: ${apkOutputPath}`);

    return {
      apkPath: apkOutputPath,
      hash,
      size: getFileSize(apkOutputPath),
    };
  } catch (error) {
    console.error(`❌ APK文件复制失败:`, error.message);
    return null;
  }
}

// 生成版本信息文件
function generateVersionInfo() {
  console.log('📄 生成version.json...');

  const versionInfo = {
    latest: {
      android: config.version,
      ios: config.version,
    },
    versions: {
      [config.version]: {
        releaseDate: new Date().toISOString(),
        description: `版本 ${config.version} 更新`,
        minSupportVersion: '1.0.0',
      },
    },
  };

  const outputPath = path.join(config.outputDir, 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));
  console.log(`✅ 版本信息生成完成: ${outputPath}`);
}

// 生成平台清单文件
function generateManifest(platform, packageInfo, apkInfo) {
  console.log(`📄 生成 ${platform} 清单文件...`);

  const manifest = {
    versions: {
      [config.version]: {
        version: config.version,
        description: `版本 ${config.version} 更新`,
        updateType:
          config.buildApk && platform === 'android' ? 'apk_required' : 'full',
      },
    },
  };

  // 如果是Android平台且有APK信息，添加APK更新信息
  if (platform === 'android' && config.buildApk) {
    manifest.versions[config.version].apk_required = {
      size: apkInfo.size,
      downloadUrl: `${config.baseUrl}/versions/${config.version}/apk/app-release.apk`,
      hash: apkInfo.hash,
    };
  }
  // 全量更新
  if (!config.buildApk) {
    manifest.versions[config.version].full = {
      size: packageInfo?.size || 0,
      downloadUrl: packageInfo
        ? `${config.baseUrl}/versions/${config.version}/${platform}/full.zip`
        : '',
      hash: packageInfo?.hash || '',
    };
  }

  const manifestPath = path.join(
    config.outputDir,
    'manifest',
    `${platform}.json`,
  );
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ ${platform} 清单生成完成: ${manifestPath}`);
}

// 主函数
async function main() {
  try {
    // 1. 创建目录结构
    console.log('📁 创建目录结构...');
    // 3. 打包并生成清单
    const packageResults = {};
    let apkInfo = {};
    createDirectories();

    if (!config.buildApk) {
      // 2. 构建所有平台的Bundle
      const buildResults = {};
      for (const platform of config.platforms) {
        const success = buildPlatformBundle(platform);
        if (success) {
          buildResults[platform] = true;
        } else {
          console.warn(`⚠️ ${platform} 构建失败，继续处理其他平台...`);
        }
      }

      // 4. 创建ZIP包
      for (const platform of config.platforms) {
        if (buildResults[platform]) {
          const packageInfo = createZipPackage(platform);
          if (packageInfo) {
            packageResults[platform] = packageInfo;
          }
        }
      }
    } else {
      apkInfo = await buildAndCopyApkFile();
    }

    // 5. 生成清单文件
    for (const platform of config.platforms) {
      generateManifest(
        platform,
        packageResults[platform],
        platform === 'android' ? apkInfo : null,
      );
    }

    // 6. 生成版本信息
    generateVersionInfo();

    // 7. 清理临时文件
    console.log('🗑️ 清理临时文件...');
    if (fs.existsSync(config.tempDir)) {
      fs.rmSync(config.tempDir, { recursive: true, force: true });
      console.log(`✅ 临时目录已清理: ${config.tempDir}`);
    }

    // 8. 输出结果
    console.log('\n🎉 构建完成！');
    console.log('生成的文件结构:');
    console.log(`${config.outputDir}/`);
    console.log('├── version.json');
    console.log(`├── versions/${config.version}/`);

    for (const platform of config.platforms) {
      if (packageResults[platform]) {
        console.log(`│   ├── ${platform}/`);
        console.log(
          `│   │   ├── full.zip (${Math.round(
            packageResults[platform].size / 1024,
          )} KB)`,
        );
        console.log(`│   │   └── full.zip.hash`);
      }
    }

    if (config.buildApk) {
      console.log(`│   ├── apk/`);
      console.log(
        `│   │   ├── app-release.apk (${Math.round(
          apkInfo.size / 1024 / 1024,
        )} MB)`,
      );
      console.log(`│   │   └── app-release.apk.hash`);
    }

    console.log('└── manifest/');
    for (const platform of config.platforms) {
      console.log(`    ├── ${platform}.json`);
    }

    console.log(
      `\n📤 上传到服务器: rsync -av ${config.outputDir}/ user@server:/var/www/app-updates/`,
    );
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

// 检查依赖
function checkDependencies() {
  try {
    execSync('npx react-native --version', { stdio: 'pipe' });
  } catch (error) {
    console.error(
      '❌ React Native CLI未安装，请先安装: npm install -g @react-native-community/cli',
    );
    process.exit(1);
  }
}

// 启动
if (require.main === module) {
  checkDependencies();
  main().catch(error => {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  });
}

module.exports = { main, config };
