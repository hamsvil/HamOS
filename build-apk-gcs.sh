#!/usr/bin/env bash
# ============================================================
#   HAM AI STUDIO — AeternaGlass APK Builder
#   Untuk dijalankan di Google Cloud Shell
#   Satu perintah: bash build-apk-gcs.sh
# ============================================================
set -e

# ── Warna output ─────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${CYAN}ℹ  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}══ STEP $1 ═══════════════════════════════════════════${NC}"; }

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║   AeternaGlass APK Builder — HAM AI Studio          ║"
echo "  ║   Version 10.0-SINGULARITY                          ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Deteksi direktori script ──────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AETERNA_DIR="$SCRIPT_DIR/AeternaGlass"
OUTPUT_DIR="$SCRIPT_DIR/output"

if [ ! -d "$AETERNA_DIR" ]; then
  fail "Folder AeternaGlass tidak ditemukan! Pastikan kamu menjalankan script dari root project."
fi

# ── Step 1: Cek Java ──────────────────────────────────────────
step "1/7: Cek & Install Java 17"
if java -version 2>&1 | grep -q "17\|21"; then
  ok "Java sudah tersedia: $(java -version 2>&1 | head -1)"
else
  info "Menginstall Java 17..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -q && sudo apt-get install -y -q openjdk-17-jdk
  elif command -v brew &>/dev/null; then
    brew install openjdk@17
    export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
  else
    fail "Tidak bisa install Java. Install manual: sudo apt-get install openjdk-17-jdk"
  fi
  export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
  ok "Java 17 terinstall"
fi
export JAVA_HOME=${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which java))))}

# ── Step 2: Install Android SDK ───────────────────────────────
step "2/7: Setup Android SDK Command-Line Tools"
ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-$HOME/android-sdk}
CMDLINE_TOOLS_VERSION="9477386"  # Latest stable cmdline-tools
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"

if [ ! -f "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]; then
  info "Mendownload Android cmdline-tools..."
  mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
  TMP_ZIP="/tmp/cmdline-tools.zip"
  curl -fsSL -o "$TMP_ZIP" "$CMDLINE_TOOLS_URL" || fail "Gagal download cmdline-tools"
  cd "$ANDROID_SDK_ROOT/cmdline-tools"
  unzip -q "$TMP_ZIP" -d temp_unzip
  mv temp_unzip/cmdline-tools "$ANDROID_SDK_ROOT/cmdline-tools/latest"
  rm -rf temp_unzip "$TMP_ZIP"
  cd "$SCRIPT_DIR"
  ok "Android cmdline-tools terinstall"
else
  ok "Android cmdline-tools sudah ada"
fi

export ANDROID_HOME=$ANDROID_SDK_ROOT
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/34.0.0:$PATH"

# ── Step 3: Install SDK components ───────────────────────────
step "3/7: Install Android Platform & Build Tools"
echo "y" | sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses > /dev/null 2>&1 || true
echo "y" | sdkmanager --sdk_root="$ANDROID_SDK_ROOT" \
  "platforms;android-34" \
  "build-tools;34.0.0" \
  "platform-tools" 2>&1 | grep -E "Install|Download|Error|✓" || true
ok "Android SDK platform-34 + build-tools-34 siap"

# ── Step 4: Download Gradle wrapper jar ──────────────────────
step "4/7: Siapkan Gradle Wrapper"
GRADLE_WRAPPER_JAR="$AETERNA_DIR/gradle/wrapper/gradle-wrapper.jar"
GRADLE_WRAPPER_URL="https://raw.githubusercontent.com/nicowillis/gradle-wrapper-jar/master/gradle-wrapper.jar"

if [ ! -f "$GRADLE_WRAPPER_JAR" ]; then
  info "Mendownload gradle-wrapper.jar..."
  mkdir -p "$AETERNA_DIR/gradle/wrapper"
  # Coba dari GitHub mirror
  curl -fsSL -o "$GRADLE_WRAPPER_JAR" \
    "https://raw.githubusercontent.com/gradle/gradle/v8.4.0/gradle/wrapper/gradle-wrapper.jar" 2>/dev/null || \
  curl -fsSL -o "$GRADLE_WRAPPER_JAR" \
    "https://github.com/gradle/gradle/raw/refs/heads/main/gradle/wrapper/gradle-wrapper.jar" 2>/dev/null || \
  # Fallback: gunakan gradle langsung jika tersedia
  { warn "Tidak bisa download gradle-wrapper.jar, coba install gradle langsung..."
    if command -v gradle &>/dev/null; then
      cd "$AETERNA_DIR" && gradle wrapper --gradle-version=8.4
      ok "Gradle wrapper dibuat via gradle command"
    else
      sudo apt-get install -y -q gradle 2>/dev/null || true
      cd "$AETERNA_DIR" && gradle wrapper --gradle-version=8.4
    fi
  }
  ok "Gradle wrapper siap"
else
  ok "gradle-wrapper.jar sudah ada"
fi
chmod +x "$AETERNA_DIR/gradlew"

# ── Step 5: Siapkan debug keystore ───────────────────────────
step "5/7: Buat Debug Keystore (jika belum ada)"
KEYSTORE_DIR="$AETERNA_DIR/keystore"
DEBUG_KS="$KEYSTORE_DIR/debug.keystore"
mkdir -p "$KEYSTORE_DIR"

if [ ! -f "$DEBUG_KS" ]; then
  info "Membuat debug.keystore..."
  keytool -genkeypair \
    -alias androiddebugkey \
    -keypass android \
    -keystore "$DEBUG_KS" \
    -storepass android \
    -dname "CN=Android Debug, O=Android, C=US" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -noprompt 2>/dev/null
  ok "debug.keystore dibuat"
else
  ok "debug.keystore sudah ada"
fi

# ── Step 6: Copy dist/ ke assets/www/ ────────────────────────
step "6/7: Copy Web Assets ke AeternaGlass"
DIST_DIR="$SCRIPT_DIR/dist"
WWW_DIR="$AETERNA_DIR/app/src/main/assets/www"
mkdir -p "$WWW_DIR"

if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ]; then
  info "Menyalin dist/ ke assets/www/..."
  cp -r "$DIST_DIR/." "$WWW_DIR/"
  ok "Web assets tersalin ke assets/www/ ($(ls "$WWW_DIR" | wc -l) files)"
