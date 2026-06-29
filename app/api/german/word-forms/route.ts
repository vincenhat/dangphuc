import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/german/word-forms
 * Body: { word: string, model?: string }
 *
 * Trả về một JSON object có ba "khối" có thể null nếu từ không thuộc loại đó:
 *   - noun: { article, plural, genitive_singular, note } — đủ để client compute
 *     đầy đủ 8 ô case×number (Nom/Akk/Dat/Gen × Sg/Pl).
 *   - verb: { praesens, praeteritum (mỗi cái 6 ngôi), partizip2, perfekt_aux,
 *     type, note } — chia đầy đủ vì có rất nhiều vowel-shifting verbs
 *     (geben→gebe/gibst/gibt) mà không thể tự suy.
 *   - adjective: { comparative, superlative, note } — chỉ trả về dạng so sánh;
 *     bảng schwache Deklination 4×4 được client tự compute từ stem.
 */

interface NounForm {
  article: "der" | "die" | "das";
  plural: string;
  genitive_singular: string;
  note: string;
}
interface VerbPersonForms {
  ich: string;
  du: string;
  er: string;
  wir: string;
  ihr: string;
  sie: string;
}
interface VerbForm {
  praesens: VerbPersonForms;
  praeteritum: VerbPersonForms;
  partizip2: string;
  perfekt_aux: "haben" | "sein";
  type: "regular" | "irregular";
  note: string;
}
interface AdjForm {
  comparative: string;
  superlative: string;
  note: string;
}
interface WordForms {
  word: string;
  noun: NounForm | null;
  verb: VerbForm | null;
  adjective: AdjForm | null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { word?: unknown; model?: unknown };
  const word = typeof body.word === "string" ? body.word.trim() : "";
  const model = typeof body.model === "string" ? body.model : undefined;
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });
  if (word.length > 60) {
    return NextResponse.json({ error: "word too long" }, { status: 400 });
  }

  const system =
    "Bạn là giáo viên tiếng Đức cho người Việt. Phân tích MỘT từ tiếng Đức và xác định nó có thể là " +
    "danh từ (Substantiv), động từ (Verb) và/hoặc tính từ (Adjektiv) hay không. " +
    "Trả về DUY NHẤT một JSON object, không markdown, theo đúng schema: " +
    '{"word":string,' +
    '"noun":null hoặc {"article":"der"|"die"|"das","plural":string,"genitive_singular":string,"note":string},' +
    '"verb":null hoặc {' +
    '"praesens":{"ich":string,"du":string,"er":string,"wir":string,"ihr":string,"sie":string},' +
    '"praeteritum":{"ich":string,"du":string,"er":string,"wir":string,"ihr":string,"sie":string},' +
    '"partizip2":string,"perfekt_aux":"haben"|"sein","type":"regular"|"irregular","note":string},' +
    '"adjective":null hoặc {"comparative":string,"superlative":string,"note":string}}. ' +
    "Quy tắc: nếu từ KHÔNG đóng vai trò từ loại nào thì giá trị đó là null. " +
    "Với noun: 'article' là der/die/das, 'plural' là dạng số nhiều nominativ (vd 'Hunde'), " +
    "'genitive_singular' là dạng từ vựng (không kèm mạo từ) cho Genitiv số ít — " +
    "với maskulin/neutrum thường thêm -s hoặc -es (Hund → Hundes, Kind → Kindes), " +
    "với feminin giữ nguyên (Frau → Frau). " +
    "Với verb: chia ĐẦY ĐỦ 6 ngôi (ich/du/er/wir/ihr/sie) cho cả Präsens và Präteritum. " +
    "Chú ý các động từ thay đổi nguyên âm gốc ở số ít: geben → gebe/gibst/gibt, " +
    "nehmen → nehme/nimmst/nimmt, fahren → fahre/fährst/fährt. " +
    "'partizip2' là Partizip II (vd 'gelernt', 'gegangen'); 'perfekt_aux' là 'haben' hoặc 'sein'; " +
    "'type' = 'regular' (động từ yếu/regelmäßig) hoặc 'irregular' (động từ mạnh/unregelmäßig). " +
    "Với adjective: 'comparative' (Komparativ, vd 'größer'), 'superlative' dạng 'am ...-sten' (vd 'am größten'). " +
    "Tất cả 'note' viết bằng TIẾNG VIỆT, ngắn gọn, giải thích đặc điểm đáng nhớ " +
    "(vd: 'động từ tách', 'danh từ n-Deklination', 'tính từ ngắn thêm Umlaut khi so sánh', " +
    "'động từ chuyển động dùng sein').";

  const prompt = `Từ cần phân tích: "${word}"`;

  try {
    const raw = await generateText(prompt, system, model);
    const parsed = parseForms(cleanFences(raw), word);
    if (!parsed.noun && !parsed.verb && !parsed.adjective) {
      return NextResponse.json({
        ...parsed,
        note: "Không tìm thấy biến thể danh từ/động từ/tính từ cho từ này.",
      });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function cleanFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseForms(cleaned: string, fallbackWord: string): WordForms {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned non-JSON");
    obj = JSON.parse(m[0]);
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const article = (v: unknown): "der" | "die" | "das" =>
    v === "die" || v === "das" ? v : "der";
  const verbType = (v: unknown): "regular" | "irregular" =>
    v === "irregular" ? "irregular" : "regular";
  const aux = (v: unknown): "haben" | "sein" => (v === "sein" ? "sein" : "haben");

  function personForms(raw: unknown): VerbPersonForms | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const ich = str(r.ich);
    const du = str(r.du);
    const er = str(r.er);
    const wir = str(r.wir);
    const ihr = str(r.ihr);
    const sie = str(r.sie);
    if (!ich && !er) return null;
    return { ich, du, er, wir, ihr, sie };
  }

  const nounRaw = obj.noun as Record<string, unknown> | null | undefined;
  const verbRaw = obj.verb as Record<string, unknown> | null | undefined;
  const adjRaw = obj.adjective as Record<string, unknown> | null | undefined;

  const noun: NounForm | null =
    nounRaw && (str(nounRaw.plural) || str(nounRaw.article))
      ? {
          article: article(nounRaw.article),
          plural: str(nounRaw.plural),
          genitive_singular: str(nounRaw.genitive_singular),
          note: str(nounRaw.note),
        }
      : null;

  let verb: VerbForm | null = null;
  if (verbRaw) {
    const praesens = personForms(verbRaw.praesens);
    const praeteritum = personForms(verbRaw.praeteritum);
    if (praesens || str(verbRaw.partizip2)) {
      // Fallbacks so older models that only return er-forms still produce
      // something useful instead of nothing.
      verb = {
        praesens: praesens ?? { ich: "", du: "", er: "", wir: "", ihr: "", sie: "" },
        praeteritum:
          praeteritum ?? { ich: "", du: "", er: "", wir: "", ihr: "", sie: "" },
        partizip2: str(verbRaw.partizip2),
        perfekt_aux: aux(verbRaw.perfekt_aux),
        type: verbType(verbRaw.type),
        note: str(verbRaw.note),
      };
    }
  }

  const adjective: AdjForm | null =
    adjRaw && (str(adjRaw.comparative) || str(adjRaw.superlative))
      ? {
          comparative: str(adjRaw.comparative),
          superlative: str(adjRaw.superlative),
          note: str(adjRaw.note),
        }
      : null;

  return {
    word: str(obj.word) || fallbackWord,
    noun,
    verb,
    adjective,
  };
}
