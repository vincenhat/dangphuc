/**
 * Curriculum ngữ pháp tiếng Đức (Deutsch als Fremdsprache) cho người Việt.
 *
 * Mức A1–B1: artikel, các Kasus, động từ, modal, câu phụ, Perfekt/Präteritum.
 * Cấu trúc trùng với lib/study-grammar.ts để GrammarTab dùng chung component.
 *
 * Bắt đầu mức gọn (~12 chủ đề trong 5 nhóm) — đủ học A1 và bước vào A2/B1.
 * Có thể bổ sung dần (Adjektivdeklination, Konjunktiv II, Passiv, ...).
 */

export type GrammarLevel = "A1" | "A2" | "B1" | "B2";

export interface GrammarExample {
  en: string; // câu tiếng Đức (giữ tên field "en" để dùng chung GrammarTab UI)
  vi: string; // bản dịch tiếng Việt
}

export interface GrammarSection {
  heading: string;
  body?: string;
  formula?: string;
  bullets?: string[];
  examples?: GrammarExample[];
}

export interface GrammarMistake {
  wrong: string;
  right: string;
  note: string;
}

export interface GrammarTopic {
  id: string;
  title: string;
  short: string;
  level: GrammarLevel;
  summary: string;
  sections: GrammarSection[];
  mistakes?: GrammarMistake[];
}

export interface GrammarCategory {
  id: string;
  title: string;
  blurb: string;
  color: string;
  topics: GrammarTopic[];
}

/** Câu hỏi do AI sinh cho bộ bài tập (15 câu/bộ) — type khớp với study-grammar. */
export interface GeneratedQuestion {
  type: "mcq" | "fill";
  prompt: string;
  options?: string[];
  answer: string;
  explain: string;
}

