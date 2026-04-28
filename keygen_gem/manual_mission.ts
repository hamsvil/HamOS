import { validateGeminiKey } from './validator';

const keys = [
  "AIzaSyDKW-9Y5uCVYcA2DFcja5cFseD97wkjTcg",
  "AIzaSyBRF511bduw5wQHgd6sJO3BBQ7m6UnEPnc",
  "AIzaSyAOZczwL-o1QOnyIUeglXA4aDYJ6u4saZA",
  "AIzaSyDSWAuSrfVojQdouCJxH3XRuMG1oS3EDds",
  "AIzaSyASx2zLQFSBzaY1Jc_x8TgC053Cbdp89WM",
  "AIzaSyAS6KrhRh_Vp95y11oDrXGfzmocApQeB14",
  "AIzaSyBIBfrDP-eKLhH3PeynrOeV88MwqNCtIGA",
  "AIzaSyBy62zytl-M98pydH2jkcqSrq_mqWjESNs",
  "AIzaSyCu4vZyl4af4UQu1LsoKVcHVXkqegbg7Ro",
  "AIzaSyBpSedSoY0zHTWnmvMp-3ZlexPXtQwitwM",
  "AIzaSyBvgYU_YDBJVStC6LDX4GgkiX912vmHrCg",
  "AIzaSyCc1JzfMMbaLaW6iofoRAjOCs-TOr722Xk",
  "AIzaSyDjnewj5JJFuqZaokqdbJ2ma7nhPkuwTpM",
  "AIzaSyC_GtMRdx-SNeljqjHvLSDmwAe3Cnde944",
  "AIzaSyDcENnDma2HnOgZZMqRyZK_jvgnGkzkMUE",
  "AIzaSyATEOpDthvIVTe9Qmibj-SUaldX4bAR_fg"
];

async function test() {
  console.log("--- SWARM PRIORITY MISSION REPORT ---");
  for (const key of keys) {
    const result = await validateGeminiKey(key);
    console.log(`Key: ${key}`);
    console.log(`Status: ${result.isValid ? "✅ VALID" : "❌ INVALID"}`);
    if (result.isValid) console.log(`Models Found: ${result.modelCount}`);
    if (result.error) console.log(`Reason: ${result.error}`);
    console.log(`Latency: ${result.responseTime}ms`);
    console.log("-------------------------------------");
  }
}

test();
