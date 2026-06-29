import admin from "firebase-admin";
import { readFileSync } from "node:fs";

const key = JSON.parse(readFileSync("c:\\Users\\trnnha\\Desktop\\AI Project\\dangphuc-434b5-key.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(key),
});

const db = admin.firestore();

try {
  const settings = await db.collection("app_settings").doc("main").get();
  console.log("app_settings/main exists:", settings.exists);

  const cardsAll = await db.collection("german_cards").count().get();
  console.log(`TOTAL german_cards: ${cardsAll.data().count}`);

  const studyAll = await db.collection("study_cards").count().get();
  console.log(`TOTAL study_cards: ${studyAll.data().count}`);

  const sample = await db.collection("german_cards").select("word", "article", "pos").limit(5).get();
  console.log(`\nSample german_cards:`);
  sample.forEach((d) => {
    const data = d.data();
    console.log(`  - [${data.pos}] ${data.article ?? ""} ${data.word ?? ""}`);
  });

  process.exit(0);
} catch (err) {
  console.error("FAILED:", err.message);
  console.error("Code:", err.code);
  if (err.errorInfo) console.error("Info:", JSON.stringify(err.errorInfo));
  process.exit(1);
}
