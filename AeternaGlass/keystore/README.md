# Keystore AeternaGlass

## Debug (built-in untuk testing)
debug.keystore akan dibuat otomatis oleh build-apk-gcs.sh

## Release (untuk publish ke Play Store)
Isi environment variable sebelum build:
  export KEYSTORE_PATH=/path/ke/keystore.jks
  export KEYSTORE_PASS=your_password
  export KEY_ALIAS=your_key_alias
  export KEY_PASS=your_key_password
