#!/usr/bin/env bash
# 플레이 스토어용 안드로이드 앱(TWA)을 빌드하고 업로드 키로 서명한다. 결과: android/release/nuanci-<버전>.aab(업로드용), .apk(기기에 바로 설치)
# 버전을 올릴 때는 android/twa-manifest.json의 appVersionCode·appVersionName과 android/app/build.gradle의 versionCode·versionName을 같이 올린다
# 필요: JDK 17(brew openjdk@17), Android SDK(brew android-commandlinetools + platforms;android-36, build-tools;36.0.0), ~/.android-keys/nuanci-upload.*
set -euo pipefail
cd "$(dirname "$0")/../android"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
BT="$ANDROID_HOME/build-tools/36.0.0"
KEYS="$HOME/.android-keys"
PW=$(grep storePassword "$KEYS/nuanci-upload.properties" | cut -d= -f2)
VER=$(grep -m1 'versionName' app/build.gradle | sed -E 's/.*"(.*)".*/\1/')
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew bundleRelease assembleRelease --no-daemon -q
mkdir -p release
cp app/build/outputs/bundle/release/app-release.aab "release/nuanci-$VER.aab"
"$JAVA_HOME/bin/jarsigner" -keystore "$KEYS/nuanci-upload.jks" -storepass "$PW" -keypass "$PW" -sigalg SHA256withRSA -digestalg SHA-256 "release/nuanci-$VER.aab" upload >/dev/null
"$BT/zipalign" -f 4 app/build/outputs/apk/release/app-release-unsigned.apk release/aligned.apk
"$BT/apksigner" sign --ks "$KEYS/nuanci-upload.jks" --ks-key-alias upload --ks-pass "pass:$PW" --key-pass "pass:$PW" --out "release/nuanci-$VER.apk" release/aligned.apk
rm release/aligned.apk
echo "release/nuanci-$VER.aab, release/nuanci-$VER.apk"