else
  # Jika dist belum ada, build dulu
  warn "dist/index.html tidak ditemukan. Jalankan npm run build dulu..."
  if command -v node &>/dev/null && [ -f "$SCRIPT_DIR/package.json" ]; then
    info "Menjalankan npm run build..."
    cd "$SCRIPT_DIR"
    npm run build 2>&1 | tail -5
    if [ -f "$DIST_DIR/index.html" ]; then
      cp -r "$DIST_DIR/." "$WWW_DIR/"
      ok "Build selesai dan assets tersalin"
    else
      fail "npm run build gagal. Pastikan Node.js terinstall dan dependencies sudah di-install (npm install)"
    fi
  else
    fail "dist/ tidak ditemukan dan Node.js tidak tersedia. Pastikan project sudah di-build (npm run build)"
  fi
fi

# ── Step 7: Build APK ────────────────────────────────────────
step "7/7: Build APK dengan Gradle"
cd "$AETERNA_DIR"

# Set environment untuk build
export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
export ANDROID_HOME=$ANDROID_HOME

info "Menjalankan ./gradlew assembleDebug..."
./gradlew assembleDebug \
  --no-daemon \
  --stacktrace \
  -Dorg.gradle.java.home="$JAVA_HOME" \
  2>&1 | grep -E "BUILD|FAILED|ERROR|warning:|> Task|Download|error:|APK" || true

# ── Cek hasil ────────────────────────────────────────────────
APK_PATH=$(find "$AETERNA_DIR/app/build/outputs/apk" -name "*.apk" 2>/dev/null | head -1)

if [ -n "$APK_PATH" ]; then
  mkdir -p "$OUTPUT_DIR"
  FINAL_APK="$OUTPUT_DIR/AeternaGlass-$(date +%Y%m%d-%H%M).apk"
  cp "$APK_PATH" "$FINAL_APK"
  APK_SIZE=$(du -h "$FINAL_APK" | cut -f1)
  
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║   ✅ BUILD SUKSES!                                       ║"
  echo "  ╠══════════════════════════════════════════════════════════╣"
  echo "  ║   APK : $(basename "$FINAL_APK")"
  echo "  ║   Path: $FINAL_APK"
  echo "  ║   Size: $APK_SIZE"
  echo "  ╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  # Di Google Cloud Shell: download APK
  if [ -n "$GOOGLE_CLOUD_SHELL" ] || [ -n "$DEVSHELL_PROJECT_ID" ]; then
    info "Mendeteksi Google Cloud Shell. Download APK via:"
    echo -e "${YELLOW}  cloudshell download $FINAL_APK${NC}"
  fi
else
  fail "APK tidak ditemukan setelah build. Cek error di atas."
fi
