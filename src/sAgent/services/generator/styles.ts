
export const cssTemplate = `
:root { --bg: #020617; --card: #0f172a; --accent: #ff8c00; --text: #f8fafc; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; overflow: hidden; user-select: none; -webkit-tap-highlight-color: transparent; }
.glass-card { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.text-glow { text-shadow: 0 0 10px rgba(255, 140, 0, 0.5); }
.animate-spin { animation: spin 1s linear infinite; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-in { animation: fadeIn 0.5s ease-out forwards; }
html, body, #root { height: 100%; width: 100%; }
input:focus, textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 15px rgba(255,140,0,0.2); }
`;
