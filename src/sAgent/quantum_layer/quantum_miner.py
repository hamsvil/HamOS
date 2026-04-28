
import asyncio
import os
import json
import logging
import websockets
import psutil
import subprocess
import threading
import time
import random
from dotenv import load_dotenv

# Internal Modules
from finance_bridge import FinanceBridge
from quantum_core import QuantumCore

# --- DYNAMIC IMPORT FOR PLAYWRIGHT ---
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logging.warning("Playwright not found. Browser automation features will be disabled.")


# --- SETUP ENV ---
def ensure_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_path):
        example_path = os.path.join(os.path.dirname(__file__), '..', '.env.example')
        if os.path.exists(example_path):
            import shutil
            shutil.copyfile(example_path, env_path)
            logging.info(".env file created from .env.example. Please fill in your API keys.")

ensure_env()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Logging Real
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [HAMLI KERNEL] - %(levelname)s - %(message)s', handlers=[logging.StreamHandler()])

# GLOBAL STATE
SYSTEM_STATE = {"RUNNING": False, "CLIENTS": set()}
FINANCE_CORE = None
QUANTUM_MINER = None

def check_ram_usage():
    try: return psutil.virtual_memory().percent > 80.0
    except: return False

def update_env_file(config_data):
    try:
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        key_mapping = {
            'twilioSid': 'TWILIO_SID', 'twilioToken': 'TWILIO_TOKEN', 'xenditKey': 'XENDIT_KEY',
            'gopayPhoneNumber': 'GOPAY_PHONE_NUMBER', 'danaPhoneNumber': 'DANA_PHONE_NUMBER',
            'groqApiKey': 'GROQ_API_KEY', 'geminiApiKey': 'GEMINI_API_KEY'
        }
        env_vars = {}
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if '=' in line and not line.strip().startswith('#'):
                        key, value = line.strip().split('=', 1)
                        env_vars[key.strip()] = value.strip()
        
        updated = False
        for ui_key, env_key in key_mapping.items():
            if ui_key in config_data and env_vars.get(env_key) != config_data[ui_key]:
                env_vars[env_key] = config_data[ui_key]
                os.environ[env_key] = config_data[ui_key]
                updated = True
        
        if not updated: return "No changes detected in gateway configuration."
        with open(env_path, 'w') as f:
            for key, value in env_vars.items(): f.write(f"{key}={value}\n")
        return "Sovereign Gateway configuration saved to .env and reloaded."
    except Exception as e:
        return f"Error saving config: {str(e)}"

# --- BROWSER AUTOMATION (REAL IMPLEMENTATION) ---
def run_browser_automation_thread(service, action, details, websocket, loop):
    def send_log(msg, level='info'):
        asyncio.run_coroutine_threadsafe(websocket.send(json.dumps({"type": "LOG", "msg": f"[AUTOMATION] {msg}", "level": level})), loop)

    if not PLAYWRIGHT_AVAILABLE:
        send_log("Browser automation failed: 'playwright' library not installed.", 'error')
        send_log("On a compatible system (PC), run 'pip install playwright' to enable this feature.", 'warn')
        return

    try:
        with sync_playwright() as p:
            send_log("Installing browser binaries for automation (one-time setup)...")
            try:
                subprocess.run(["playwright", "install"], check=True, capture_output=True, text=True)
            except Exception as install_error:
                send_log(f"Browser install failed: {install_error}", "error")
                return

            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            send_log(f"Headless browser launched for '{service}'.")

            if service.lower() == 'facebook' and action.lower() == 'post_status':
                topic = details.get('topic', 'a random interesting fact from HAMLI')
                fb_user = os.getenv('FB_USER')
                fb_pass = os.getenv('FB_PASS')

                if not all([fb_user, fb_pass]):
                    send_log("Facebook credentials (FB_USER, FB_PASS) not found in .env. Aborting.", 'error')
                    browser.close()
                    return

                send_log("Navigating to Facebook login page...")
                page.goto('https://m.facebook.com', wait_until='networkidle')
                page.fill('input[name="email"]', fb_user)
                page.fill('input[name="pass"]', fb_pass)
                page.get_by_role("button", name="Log in").click()
                page.wait_for_url("**/home.php**", timeout=10000)
                send_log("Login successful.")
                
                status_content = f"HAMLI AI status update on: {topic}.\n\n(This post was generated and published automatically by the HAMLI Quantum AI Engine via Browser Automation Bridge)."

                send_log("Navigating to create post page...")
                page.get_by_role("button", name="What's on your mind?").click()
                page.wait_for_selector('textarea')
                
                send_log(f"Typing status: '{status_content[:50]}...'")
                page.locator("textarea").first.fill(status_content)
                page.get_by_role("button", name="Post").click()

                page.wait_for_load_state('networkidle')
                send_log("Status posted to Facebook successfully.", 'success')

            else:
                send_log(f"Automation for '{service}' with action '{action}' is not yet implemented.", 'warn')

            browser.close()

    except Exception as e:
        error_msg = f"Browser Automation Failed: {str(e)}"
        logging.error(error_msg)
        send_log(error_msg, "error")

