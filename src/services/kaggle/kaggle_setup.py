# Kaggle Setup Script for Ham AI Studio
# Run this in a Kaggle Notebook with GPU enabled (T4 x2 or P100)
# Make sure "Internet" is enabled in the notebook settings.

import os
import time
import subprocess
from pyngrok import ngrok

# 1. Install Dependencies
print("Installing dependencies...")
os.system("curl -fsSL https://ollama.com/install.sh | sh")
os.system("pip install pyngrok")

# 2. Configure Ngrok (Optional but Recommended for Stability)
# Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
NGROK_AUTH_TOKEN = "YOUR_NGROK_TOKEN_HERE"  # Replace this!
if NGROK_AUTH_TOKEN != "YOUR_NGROK_TOKEN_HERE":
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)

# 3. Start Ollama Server in Background
print("Starting Ollama server...")
subprocess.Popen(["ollama", "serve"])
time.sleep(5)  # Wait for server to start

# 4. Pull Model (Choose one based on VRAM)
# T4 x2 has ~30GB VRAM total, but Ollama might use only one GPU by default unless configured.
# Safe bet: 7B - 14B models.
MODEL_NAME = "qwen2.5:14b" 
# MODEL_NAME = "llama3.1:8b"
# MODEL_NAME = "deepseek-coder-v2:16b"

print(f"Pulling model {MODEL_NAME}...")
os.system(f"ollama pull {MODEL_NAME}")

# 5. Start Tunnel
print("Starting tunnel...")
# Open a HTTP tunnel on the default port 11434
public_url = ngrok.connect(11434).public_url
print(f"\n✅ YOUR PUBLIC URL: {public_url}")
print(f"Copy this URL into Ham AI Studio settings as 'Kaggle Endpoint'.")

# 6. Keep Alive
print("Server is running. Do not close this tab.")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopping server...")
    ngrok.kill()
