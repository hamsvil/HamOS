import asyncio
import os
import json
import logging
import secrets
import websockets
from dotenv import load_dotenv

# Internal Modules
from finance_bridge import FinanceBridge
from quantum_core import QuantumCore

# --- AUTO-GENERATE ENV IF MISSING ---
def ensure_env():
    env_path = os.path.join(os.getcwd(), '.env')
    if not os.path.exists(env_path):
        print("[HAMLI KERNEL] .env file not found. Creating default configuration...")
        default_config = """# HAM TUNNEL PRO CONFIGURATION
GEMINI_API_KEY=
IBMQ_API_TOKEN=
EXCHANGE_ID=binance
EXCHANGE_API_KEY=
EXCHANGE_SECRET=
E_WALLET_NUMBER=
BANK_ACCOUNT=
"""
        with open(env_path, 'w') as f:
            f.write(default_config)
        print("[HAMLI KERNEL] .env created. Waiting for UI input...")

ensure_env()
load_dotenv()

# Centralized Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [HAMLI KERNEL] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("hamli_core.log"),
        logging.StreamHandler()
    ]
)

# GLOBAL STATE
SYSTEM_STATE = {
    "MINING": False,
    "QBITS": 0,
    "CLIENTS": set()
}

FINANCE_CORE = None

# --- CONFIG MANAGEMENT ---
def update_env_file(config):
    """Writes UI Inputs directly to .env for persistence."""
    path = os.path.join(os.getcwd(), '.env')
    mapping = {
        'ibmqToken': 'IBMQ_API_TOKEN',
        'binanceApiKey': 'EXCHANGE_API_KEY',
        'binanceSecret': 'EXCHANGE_SECRET',
        'walletNumber': 'E_WALLET_NUMBER',
        'bankAccount': 'BANK_ACCOUNT'
    }
    
    current_vars = {}
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                if '=' in line:
                    k, v = line.strip().split('=', 1)
                    current_vars[k] = v
    
    for ui_key, env_key in mapping.items():
        if config.get(ui_key):
            val = config[ui_key]
            current_vars[env_key] = val
            os.environ[env_key] = val # Runtime update

    with open(path, 'w') as f:
        for k, v in current_vars.items():
            f.write(f"{k}={v}\n")
    return True

# --- CORE LOOP ---
async def chimera_loop(miner):
    global FINANCE_CORE
    symbol = "BTC/USDT"
    
    while True:
        if SYSTEM_STATE["MINING"]:
            # 1. QUANTUM PATH (Prediction)
            grover_circuit = miner.build_grover_circuit()
            result = await miner.execute_circuit(grover_circuit)
            confidence = miner.calculate_confidence(result)

            # 2. CLASSICAL PATH (Finance)
            log_msg = ""
            if FINANCE_CORE:
                price = await FINANCE_CORE.get_ticker_price(symbol)
                
                # Execute Chimera Logic
                result_trade = await FINANCE_CORE.execute_chimera_logic(symbol, price, confidence)
                log_msg = f" | {result_trade['msg']}"
                
                if result_trade['status'] == 'closed':
                    SYSTEM_STATE["QBITS"] += 10 # Reward
            
            # Simulated mining reward based on "finding" the nonce (high confidence)
            SYSTEM_STATE["QBITS"] += (1 if confidence > 0.6 else 0)
            
            # Broadcast to UI
            msg = {
                "type": "MINING_RESULT",
                "success": True,
                "profit": 1 if confidence > 0.6 else 0,
                "msg": f"Q-Conf: {confidence*100:.1f}%{log_msg}"
            }
            await broadcast(msg)
            
        await asyncio.sleep(2) # Throttle loop

# --- WEBSOCKET SERVER ---
async def handler(websocket):
    global FINANCE_CORE
    SYSTEM_STATE["CLIENTS"].add(websocket)
    logging.info("UI Connected to Quantum Core.")
    
    # Handshake with Security Token if Finance Core is active
    if FINANCE_CORE:
        await websocket.send(json.dumps({
            "type": "AUTH_TOKEN", 
            "token": "CLIENT_VIEW_ONLY", 
            "msg": "Secure Finance Channel Established"
        }))

    try:
        async for message in websocket:
            data = json.loads(message)
            cmd = data.get("command")
            
            if cmd == "START_MINING":
                SYSTEM_STATE["MINING"] = True
                await websocket.send(json.dumps({"type": "STATUS", "status": "STARTED", "msg": "CHIMERA ENGAGED"}))
                
            elif cmd == "STOP_MINING":
                SYSTEM_STATE["MINING"] = False
                await websocket.send(json.dumps({"type": "STATUS", "status": "STOPPED", "msg": "System Halted"}))
                
            elif cmd == "SAVE_CONFIG":
                update_env_file(data.get("config", {}))
                # Hot Reload Finance Core
                if FINANCE_CORE:
                    FINANCE_CORE.reload_config()
                else:
                    FINANCE_CORE = FinanceBridge() # Init if first time
                await websocket.send(json.dumps({"type": "LOG", "msg": "Config Saved & Core Reloaded", "level": "success"}))
                
            elif cmd == "GET_FINANCE_DATA":
                if FINANCE_CORE:
                    bal = await FINANCE_CORE.check_balance()
                    price = await FINANCE_CORE.get_ticker_price()
                    await websocket.send(json.dumps({"type": "FINANCE_UPDATE", "balance": bal, "btc_price": price}))

    except Exception as e:
        logging.error(f"WS Error: {e}")
    finally:
        SYSTEM_STATE["CLIENTS"].remove(websocket)

async def broadcast(msg):
    if not SYSTEM_STATE["CLIENTS"]: return
    data = json.dumps(msg)
    await asyncio.gather(*[c.send(data) for c in SYSTEM_STATE["CLIENTS"]], return_exceptions=True)

async def main():
    global FINANCE_CORE
    print("BOOTING HAMLI QUANTUM KERNEL...")
    
    miner = QuantumCore()
    
    # Try init finance, might fail if env vars not set yet
    try:
        FINANCE_CORE = FinanceBridge()
    except:
        print("Finance Bridge waiting for configuration...")
    
    server = await websockets.serve(handler, "localhost", 8765)
    print("CORE ONLINE: ws://localhost:8765")
    
    await asyncio.gather(server.wait_closed(), chimera_loop(miner))

if __name__ == "__main__":
    asyncio.run(main())
