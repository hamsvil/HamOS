import { Veo3Agent } from "./src/services/veoAgent";
import { getPrimaryGeminiKey } from "./src/config/hardcodedKeys";

async function run() {
  const key = getPrimaryGeminiKey();
  const veo = new Veo3Agent(key);
  console.log("Memulai pengujian The Director (Agent 27) untuk video 2 detik...");
  const result = await veo.generateVideo("Sebuah video fotorealistik makro: Tetesan embun pagi jatuh perlahan ke atas daun hijau bertekstur, durasi 2 detik.");
  console.log("Hasil Uji:", JSON.stringify(result, null, 2));
}

run();