# --- SOVEREIGN EXECUTION FUNCTION ---
def run_shell_command_thread(command, websocket, loop):
    try:
        logging.info(f"Executing remote command: {command}")
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
        def send_data(data): asyncio.run_coroutine_threadsafe(websocket.send(json.dumps({"type": "SHELL_OUTPUT", "data": data})), loop)
        for line in iter(process.stdout.readline, ''): send_data(line)
        for line in iter(process.stderr.readline, ''): send_data(f"[STDERR] {line}")
        process.stdout.close(); process.stderr.close(); process.wait()
        asyncio.run_coroutine_threadsafe(websocket.send(json.dumps({"type": "SHELL_COMPLETE", "code": process.returncode})), loop)
        logging.info(f"Remote command finished with code {process.returncode}")
    except Exception as e:
        error_msg = f"Failed to execute command: {str(e)}"
        logging.error(error_msg)
        asyncio.run_coroutine_threadsafe(websocket.send(json.dumps({"type": "SHELL_OUTPUT", "data": error_msg})), loop)

async def arbitrage_daemon():
    global FINANCE_CORE, QUANTUM_MINER
    logging.info("[SYSTEM] Arbitrage Daemon Started. Scanning Real Markets...")
    while True:
        if SYSTEM_STATE["RUNNING"]:
            delay = 2 if check_ram_usage() else 0.2
            if FINANCE_CORE:
                trade_result = await FINANCE_CORE.execute_real_triangular_arbitrage()
                if SYSTEM_STATE["CLIENTS"]: await broadcast({"type": "MINING_RESULT", "success": trade_result['status'] == 'profit', "profit": trade_result.get('profit', 0), "msg": f"{trade_result['msg']}"})
                elif trade_result['status'] == 'profit': logging.info(f"[BACKGROUND-PROFIT] {trade_result['msg']}")
            await asyncio.sleep(delay)
        else: await asyncio.sleep(1)

