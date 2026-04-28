import asyncio
import os
import json
import logging
import websockets
import psutil
from dotenv import load_dotenv

# Internal Modules
from finance_bridge import FinanceBridge
from quantum_core import QuantumCore

# --- SETUP ENV ---
def ensure_env():
    env_path = os.path.join(os.getcwd(), '.env.local')
    if not os.path.exists(env_path):
        with open(env_path, 'w') as f: f.write("IBMQ_API_TOKEN=\n")

ensure_env()
load_dotenv(dotenv_path=os.path.join(os.getcwd(), '.env.local'))

# Logging Real
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [HAMLI KERNEL] - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# GLOBAL STATE (PERSISTENT IN MEMORY)
SYSTEM_STATE = {
    "RUNNING": True, # Always run on start
    "CLIENTS": set(), 
    "RAM_THROTTLED": False
}
FINANCE_CORE = None

def check_ram_usage():
    try:
        if psutil.virtual_memory().percent > 50.0: return True
    except: pass
    return False

# --- DAEMON LOOP (BACKGROUND WORKER) ---
async def arbitrage_daemon(miner):
    global FINANCE_CORE
    logging.info("[SYSTEM] Arbitrage Daemon Started. Scanning Real Markets...")
    
    while True:
        # Loop ini berjalan abadi selama script python hidup (Service/Background)
        if SYSTEM_STATE["RUNNING"]:
            
            # 1. RAM Management
            is_heavy = check_ram_usage()
            delay = 2 if is_heavy else 0.1 # Scan secepat mungkin (100ms) jika RAM aman
            
            if FINANCE_CORE:
                # 2. REAL MARKET SCAN
                trade_result = await FINANCE_CORE.execute_real_triangular_arbitrage()
                
                # 3. QUANTUM VALIDATION
                # Kita gunakan Quantum Core untuk memvalidasi tren momentum saat profit ditemukan
                q_confidence = 0.0
                if trade_result['status'] == 'profit':
                    # Hanya jalankan sirkuit kuantum berat jika ada uang di meja
                    q_confidence = await miner.run_and_get_confidence()
                
                # 4. BROADCAST KE UI (JIKA ADA)
                if SYSTEM_STATE["CLIENTS"]:
                    msg = {
                        "type": "MINING_RESULT",
                        "success": trade_result['status'] == 'profit',
                        "profit": trade_result.get('profit', 0),
                        "msg": f"{trade_result['msg']}"
                    }
                    await broadcast(msg)
                else:
                    # JIKA UI DITUTUP, TETAP CATAT LOG (BACKGROUND)
                    if trade_result['status'] == 'profit':
                        logging.info(f"[BACKGROUND-PROFIT] {trade_result['msg']}")

            await asyncio.sleep(delay)
        else:
            await asyncio.sleep(1)

# --- WEBSOCKET HANDLER ---
async def handler(websocket):
    global FINANCE_CORE
    SYSTEM_STATE["CLIENTS"].add(websocket)
    
    # Sync status saat connect
    await websocket.send(json.dumps({"type": "STATUS", "status": "STARTED", "msg": "REAL-TIME MARKET UPLINK ACTIVE"}))

    try:
        async for message in websocket:
            data = json.loads(message)
            cmd = data.get("command")
            
            if cmd == "START_MINING":
                SYSTEM_STATE["RUNNING"] = True
            elif cmd == "STOP_MINING":
                # User pause, tapi daemon tetap standby
                SYSTEM_STATE["RUNNING"] = False 
            elif cmd == "GET_FINANCE_DATA":
                if FINANCE_CORE:
                    bal = await FINANCE_CORE.check_balance()
                    price = await FINANCE_CORE.get_real_market_price()
                    await websocket.send(json.dumps({"type": "FINANCE_UPDATE", "balance": bal, "btc_price": price}))

    except: pass
    finally:
        SYSTEM_STATE["CLIENTS"].remove(websocket)

async def broadcast(msg):
    if not SYSTEM_STATE["CLIENTS"]: return
    await asyncio.gather(*[c.send(json.dumps(msg)) for c in SYSTEM_STATE["CLIENTS"]], return_exceptions=True)

async def main():
    global FINANCE_CORE
    logging.info("BOOTING REALITY ENGINE...")
    
    miner = QuantumCore()
    try:
        FINANCE_CORE = FinanceBridge() # Init Real Finance
    except Exception as e:
        logging.error(f"Finance Init Error: {e}")

    server = await websockets.serve(handler, "localhost", 8765)
    logging.info("INTERFACE READY: ws://localhost:8765")
    
    # Jalankan Server dan Daemon secara paralel
    # Daemon akan terus berjalan meskipun tidak ada klien WebSocket
    await asyncio.gather(server.wait_closed(), arbitrage_daemon(miner))

if __name__ == "__main__":
    asyncio.run(main())
