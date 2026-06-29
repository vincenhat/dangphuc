import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/study/word-forms
 * Body: { word: string, model?: string }
 *
 * Phân tích một từ tiếng Anh và sinh các biến thể theo từ loại:
 *  - Danh từ (noun)      → số nhiều + (thường / bất quy tắc)
 *  - Động từ (verb)      → cột 2 (V2) & cột 3 (V3) + (thường / bất quy tắc)
 *  - Tính từ (adjective) → so sánh hơn & nhất + ghi chú lý do
 *
 * Một từ có thể thuộc nhiều từ loại (vd "run" vừa danh từ vừa động từ) →
 * trả về tất cả phần áp dụng; phần không áp dụng để null.
 */

interface NounForm {
  plural: string;
  type: "regular" | "irregular";
  note: string;
}
interface VerbForm {
  v2: string;
  v3: string;
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
  const body = (await req.json().catch(() => ({}))) as {
    word?: unknown;
    model?: unknown;
  };
  const word = typeof body.word === "string" ? body.word.trim() : "";
  const model = typeof body.model === "string" ? body.model : undefined;

  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });
  if (word.length > 40) {
    return NextResponse.json({ error: "word too long" }, { status: 400 });
  }

  const system =
    "Bạn là giáo viên tiếng Anh cho người Việt. Phân tích MỘT từ tiếng Anh và " +
    "xác định nó có thể là danh từ (noun), động từ (verb) và/hoặc tính từ (adjective) hay không. " +
    "Trả về DUY NHẤT một JSON object, không markdown, theo đúng schema: " +
    '{"word":string,' +
    '"noun":null hoặc {"plural":string,"type":"regular"|"irregular","note":string},' +
    '"verb":null hoặc {"v2":string,"v3":string,"type":"regular"|"irregular","note":string},' +
    '"adjective":null hoặc {"comparative":string,"superlative":string,"note":string}}. ' +
    "Quy tắc: nếu từ KHÔNG đóng vai trò từ loại nào thì để giá trị đó là null. " +
    "Nếu từ vừa là 2 hoặc cả 3 từ loại thì điền đủ các phần tương ứng. " +
    "Với noun: 'plural' là dạng số nhiều; 'type' là 'regular' nếu thêm -s/-es theo quy tắc, " +
    "'irregular' nếu bất quy tắc (vd child→children). " +
    "Với verb: 'v2' là quá khứ đơn, 'v3' là quá khứ phân từ; 'type' 'regular' nếu thêm -ed, " +
    "'irregular' nếu bất quy tắc (vd go→went→gone). " +
    "Với adjective: 'comparative' so sánh hơn, 'superlative' so sánh nhất. " +
    "Tất cả 'note' viết bằng TIẾNG VIỆT, ngắn gọn: với noun/verb ghi 'danh từ thường'/" +
    "'danh từ bất quy tắc' hoặc 'động từ thường'/'động từ bất quy tắc' kèm giải thích nếu cần; " +
    "với adjective giải thích LÝ DO chọn dạng so sánh (vd tính từ ngắn thêm -er/-est; tính từ " +
    "dài dùng more/most; bất quy tắc good→better→best; tính từ tận cùng phụ âm+y đổi y→i).";

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
  const type = (v: unknown): "regular" | "irregular" =>
    v === "irregular" ? "irregular" : "regular";

  const nounRaw = obj.noun as Record<string, unknown> | null | undefined;
  const verbRaw = obj.verb as Record<string, unknown> | null | undefined;
  const adjRaw = obj.adjective as Record<string, unknown> | null | undefined;

  const noun: NounForm | null =
    nounRaw && str(nounRaw.plural)
      ? { plural: str(nounRaw.plural), type: type(nounRaw.type), note: str(nounRaw.note) }
      : null;

  const verb: VerbForm | null =
    verbRaw && (str(verbRaw.v2) || str(verbRaw.v3))
      ? {
          v2: str(verbRaw.v2),
          v3: str(verbRaw.v3),
          type: type(verbRaw.type),
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