export const GRAMMAR_CATEGORIES: GrammarCategory[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Artikel & Substantive
  // ─────────────────────────────────────────────────────────────
  {
    id: "artikel-substantive",
    title: "Artikel & Substantive · Mạo từ và Danh từ",
    blurb: "Giống der/die/das, mạo từ xác định/không xác định, số nhiều, danh từ viết hoa.",
    color: "#ec4899",
    topics: [
      {
        id: "bestimmter-artikel",
        title: "Mạo từ xác định · Bestimmter Artikel (der/die/das)",
        short: "der/die/das",
        level: "A1",
        summary:
          "Mỗi danh từ tiếng Đức có một giống cố định: der (giống đực), die (giống cái), das (giống trung).",
        sections: [
          {
            heading: "Quy tắc cốt lõi",
            body:
              "Khác tiếng Anh, mỗi danh từ tiếng Đức mang một giống ngữ pháp (Genus). " +
              "Học từ vựng PHẢI học kèm mạo từ. Số nhiều của mọi giống đều dùng 'die'.",
            bullets: [
              "der — giống đực (maskulin): der Mann, der Tisch, der Tag",
              "die — giống cái (feminin): die Frau, die Lampe, die Nacht",
              "das — giống trung (neutrum): das Kind, das Buch, das Haus",
              "die — số nhiều cho mọi giống: die Männer, die Frauen, die Kinder",
            ],
          },
          {
            heading: "Mẹo đoán giống (không tuyệt đối)",
            bullets: [
              "Hậu tố -ung, -heit, -keit, -schaft, -ion, -ei → die (feminin)",
              "Hậu tố -chen, -lein, -um → das (neutrum)",
              "Hậu tố -er chỉ người làm nghề → der (der Lehrer, der Fahrer)",
              "Ngày, tháng, mùa → der (der Montag, der Mai, der Sommer)",
            ],
            examples: [
              { en: "der Sommer ist heiß.", vi: "Mùa hè thì nóng." },
              { en: "die Zeitung kostet zwei Euro.", vi: "Tờ báo giá hai euro." },
              { en: "das Mädchen liest ein Buch.", vi: "Cô bé đang đọc sách." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Die Buch ist neu.",
            right: "Das Buch ist neu.",
            note: "Buch (sách) là Neutrum: das Buch.",
          },
          {
            wrong: "Ich kaufe der Brot.",
            right: "Ich kaufe das Brot.",
            note: "Brot là Neutrum, dùng 'das'. Và sau 'kaufen' là Akkusativ, das không đổi.",
          },
        ],
      },
      {
        id: "unbestimmter-artikel",
        title: "Mạo từ không xác định · Unbestimmter Artikel (ein/eine)",
        short: "ein/eine",
        level: "A1",
        summary: "ein/eine dùng cho danh từ chưa xác định, lần nhắc đầu tiên. Số nhiều bỏ mạo từ.",
        sections: [
          {
            heading: "Dạng Nominativ",
            formula: "ein (der/das)   ·   eine (die)   ·   — (Plural)",
            bullets: [
              "ein Mann, ein Buch (đực, trung)",
              "eine Frau (cái)",
              "Männer, Bücher, Frauen — số nhiều không có mạo từ không xác định",
            ],
            examples: [
              { en: "Ich habe einen Bruder.", vi: "Tôi có một anh/em trai. (Akkusativ: einen)" },
              { en: "Sie ist eine Lehrerin.", vi: "Cô ấy là giáo viên." },
              { en: "Das ist ein Buch.", vi: "Đây là một quyển sách." },
            ],
          },
          {
            heading: "Phủ định: kein/keine",
            body:
              "Để phủ định 'ein/eine' hoặc danh từ số nhiều không có mạo từ, dùng 'kein/keine' " +
              "(chia y như ein/eine + dạng số nhiều 'keine').",
            examples: [
              { en: "Ich habe kein Auto.", vi: "Tôi không có ô tô." },
              { en: "Sie hat keine Zeit.", vi: "Cô ấy không có thời gian." },
              { en: "Wir haben keine Kinder.", vi: "Chúng tôi không có con." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich habe nicht ein Auto.",
            right: "Ich habe kein Auto.",
            note: "Phủ định danh từ đi với 'ein/eine' phải dùng 'kein', không phải 'nicht ein'.",
          },
        ],
      },
      {
        id: "plural",
        title: "Số nhiều · Plural",
        short: "Plural",
        level: "A1",
        summary:
          "Tiếng Đức có 5 dạng số nhiều chính. Không có quy tắc duy nhất — phải học cùng từ.",
        sections: [
          {
            heading: "5 dạng phổ biến",
            bullets: [
              "-e (có/không Umlaut): der Tag → die Tage, der Stuhl → die Stühle",
              "-er (thường có Umlaut): das Kind → die Kinder, das Buch → die Bücher",
              "-en/-n: die Frau → die Frauen, die Lampe → die Lampen",
              "-s (chủ yếu từ mượn): das Auto → die Autos, das Foto → die Fotos",
              "Không đổi (đôi khi thêm Umlaut): der Lehrer → die Lehrer, der Vater → die Väter",
            ],
            examples: [
              { en: "Die Bücher sind interessant.", vi: "Các quyển sách thật thú vị." },
              { en: "Zwei Männer warten draußen.", vi: "Hai người đàn ông đang đợi bên ngoài." },
            ],
          },
          {
            heading: "Lưu ý",
            body:
              "Số nhiều dùng 'die' cho tất cả Genus ở Nominativ/Akkusativ. " +
              "Ở Dativ thêm '-n' vào danh từ (trừ những từ đã kết thúc bằng -n/-s): " +
              "den Kindern, den Männern (nhưng den Autos không đổi).",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 2. Personal- & Possessivpronomen
  // ─────────────────────────────────────────────────────────────
  {
    id: "pronomen",
    title: "Personal- & Possessivpronomen · Đại từ",
    blurb: "Đại từ nhân xưng (ich, du, er...) và đại từ sở hữu (mein, dein...).",
    color: "#0ea5e9",
    topics: [
      {
        id: "personalpronomen",
        title: "Đại từ nhân xưng · Personalpronomen",
        short: "ich/du/er…",
        level: "A1",
        summary: "Biến thể theo Kasus (Nominativ / Akkusativ / Dativ). Học bảng là phải thuộc.",
        sections: [
          {
            heading: "Bảng đầy đủ",
            body:
              "Lưu ý phân biệt 'du' (thân mật, số ít) và 'Sie' (kính trọng/lịch sự, viết hoa). " +
              "'sie' (cô ấy) khác 'sie' (họ) — phân biệt qua động từ chia.",
            formula:
              "Nom: ich · du · er/sie/es · wir · ihr · sie/Sie\n" +
              "Akk: mich · dich · ihn/sie/es · uns · euch · sie/Sie\n" +
              "Dat: mir · dir · ihm/ihr/ihm · uns · euch · ihnen/Ihnen",
            examples: [
              { en: "Ich liebe dich.", vi: "Tôi yêu bạn. (Akk)" },
              { en: "Er hilft mir.", vi: "Anh ấy giúp tôi. (helfen + Dativ)" },
              { en: "Sie geben uns ein Geschenk.", vi: "Họ tặng chúng tôi một món quà." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Er hilft mich.",
            right: "Er hilft mir.",
            note: "Động từ 'helfen' đi với Dativ → 'mir', không 'mich'.",
          },
        ],
      },
      {
        id: "possessivpronomen",
        title: "Đại từ sở hữu · Possessivartikel (mein, dein…)",
        short: "mein/dein…",
        level: "A1",
        summary: "Chia như 'ein/kein' và biến đổi theo giống, số, Kasus.",
        sections: [
          {
            heading: "Gốc theo người sở hữu",
            formula:
              "ich → mein · du → dein · er/es → sein · sie → ihr · wir → unser · ihr → euer · sie/Sie → ihr/Ihr",
            bullets: [
              "Trùng giống/số của VẬT sở hữu, không phải của NGƯỜI sở hữu.",
              "mein Hund / meine Katze / mein Buch / meine Bücher (Nom)",
              "Akk đực thêm -en: meinen Hund. Cái/trung/số nhiều: như Nom.",
              "Dat: meinem Hund (m/n), meiner Katze (f), meinen Hunden (Pl + -n)",
            ],
            examples: [
              { en: "Mein Vater ist Lehrer.", vi: "Bố tôi là giáo viên." },
              { en: "Ich treffe meinen Freund.", vi: "Tôi gặp bạn tôi. (Akk đực + -en)" },
              { en: "Sie spielt mit ihrem Bruder.", vi: "Cô ấy chơi với anh trai cô ấy. (Dat đực + -em)" },
            ],
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 3. Verben & Konjugation
  // ─────────────────────────────────────────────────────────────
  {
    id: "verben",
    title: "Verben · Động từ",
    blurb: "Chia động từ ở Präsens, sein/haben, modal, động từ tách, Perfekt.",
    color: "#f59e0b",
    topics: [
      {
        id: "praesens-regelmaessig",
        title: "Präsens · Hiện tại (động từ thường)",
        short: "Präsens",
        level: "A1",
        summary: "Đuôi chia theo chủ ngữ: -e, -st, -t, -en, -t, -en.",
        sections: [
          {
            heading: "Mẫu chia",
            formula:
              "lernen: ich lerne · du lernst · er/sie/es lernt · wir lernen · ihr lernt · sie/Sie lernen",
            bullets: [
              "Bỏ -en của infinitiv để lấy gốc (lernen → lern).",
              "Gốc tận cùng -t/-d/-tm: thêm -e- trước -st/-t (du arbeitest, er findet).",
              "Gốc tận cùng -s/-ß/-z: du chỉ thêm -t (du heißt, không 'heißst').",
            ],
            examples: [
              { en: "Ich lerne Deutsch jeden Tag.", vi: "Tôi học tiếng Đức mỗi ngày." },
              { en: "Was machst du am Wochenende?", vi: "Cuối tuần bạn làm gì?" },
              { en: "Sie arbeitet als Ärztin.", vi: "Cô ấy làm bác sĩ." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Du heißst Anna.",
            right: "Du heißt Anna.",
            note: "Gốc tận cùng -ß: ngôi 'du' chỉ thêm -t.",
          },
        ],
      },
      {
        id: "sein-haben",
        title: "sein & haben · Hai động từ quan trọng nhất",
        short: "sein/haben",
        level: "A1",
        summary: "Đây là 2 động từ bất quy tắc cốt lõi — dùng làm trợ động từ trong Perfekt.",
        sections: [
          {
            heading: "Chia Präsens",
            formula:
              "sein: ich bin · du bist · er ist · wir sind · ihr seid · sie sind\n" +
              "haben: ich habe · du hast · er hat · wir haben · ihr habt · sie haben",
            examples: [
              { en: "Ich bin müde.", vi: "Tôi mệt." },
              { en: "Wir haben Hunger.", vi: "Chúng tôi đói." },
              { en: "Bist du Student?", vi: "Bạn là sinh viên à?" },
            ],
          },
        ],
      },
      {
        id: "modalverben",
        title: "Động từ khuyết thiếu · Modalverben",
        short: "können/müssen…",
        level: "A2",
        summary: "können, müssen, dürfen, sollen, wollen, mögen/möchten — bất quy tắc ở số ít.",
        sections: [
          {
            heading: "Quy tắc dùng",
            formula:
              "S + Modalverb (chia) + … + Infinitiv (đặt cuối câu)",
            bullets: [
              "Số ít không có Umlaut: ich kann, du kannst, er kann (không 'kanne').",
              "Mö/wollen/sollen: ich will, du willst, er will / ich soll, du sollst, er soll.",
              "möchten = phép lịch sự của mögen: ich möchte, du möchtest, er möchte.",
            ],
            examples: [
              { en: "Ich kann gut Deutsch sprechen.", vi: "Tôi có thể nói tiếng Đức giỏi." },
              { en: "Du musst zum Arzt gehen.", vi: "Bạn phải đi khám bác sĩ." },
              { en: "Ich möchte einen Kaffee, bitte.", vi: "Tôi muốn một ly cà phê." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich kann sprechen Deutsch gut.",
            right: "Ich kann gut Deutsch sprechen.",
            note: "Infinitiv (sprechen) đặt CUỐI câu khi có modal.",
          },
        ],
      },
      {
        id: "trennbare-verben",
        title: "Động từ tách · Trennbare Verben",
        short: "trennbar",
        level: "A2",
        summary: "Tiền tố tách rời khi chia (auf-, ein-, ab-, mit-, zu-…) và nhảy về cuối câu.",
        sections: [
          {
            heading: "Cách dùng",
            formula:
              "Hauptsatz: Verb gốc đứng vị trí 2, tiền tố CUỐI câu.\n" +
              "Nebensatz / Infinitiv: tiền tố dính lại (aufstehen).",
            bullets: [
              "aufstehen → Ich stehe um 7 Uhr auf. (tách)",
              "einkaufen → Wir kaufen heute ein. (tách)",
              "Trong câu phụ 'weil', không tách: …, weil ich um 7 aufstehe.",
            ],
            examples: [
              { en: "Der Zug fährt um 8 Uhr ab.", vi: "Chuyến tàu khởi hành lúc 8 giờ." },
              { en: "Sie ruft mich morgen an.", vi: "Cô ấy sẽ gọi tôi vào ngày mai." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich aufstehe um 7 Uhr.",
            right: "Ich stehe um 7 Uhr auf.",
            note: "Trong câu chính, động từ tách phải chia + tiền tố nhảy cuối câu.",
          },
        ],
      },
      {
        id: "perfekt",
        title: "Hoàn thành · Perfekt",
        short: "Perfekt",
        level: "A2",
        summary:
          "Thì kể chuyện chính ở văn nói: 'haben/sein + Partizip II'. Partizip II ở cuối câu.",
        sections: [
          {
            heading: "Công thức",
            formula: "S + haben/sein (chia Präsens) + … + Partizip II",
            bullets: [
              "Phần lớn động từ dùng 'haben': Ich habe gegessen.",
              "Động từ chuyển động/thay đổi trạng thái dùng 'sein': gehen, fahren, fliegen, kommen, werden, sterben, sein, bleiben.",
              "Partizip II động từ thường: ge- + gốc + -t (gemacht, gespielt).",
              "Partizip II bất quy tắc: ge- + gốc đổi nguyên âm + -en (gegangen, gesprochen, gefahren).",
              "Động từ tận cùng -ieren: KHÔNG có 'ge-' (studieren → studiert).",
              "Động từ tách: ge- chèn vào giữa (aufstehen → aufgestanden, einkaufen → eingekauft).",
            ],
            examples: [
              { en: "Ich habe gestern einen Film gesehen.", vi: "Hôm qua tôi đã xem một bộ phim." },
              { en: "Sie ist nach Berlin gefahren.", vi: "Cô ấy đã đi (đến) Berlin. (gehen → sein)" },
              { en: "Wir haben Deutsch studiert.", vi: "Chúng tôi đã học tiếng Đức. (không 'gestudiert')" },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich habe nach Hause gegangen.",
            right: "Ich bin nach Hause gegangen.",
            note: "Động từ chuyển động 'gehen' → trợ động từ 'sein', không 'haben'.",
          },
          {
            wrong: "Ich habe Deutsch gestudiert.",
            right: "Ich habe Deutsch studiert.",
            note: "Động từ tận cùng -ieren KHÔNG thêm 'ge-' ở Partizip II.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 4. Kasus & Präpositionen
  // ─────────────────────────────────────────────────────────────
  {
    id: "kasus",
    title: "Kasus & Präpositionen · Các cách",
    blurb: "Nominativ / Akkusativ / Dativ — và giới từ đi với mỗi cách.",
    color: "#10b981",
    topics: [
      {
        id: "nominativ-akkusativ",
        title: "Nominativ vs Akkusativ · Cách 1 & Cách 4",
        short: "Nom/Akk",
        level: "A1",
        summary:
          "Nominativ = chủ ngữ (làm gì). Akkusativ = tân ngữ trực tiếp (bị tác động). " +
          "Chỉ mạo từ đực thay đổi từ Nom → Akk: der → den, ein → einen.",
        sections: [
          {
            heading: "Bảng so sánh",
            formula:
              "Nom: der · die · das · die\n" +
              "Akk: den · die · das · die  ← chỉ giống đực đổi",
            bullets: [
              "Tương tự: ein → einen, kein → keinen, mein → meinen (chỉ đực).",
              "Sau động từ thường (sehen, kaufen, haben, lieben, brauchen): tân ngữ Akkusativ.",
              "Sau 'es gibt' (có): luôn Akkusativ. Es gibt einen Baum.",
            ],
            examples: [
              { en: "Ich sehe den Mann.", vi: "Tôi nhìn thấy người đàn ông đó. (der → den)" },
              { en: "Sie hat eine Schwester.", vi: "Cô ấy có một chị/em gái." },
              { en: "Wir kaufen ein Auto.", vi: "Chúng tôi mua một ô tô. (das → das, không đổi)" },
            ],
          },
          {
            heading: "Giới từ luôn đi với Akkusativ",
            body: "durch · für · gegen · ohne · um · bis · entlang. Học thuộc câu vần: 'DOGFU' / 'für, ohne, durch, gegen, um'.",
            examples: [
              { en: "Das Geschenk ist für meinen Bruder.", vi: "Món quà là cho anh trai tôi." },
              { en: "Ich gehe ohne dich.", vi: "Tôi đi mà không có bạn." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich sehe der Mann.",
            right: "Ich sehe den Mann.",
            note: "Tân ngữ trực tiếp → Akkusativ. der → den.",
          },
        ],
      },
      {
        id: "dativ",
        title: "Dativ · Cách 3",
        short: "Dativ",
        level: "A2",
        summary:
          "Dativ = tân ngữ gián tiếp (cho ai). Mạo từ: dem (m/n), der (f), den + -n (Pl).",
        sections: [
          {
            heading: "Bảng Dativ",
            formula:
              "dem Mann · dem Kind · der Frau · den Kindern\n" +
              "einem Mann · einem Kind · einer Frau · — (kein Plural Indef.)",
            bullets: [
              "Sau geben, schenken, helfen, danken, antworten, gehören, gefallen.",
              "Sau giới từ Dativ: aus, bei, mit, nach, seit, von, zu, gegenüber.",
              "Số nhiều thêm -n vào danh từ (trừ khi đã có sẵn -n/-s): mit den Kindern.",
            ],
            examples: [
              { en: "Ich gebe dem Kind ein Eis.", vi: "Tôi cho đứa bé một que kem. (dem = Dativ)" },
              { en: "Wir fahren mit dem Bus.", vi: "Chúng tôi đi bằng xe buýt. (mit + Dativ)" },
              { en: "Sie hilft ihrer Mutter.", vi: "Cô ấy giúp mẹ cô ấy. (helfen + Dativ)" },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich gehe zu der Schule.",
            right: "Ich gehe zur Schule.",
            note: "'zu + der' co thành 'zur' (luôn nhập). Tương tự zu + dem = zum.",
          },
        ],
      },
      {
        id: "wechselpraepositionen",
        title: "Giới từ hai cách · Wechselpräpositionen",
        short: "Wechselpräp.",
        level: "A2",
        summary:
          "9 giới từ chỉ vị trí có thể đi với Akk (chuyển động → đâu?) hoặc Dat (vị trí → ở đâu?).",
        sections: [
          {
            heading: "9 giới từ",
            body:
              "an, auf, hinter, in, neben, über, unter, vor, zwischen. " +
              "Quy tắc đơn giản: 'Wohin?' (đi đâu?) → Akkusativ. 'Wo?' (ở đâu?) → Dativ.",
            examples: [
              {
                en: "Ich gehe in die Küche.",
                vi: "Tôi đi vào bếp. (đi đâu → Akk, die không đổi)",
              },
              {
                en: "Ich bin in der Küche.",
                vi: "Tôi ở trong bếp. (ở đâu → Dat, die → der)",
              },
              {
                en: "Er hängt das Bild an die Wand.",
                vi: "Anh ấy treo bức tranh LÊN tường. (Akk)",
              },
              {
                en: "Das Bild hängt an der Wand.",
                vi: "Bức tranh đang Ở trên tường. (Dat)",
              },
            ],
          },
          {
            heading: "Mẹo phân biệt",
            bullets: [
              "Đi cùng động từ chuyển động (gehen, fahren, legen, stellen, hängen+người chủ động) → Akk.",
              "Đi cùng động từ trạng thái (sein, bleiben, liegen, stehen, hängen+đồ vật) → Dat.",
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich bin in die Küche.",
            right: "Ich bin in der Küche.",
            note: "'sein' chỉ vị trí (ở đâu) → Dativ.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 5. Satzbau & Nebensätze
  // ─────────────────────────────────────────────────────────────
  {
    id: "satzbau",
    title: "Satzbau & Nebensätze · Cấu trúc câu",
    blurb: "Vị trí động từ trong câu chính/câu phụ, câu nghi vấn, câu phụ với weil/dass/wenn.",
    color: "#8b5cf6",
    topics: [
      {
        id: "v2-position",
        title: "Vị trí 2 của động từ · V2-Stellung",
        short: "V2-Stellung",
        level: "A1",
        summary:
          "Trong câu khẳng định, động từ chia luôn ở vị trí thứ 2 — kể cả khi câu bắt đầu bằng trạng từ.",
        sections: [
          {
            heading: "Quy tắc V2",
            bullets: [
              "Vị trí 1 có thể là: chủ ngữ / trạng từ / tân ngữ / mệnh đề phụ.",
              "Động từ chia LUÔN ở vị trí 2.",
              "Chủ ngữ nhảy ra sau động từ nếu vị trí 1 đã có gì khác (đảo ngữ).",
            ],
            examples: [
              { en: "Ich gehe heute ins Kino.", vi: "Hôm nay tôi đi xem phim. (Chủ ngữ ở vị trí 1)" },
              {
                en: "Heute gehe ich ins Kino.",
                vi: "Hôm nay tôi đi xem phim. (Trạng từ ở vị trí 1, chủ ngữ nhảy sau động từ)",
              },
              {
                en: "Morgen kommt er nach Hause.",
                vi: "Ngày mai anh ấy về nhà.",
              },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Heute ich gehe ins Kino.",
            right: "Heute gehe ich ins Kino.",
            note: "Khi trạng từ ở vị trí 1, động từ vẫn phải ở vị trí 2 → 'gehe' trước 'ich'.",
          },
        ],
      },
      {
        id: "fragen",
        title: "Câu hỏi · Fragen (W- & Ja/Nein)",
        short: "Fragen",
        level: "A1",
        summary: "W-Fragen: từ hỏi + động từ + chủ ngữ. Ja/Nein-Fragen: động từ + chủ ngữ.",
        sections: [
          {
            heading: "W-Fragen (câu hỏi mở)",
            formula: "W-Wort + Verb + S + …",
            bullets: [
              "wer (ai), was (cái gì), wo (ở đâu), wohin (đi đâu), woher (từ đâu), wann (khi nào), warum (tại sao), wie (thế nào), wie viel/wie viele (bao nhiêu)",
            ],
            examples: [
              { en: "Wo wohnst du?", vi: "Bạn sống ở đâu?" },
              { en: "Warum lernst du Deutsch?", vi: "Tại sao bạn học tiếng Đức?" },
            ],
          },
          {
            heading: "Ja/Nein-Fragen",
            formula: "Verb + S + … ?",
            examples: [
              { en: "Sprichst du Deutsch?", vi: "Bạn có nói tiếng Đức không?" },
              { en: "Hast du Zeit?", vi: "Bạn có thời gian không?" },
            ],
          },
        ],
      },
      {
        id: "nebensatz",
        title: "Câu phụ · Nebensatz (weil, dass, wenn)",
        short: "Nebensatz",
        level: "B1",
        summary:
          "Trong Nebensatz, động từ chia nhảy về CUỐI câu. Liên từ phụ thuộc: weil, dass, wenn, ob, obwohl, damit, als.",
        sections: [
          {
            heading: "Cấu trúc",
            formula:
              "Hauptsatz, Konjunktion + S + … + Verb(cuối).\n" +
              "Hoặc: Konjunktion + S + … + Verb(cuối), Verb(chia) + S + ….",
            bullets: [
              "weil = bởi vì (lý do)",
              "dass = rằng (sau verba dicendi: sagen, denken, glauben…)",
              "wenn = nếu / khi nào (đk hoặc thời gian lặp lại)",
              "ob = liệu có (câu hỏi gián tiếp Ja/Nein)",
              "obwohl = mặc dù",
            ],
            examples: [
              {
                en: "Ich lerne Deutsch, weil ich in Berlin arbeiten will.",
                vi: "Tôi học tiếng Đức vì tôi muốn làm việc ở Berlin. (Modal: will ở cuối)",
              },
              {
                en: "Ich weiß, dass er heute kommt.",
                vi: "Tôi biết rằng hôm nay anh ấy đến.",
              },
              {
                en: "Wenn ich Zeit habe, gehe ich joggen.",
                vi: "Khi nào tôi có thời gian, tôi đi chạy bộ.",
              },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "Ich lerne Deutsch, weil ich will in Berlin arbeiten.",
            right: "Ich lerne Deutsch, weil ich in Berlin arbeiten will.",
            note: "Trong câu phụ, động từ chia (will) đứng CUỐI; infinitiv (arbeiten) trước nó.",
          },
        ],
      },
    ],
  },
];
