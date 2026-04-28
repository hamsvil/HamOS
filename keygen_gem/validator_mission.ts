import { validateGeminiKey } from './validator';

const rawInput = `
Maddog2222/AIzaSyAbAlPhgWgEbJ7QXyijktFy6W-
EpicpersonSuchir/var-firebaseConfig-apiKey-AIzaSyCAy9NWXnNMSZPkXsS-9Yj8CDWebHh8UV4-authDomain-f
A12345678910raghuvanshi12345678910/const-firebaseConfig-apiKey-AIzaSyDpGrK0t5Nvdz1ip-CRIIMUayHCuun9K1Q-authDomain-project
maksimvla/AIzaSyB80hhR2HG8iLqWP-MwfZ8CvyXWsP_KrAA
maxdesigntwitter-cmd/AIzaSyCJucchfH67wXIS3e3atFUg7J92lbP9DxI
nongthuyhang1978-rgb/AIzaSyCB5rT0XOmM3Uya-RCvv9nH4ejzJKbO4mo
mtnhamgv1976-del/AIzaSyA3oECm3LPMJiGrnOqgP4HOmVc8lIzaRmU
mohmed6789m-cyber/AIzaSyALDZbARVJH6y3NdGA3qF8R79PKRumnnY4
WildlifeDEE29/AIzaSyDE9_3ikb_l8yc4bVts6Sq7R4SbbIBcKVE
liixoadan/AIzaSyDwDb_oOuF6jS7XBGgxog_Uu9QC7Nls60s
rabi2005/AIzaSyBDFqbbt5b0J9cuohl5qkgAF2YJ9QU_kIw
Mkbolado176/AIzaSyAc7az8XsCm8VJpLl1FJaVW4w6G0r_hkuU
EduAims/AIzaSyAGPP4jA3hL8fesjxaVGe8bdVUoQqKLDLQ
pemmoeuy/AIzaSyC0QKGnXrgSnNn_ze_gzim1oPp8ZYP3rXk
`;

function extractKeys(text: string): string[] {
  const keys: string[] = [];
  const regex = /AIzaSy[a-zA-Z0-9_\-]+/g; 
  let match;
  while ((match = regex.exec(text)) !== null) {
    keys.push(match[0]);
  }
  return keys;
}

const keys = extractKeys(rawInput);

async function test() {
  console.log("🦾 SWARM AGENT VALIDATOR: BATCH MISSION START 🦾");
  console.log(`Target: ${keys.length} keys extracted.\n`);
  
  const validKeys: string[] = [];
  
  for (const key of keys) {
    process.stdout.write(`Testing ${key.substring(0, 10)}... `);
    const result = await validateGeminiKey(key);
    if (result.isValid) {
      console.log("✅ VALID");
      validKeys.push(key);
    } else {
      console.log(`❌ FAILED (${result.error?.split('\n')[0]})`);
    }
  }
  
  console.log("\n--- FINAL REPORT ---");
  console.log(`Total Scanned: ${keys.length}`);
  console.log(`Valid Keys: ${validKeys.length}`);
  if (validKeys.length > 0) {
    console.log("\nLIST VALID KEYS:");
    validKeys.forEach(k => console.log(k));
  }
  console.log("--------------------");
}

test();