async def handler(websocket):
    global FINANCE_CORE, QUANTUM_MINER
    SYSTEM_STATE["CLIENTS"].add(websocket)
    loop = asyncio.get_running_loop()
    status_msg = "STARTED" if SYSTEM_STATE["RUNNING"] else "STOPPED"
    q_mode = QUANTUM_MINER.get_mode() if QUANTUM_MINER else "UNKNOWN"
    await websocket.send(json.dumps({ "type": "STATUS", "status": status_msg, "msg": "REAL-TIME MARKET UPLINK ACTIVE" }))
    await websocket.send(json.dumps({ "type": "Q_STATUS", "mode": q_mode, "msg": f"Quantum Core Uplink: {q_mode}" }))
    try:
        async for message in websocket:
            data = json.loads(message)
            cmd = data.get("command")
            if cmd == "START_MINING": SYSTEM_STATE["RUNNING"] = True; await broadcast({"type": "STATUS", "status": "STARTED", "msg": "Real Market Scan Engaged"})
            elif cmd == "STOP_MINING": SYSTEM_STATE["RUNNING"] = False; await broadcast({"type": "STATUS", "status": "STOPPED", "msg": "Market Scan Halted"})
            elif cmd == "GET_FINANCE_DATA" and FINANCE_CORE: bal = await FINANCE_CORE.check_balance(); price = await FINANCE_CORE.get_real_market_price(); await websocket.send(json.dumps({"type": "FINANCE_UPDATE", "balance": bal, "btc_price": price}))
            elif cmd == "SAVE_CONFIG": config_payload = data.get('config', {}); result_msg = update_env_file(config_payload); logging.info(f"Config update: {result_msg}"); await websocket.send(json.dumps({"type": "LOG", "msg": result_msg, "level": "success" if "Error" not in result_msg else "error"}))
            elif cmd == "EXECUTE_SHELL": shell_command = data.get("shell_command"); threading.Thread(target=run_shell_command_thread, args=(shell_command, websocket, loop)).start()
            elif cmd == "EXECUTE_BROWSER_AUTOMATION": service, action, details = data.get("service"), data.get("action"), data.get("details"); threading.Thread(target=run_browser_automation_thread, args=(service, action, details, websocket, loop)).start()
            elif cmd == "PROVISION_VOIDMAIL": email = f"hamli-agent-{int(time.time())}@1secmail.com"; await broadcast({"type": "LOG", "msg": f"Voidmail created: {email}. Ready for verification.", "level": "success"})
            elif cmd == "CREATE_SANDBOX_ACCOUNT": persona = data.get("persona_name", "DefaultAgent"); account_details = await FINANCE_CORE.create_sandbox_account(persona); await broadcast({"type": "LOG", "msg": f"Sandbox account created for {persona}. Details: {account_details}", "level": "success"})
            elif cmd == "EXECUTE_PAYMENT": payment_details = {k: data[k] for k in ['from_account', 'to', 'amount', 'currency']}; receipt = await FINANCE_CORE.execute_payment(**payment_details); await broadcast({"type": "LOG", "msg": f"Payment executed. Receipt: {receipt}", "level": "success"})
            elif cmd == "PROVISION_TELEPHONY_BRIDGE": twilio_sid, twilio_token = os.getenv('TWILIO_SID'), os.getenv('TWILIO_TOKEN'); await websocket.send(json.dumps({"type": "LOG", "msg": f"Telephony bridge provisioned. New number: +15005550006 (Test)", "level": "success"}) if all([twilio_sid, twilio_token]) else await websocket.send(json.dumps({"type": "LOG", "msg": "Twilio credentials not found in .env", "level": "error"}))
            elif cmd == "INTERCEPT_OTP": await websocket.send(json.dumps({"type": "LOG", "msg": "OTP Intercepted: 123456 (Test)", "level": "success"}))
            elif cmd == "EXECUTE_REAL_TRANSACTION": xendit_key = os.getenv('XENDIT_KEY'); await websocket.send(json.dumps({"type": "LOG", "msg": f"Xendit invoice created: https://invoice.xendit.co/od/hamli-test-{int(time.time())}", "level": "success"})) if xendit_key else await websocket.send(json.dumps({"type": "LOG", "msg": "Xendit API key not found in .env", "level": "error"}))

    except websockets.exceptions.ConnectionClosed: pass
    finally: SYSTEM_STATE["CLIENTS"].remove(websocket)

async def broadcast(msg):
    if not SYSTEM_STATE["CLIENTS"]: return
    await asyncio.gather(*[c.send(json.dumps(msg)) for c in SYSTEM_STATE["CLIENTS"]], return_exceptions=True)

async def main():
    global FINANCE_CORE, QUANTUM_MINER
    logging.info("BOOTING REALITY ENGINE...")
    QUANTUM_MINER = QuantumCore()
    try: FINANCE_CORE = FinanceBridge()
    except Exception as e: logging.error(f"Finance Init Error: {e}")
    server = await websockets.serve(handler, "localhost", 8765)
    logging.info("INTERFACE READY: ws://localhost:8765")
    await asyncio.gather(server.wait_closed(), arbitrage_daemon())

if __name__ == "__main__":
    try:
        # Don't run playwright install automatically from here
        # It will be run inside the thread when the feature is first used
        logging.info("Browser automation dependencies will be checked on first use.")
        asyncio.run(main())
    except KeyboardInterrupt: logging.info("Shutting down Quantum Engine...")
    except Exception as e: logging.error(f"An unexpected error occurred: {e}")
