import logging
import time

class ChimeraBrain:
    """
    CHIMERA LOGIC CORE
    Decides trading actions based on Hybrid Input:
    1. Classical Data: Price Trends, PnL.
    2. Quantum Data: Grover's Probability (Confidence).
    """
    
    def __init__(self):
        self.logger = logging.getLogger("CHIMERA_LOGIC")
        self.overridge_active = False
        self.trailing_peak_price = 0.0

    def analyze(self, current_price, position_data, quantum_confidence):
        """
        Analyzes the market state and returns an action.
        Returns: 
            Action (str): 'HOLD', 'SELL', 'BUY', 'OVERRIDGE'
            New_Stop_Loss (float): Recommended SL value
            Message (str): Logic explanation
        """
        # If no position, check for ENTRY
        if not position_data:
            # ENTRY LOGIC: High Quantum Confidence (>85%) implies non-random pattern detected
            if quantum_confidence > 0.85:
                return "BUY", 0.0, "Quantum Signal Strong. Entry Initiated."
            return "WAIT", 0.0, "Scanning for Quantum Anomalies..."

        # If position exists, manage EXIT / OVERRIDGE
        entry_price = position_data['entry_price']
        current_pnl_pct = (current_price - entry_price) / entry_price
        stop_loss = position_data.get('stop_loss', entry_price * 0.99)
        
        # Update Peak Price for Trailing
        if current_price > self.trailing_peak_price:
            self.trailing_peak_price = current_price

        # --- LOGIC 1: STOP LOSS HIT ---
        if current_price <= stop_loss:
            self.overridge_active = False
            self.trailing_peak_price = 0.0
            return "SELL", 0.0, "Stop Loss Hit. Dumping assets."

        # --- LOGIC 2: OVERRIDGE CONTROL (The Chimera Special) ---
        # Logic: If Profit > 1.5% AND Quantum Confidence suggests trend continuation,
        # DO NOT SELL. Instead, tighten the Trailing Stop aggressively.
        
        PROFIT_TARGET = 0.015 # 1.5%
        
        if current_pnl_pct >= PROFIT_TARGET:
            if quantum_confidence > 0.60:
                # ENABLE OVERRIDGE
                self.overridge_active = True
                # Set Stop Loss very close to peak (0.2% drop allowed)
                new_stop_loss = self.trailing_peak_price * 0.998
                
                # Only move stop UP, never down
                final_stop = max(stop_loss, new_stop_loss)
                
                return "OVERRIDGE", final_stop, f"Overridge Active! Profit {current_pnl_pct*100:.2f}%. Pushing limits."
            
            else:
                # Quantum signal weak, take profit normally
                return "SELL", 0.0, "Target Reached & Signal Weak. Taking Profit."

        # --- LOGIC 3: HOLDING ---
        return "HOLD", stop_loss, f"Holding. PnL: {current_pnl_pct*100:.2f}%"

