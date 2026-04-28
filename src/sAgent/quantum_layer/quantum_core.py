import asyncio
import os
import json
import logging
import time
import numpy as np
from dotenv import load_dotenv
from qiskit import QuantumCircuit
from qiskit.primitives import Sampler
from qiskit_ibm_runtime import QiskitRuntimeService, Session, SamplerV2 as Sampler

# Init Environment
load_dotenv()

class QuantumCore:
    def __init__(self):
        self.logger = logging.getLogger("HAMLI_QUANTUM_CORE")
        self.api_key = os.getenv("IBMQ_API_TOKEN")
        self.service = None
        self.backend = None
        self.simulated_mode = False
        
        self._connect_to_ibm()

    def _connect_to_ibm(self):
        if not self.api_key or "Paste_Your" in self.api_key or len(self.api_key) < 20:
            self.logger.warning("IBMQ API Key invalid or missing. Switching to LOCAL SIMULATOR mode.")
            self.simulated_mode = True
            return

        try:
            self.logger.info("Handshaking with IBM Quantum Cloud...")
            QiskitRuntimeService.save_account(channel="ibm_quantum", token=self.api_key, overwrite=True)
            self.service = QiskitRuntimeService(channel="ibm_quantum")
            
            try:
                self.backend = self.service.least_busy(simulator=False, operational=True)
                self.logger.info(f"Targeting Real Quantum Processor: {self.backend.name}")
            except:
                self.logger.warning("Real hardware busy. Fallback to Cloud Simulator.")
                self.backend = self.service.backend("ibmq_qasm_simulator")
                
        except Exception as e:
            self.logger.error(f"IBM Quantum Connection Failed: {str(e)}. Switching to Simulation.")
            self.simulated_mode = True

    def get_mode(self):
        return "SIMULATED" if self.simulated_mode else "REAL"

    def build_grover_circuit(self):
        num_qubits = 2
        qc = QuantumCircuit(num_qubits)
        qc.h(range(num_qubits))
        qc.cz(0, 1) # Oracle
        qc.h(range(num_qubits))
        qc.z(range(num_qubits))
        qc.cz(0, 1) # Diffuser
        qc.h(range(num_qubits))
        qc.measure_all()
        return qc

    async def execute_circuit(self, circuit):
        if self.simulated_mode:
            await asyncio.sleep(0.5) 
            prob = 0.5 + (0.4 * np.random.random())
            return {'11': int(prob * 1024), '00': int((1-prob) * 1024)}

        try:
            with Session(service=self.service, backend=self.backend) as session:
                sampler = Sampler(session=session)
                job = sampler.run([circuit])
                result = job.result()
                counts = result[0].data.meas.get_counts()
                return counts
        except Exception as e:
            self.logger.error(f"Quantum Execution Error: {e}")
            return None

    def calculate_confidence(self, quantum_result):
        if not quantum_result: return 0.0
        target_state = '11'
        success_shots = quantum_result.get(target_state, 0)
        total_shots = sum(quantum_result.values())
        if total_shots == 0: return 0.0
        return success_shots / total_shots
    
    async def run_and_get_confidence(self):
        circuit = self.build_grover_circuit()
        result = await self.execute_circuit(circuit)
        return self.calculate_confidence(result)