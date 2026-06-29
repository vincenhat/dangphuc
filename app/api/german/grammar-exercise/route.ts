import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/study/grammar-exercise
 * Body: { title, level, setNumber, model? }
 * Trả về: { questions: GenQuestion[] } — 15 câu hỏi ngữ pháp cho một chủ đề.
 *
 * Mỗi câu là trắc nghiệm (mcq) hoặc điền từ (fill). Câu hỏi tiếng Anh, giải
 * thích tiếng Việt. Dùng model người dùng đã chọn (dodge rate limit).
 */

interface GenQuestion {
  type: "mcq" | "fill";
  prompt: string;
  options?: string[];
  answer: string;
  explain: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    level?: unknown;
    setNumber?: unknown;
    model?: unknown;
  };
  const title = typeof body.title === "string" ? body.title.slice(0, 120) : "";
  const level = typeof body.level === "string" ? body.level.slice(0, 8) : "A2";
  const setNumber =
    typeof body.setNumber === "number" && body.setNumber > 0 ? body.setNumber : 1;
  const model = typeof body.model === "string" ? body.model : undefined;

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const system =
    "Bạn là giáo viên tiếng Đức, tạo bài tập ngữ pháp cho học viên người Việt. " +
    "Trả về DUY NHẤT một mảng JSON gồm ĐÚNG 15 phần tử, không kèm markdown hay lời dẫn. " +
    "Mỗi phần tử có dạng: " +
    '{"type":"mcq"|"fill","prompt":string,"options":string[],"answer":string,"explain":string}. ' +
    "Quy tắc: trộn cả hai loại (khoảng một nửa 'mcq' có 3-4 lựa chọn, một nửa 'fill' điền từ). " +
    "Với 'mcq', 'answer' PHẢI trùng khít một phần tử trong 'options'. " +
    "Với 'fill', bỏ 'options', dùng '___' trong 'prompt' cho chỗ trống và 'answer' là từ/cụm cần điền (ngắn gọn). " +
    "Câu hỏi (prompt/options) viết bằng TIẾNG ĐỨC. 'explain' viết bằng TIẾNG VIỆT, ngắn gọn, có thể chèn thuật ngữ tiếng Đức trong ngoặc. " +
    "Chú ý đặc thù tiếng Đức: giới từ + cách (Akkusativ/Dativ/Genitiv), Adjektivdeklination, vị trí động từ trong Hauptsatz/Nebensatz, động từ tách (trennbare Verben). " +
    "Không lặp lại câu, độ khó phù hợp trình độ đã cho.";

  const prompt =
    `Chủ đề ngữ pháp tiếng Đức: "${title}" (trình độ ${level}). ` +
    `Đây là bộ bài tập số ${setNumber} — hãy ra đề KHÁC với các bộ khác cùng chủ đề. ` +
    "Tạo 15 câu hỏi kiểm tra mức độ hiểu và vận dụng chủ đề này.";

  try {
    const raw = await generateText(prompt, system, model);
    const questions = parseQuestions(raw);
    if (questions.length === 0) {
      throw new Error("AI returned no valid questions");
    }
    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    const status = /rate limit/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseQuestions(raw: string): GenQuestion[] {
  const cleaned = stripFences(raw);
  let arr: unknown;
  try {
    arr = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) return [];
    try {
      arr = JSON.parse(m[0]);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  const out: GenQuestion[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const type = o.type === "fill" ? "fill" : "mcq";
    const prompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
    const answer = typeof o.answer === "string" ? o.answer.trim() : "";
    const explain = typeof o.explain === "string" ? o.explain.trim() : "";
    if (!prompt || !answer) continue;

    if (type === "mcq") {
      const options = Array.isArray(o.options)
        ? o.options.filter((x): x is string => typeof x === "string").map((x) => x.trim())
        : [];
      if (options.length < 2) continue;
      // Đảm bảo đáp án nằm trong options (so khớp không phân biệt hoa thường).
      const has = options.some((op) => op.toLowerCase() === answer.toLowerCase());
      if (!has) options.push(answer);
      out.push({ type: "mcq", prompt, options, answer, explain });
    } else {
      out.push({ type: "fill", prompt, answer, explain });
    }
    if (out.length >= 15) break;
  }
  return out;
}
