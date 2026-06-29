import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/german/word-forms
 * Body: { word: string, model?: string }
 *
 * Phân tích một từ tiếng Đức và sinh các biến thể theo từ loại:
 *   - Danh từ (Substantiv) → giống (der/die/das), số nhiều, Genitiv Singular
 *   - Động từ (Verb)       → Präsens (ich/du/er), Präteritum, Partizip II + (haben/sein)
 *   - Tính từ (Adjektiv)   → so sánh hơn (Komparativ) & nhất (Superlativ)
 *
 * Một từ có thể thuộc nhiều từ loại; trả null cho phần không áp dụng.
 */

interface NounForm {
  article: "der" | "die" | "das";
  plural: string;
  genitive_singular: string;
  note: string;
}
interface VerbForm {
  ich: string;
  du: string;
  er: string;
  praeteritum: string;
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
    '"verb":null hoặc {"ich":string,"du":string,"er":string,"praeteritum":string,"partizip2":string,"perfekt_aux":"haben"|"sein","type":"regular"|"irregular","note":string},' +
    '"adjective":null hoặc {"comparative":string,"superlative":string,"note":string}}. ' +
    "Quy tắc: nếu từ KHÔNG đóng vai trò từ loại nào thì giá trị đó là null. " +
    "Với noun: 'article' là der/die/das, 'plural' là dạng số nhiều nominativ (vd 'Hunde'), " +
    "'genitive_singular' là dạng Genitiv số ít (vd 'des Hundes' viết gọn 'Hundes'). " +
    "Với verb: 'ich/du/er' là chia Präsens (vd lernen → 'lerne'/'lernst'/'lernt'); " +
    "'praeteritum' là dạng Präteritum ngôi 'er' (vd 'lernte', 'ging'); " +
    "'partizip2' là Partizip II (vd 'gelernt', 'gegangen'); " +
    "'perfekt_aux' là trợ động từ Perfekt: 'haben' hoặc 'sein'; " +
    "'type' = 'regular' (động từ yếu/regelmäßig) hoặc 'irregular' (động từ mạnh/unregelmäßig). " +
    "Với adjective: 'comparative' (Komparativ), 'superlative' dạng 'am ...-sten'. " +
    "'note' viết bằng TIẾNG VIỆT, ngắn gọn, giải thích đặc điểm (vd Genus thường gặp, biến thể bất quy tắc, đặc điểm Umlaut, dạng so sánh bất quy tắc gut/besser/am besten).";

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
  const article = (v: unknown): "der" | "die" | "das" => {
    if (v === "die" || v === "das") return v;
    return "der";
  };
  const verbType = (v: unknown): "regular" | "irregular" =>
    v === "irregular" ? "irregular" : "regular";
  const aux = (v: unknown): "haben" | "sein" => (v === "sein" ? "sein" : "haben");

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

  const verb: VerbForm | null =
    verbRaw && (str(verbRaw.partizip2) || str(verbRaw.ich))
      ? {
          ich: str(verbRaw.ich),
          du: str(verbRaw.du),
          er: str(verbRaw.er),
          praeteritum: str(verbRaw.praeteritum),
          partizip2: str(verbRaw.partizip2),
          perfekt_aux: aux(verbRaw.perfekt_aux),
          type: verbType(verbRaw.type),
          note: str(verbRaw.note),
        }
      : null;

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
