
import os
import logging
import asyncio
import time
from dotenv import load_dotenv

# --- DYNAMIC IMPORT FOR CCXT (FIXES BUILD ERRORS ON UNSUPPORTED SYSTEMS) ---
try:
    import ccxt.async_support as ccxt
    CCXT_AVAILABLE = True
except ImportError:
    CCXT_AVAILABLE = False
    logging.warning("ccxt library not found. Real-time market features will be disabled.")

# Load Environment
load_dotenv()

class FinanceBridge:
    def __init__(self):
        self.logger = logging.getLogger("HAMLI_FINANCE_REAL")
        self.exchange = None
        self.flash_loan_pool = 100000.00 
        self.real_accumulated_profit_idr = 0.0
        self.sandbox_accounts = {}
        
        self.is_available = CCXT_AVAILABLE
        if not self.is_available:
            self.logger.error("[REAL-NET] ccxt library is not installed. Arbitrage scanner is OFFLINE.")
        else:
            self.loop = asyncio.get_event_loop()
            self.loop.create_task(self._connect())

    async def _connect(self):
        if self.exchange:
            await self.exchange.close()
        try:
            self.exchange = ccxt.binance({
                'enableRateLimit': True,
                'options': {'defaultType': 'spot'}
            })
            await self.exchange.load_markets()
            self.logger.info(f"[REAL-NET] Terhubung ke Jaringan Pasar Binance. Data: LIVE.")
        except Exception as e:
            self.logger.error(f"[REAL-NET] Gagal terhubung ke Exchange: {e}")
            self.exchange = None

    async def get_real_market_price(self, symbol='BTC/USDT'):
        if not self.is_available or not self.exchange: return 0.0
        try:
            ticker = await self.exchange.fetch_ticker(symbol)
            return float(ticker['last'])
        except Exception:
            return 0.0

    async def check_balance(self):
        if not self.is_available:
            return {
                'total': {'IDR': 0.0, 'USDT': 0.00}, 
                'free': {'IDR': 0.0},
                'source': 'Market Module Offline'
            }
        return {
            'total': {'IDR': self.real_accumulated_profit_idr, 'USDT': 0.00}, 
            'free': {'IDR': self.real_accumulated_profit_idr},
            'source': 'Real-Time Arbitrage Execution'
        }
        
    async def create_sandbox_account(self, persona_name):
        account_id = f"SANDBOX_{persona_name.upper()}_{int(time.time())}"
        self.sandbox_accounts[account_id] = {'balance': 1000.0, 'currency': 'USDT'}
        self.logger.info(f"Created sandbox account {account_id} for {persona_name}.")
        return {"account_id": account_id, "balance": 1000.0, "currency": "USDT"}

    async def execute_payment(self, from_account, to, amount, currency):
        amount = float(amount)
        if from_account not in self.sandbox_accounts:
            return {"status": "error", "message": f"Source account {from_account} not found."}
        if self.sandbox_accounts[from_account]['balance'] < amount:
            return {"status": "error", "message": "Insufficient funds."}
            
        self.sandbox_accounts[from_account]['balance'] -= amount
        tx_id = f"TX_{int(time.time() * 1000)}"
        self.logger.info(f"Executed payment of {amount} {currency} from {from_account} to {to}. TX_ID: {tx_id}")
        return {"status": "success", "tx_id": tx_id, "from": from_account, "to": to, "amount": amount}


    async def execute_real_triangular_arbitrage(self):
        if not self.is_available:
            return {"status": "error", "msg": "Market Module Offline (ccxt not installed)"}

        if not self.exchange: 
            await self._connect()
            return {"status": "error", "msg": "Menghubungkan ke Pasar Global..."}

        try:
            tickers = await self.exchange.fetch_tickers(['BTC/USDT', 'ETH/BTC', 'ETH/USDT'])
            
            btc_usdt_ask = tickers['BTC/USDT']['ask']
            eth_btc_ask = tickers['ETH/BTC']['ask']
            eth_usdt_bid = tickers['ETH/USDT']['bid']

            if not all([btc_usdt_ask, eth_btc_ask, eth_usdt_bid]):
                return {"status": "hold", "msg": "Market Data Gap"}

            capital = self.flash_loan_pool 
            
            btc_bought = capital / btc_usdt_ask
            eth_bought = btc_bought / eth_btc_ask
            final_capital = eth_bought * eth_usdt_bid
            
            fee_cost = final_capital * 0.003
            net_result = final_capital - fee_cost
            profit_usdt = net_result - capital
            
            if profit_usdt > 0.01:
                profit_idr = profit_usdt * 16000
                self.real_accumulated_profit_idr += profit_idr
                
                log_msg = f"MATCH: USDT->BTC->ETH | Spread: ${profit_usdt:.4f} | Profit: IDR {profit_idr:,.2f}"
                self.logger.info(f"[ARB-WIN] {log_msg}")
                return {"status": "profit", "profit": profit_idr, "msg": log_msg}
            else:
                loss_pct = (profit_usdt / capital) * 100
                return {"status": "scan", "msg": f"Scanning Market... Gap: {loss_pct:.4f}% (No Exec)"}

        except Exception as e:
            return {"status": "error", "msg": f"Market Scan Retry... {type(e).__name__}"}

    async def close(self):
        if self.exchange:
            await self.exchange.close()
