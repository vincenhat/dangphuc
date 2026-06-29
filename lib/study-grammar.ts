/**
 * English grammar curriculum for Vietnamese learners.
 *
 * Nội dung chính bằng tiếng Việt; thuật ngữ tiếng Anh đi kèm cho những khái
 * niệm quan trọng. Cấu trúc: Category → Topic → Section, kèm ví dụ song ngữ và
 * các lỗi thường gặp. Tham khảo hệ thống ngữ pháp ESL phổ biến (CEFR A1–B2:
 * thì, mạo từ, so sánh, giới từ, câu điều kiện, bị động, modal, tường thuật,
 * mệnh đề quan hệ).
 */

export type GrammarLevel = "A1" | "A2" | "B1" | "B2";

export interface GrammarExample {
  en: string; // câu tiếng Anh
  vi: string; // bản dịch tiếng Việt
}

export interface GrammarSection {
  heading: string; // tiêu đề mục (tiếng Việt)
  body?: string; // giải thích (tiếng Việt)
  formula?: string; // công thức cấu trúc, vd "S + have/has + V3"
  bullets?: string[]; // ý chính
  examples?: GrammarExample[];
}

export interface GrammarMistake {
  wrong: string; // câu sai
  right: string; // câu đúng
  note: string; // giải thích (tiếng Việt)
}

export interface GrammarTopic {
  id: string;
  title: string; // tiêu đề (Việt + thuật ngữ Anh)
  short: string; // nhãn ngắn cho thanh điều hướng
  level: GrammarLevel;
  summary: string; // mô tả một dòng (tiếng Việt)
  sections: GrammarSection[];
  mistakes?: GrammarMistake[];
}

export interface GrammarCategory {
  id: string;
  title: string; // tên nhóm (tiếng Việt + thuật ngữ Anh)
  blurb: string; // mô tả ngắn
  color: string;
  topics: GrammarTopic[];
}

export const GRAMMAR_CATEGORIES: GrammarCategory[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. THÌ ĐỘNG TỪ — VERB TENSES
  // ─────────────────────────────────────────────────────────────
  {
    id: "tenses",
    title: "Thì động từ · Verb Tenses",
    blurb: "Cách diễn đạt thời gian của hành động: hiện tại, quá khứ, tương lai.",
    color: "#ec4899",
    topics: [
      {
        id: "present-simple",
        title: "Hiện tại đơn · Present Simple",
        short: "Hiện tại đơn",
        level: "A1",
        summary: "Diễn tả thói quen, sự thật hiển nhiên, lịch trình cố định.",
        sections: [
          {
            heading: "Khi nào dùng",
            bullets: [
              "Thói quen, việc lặp lại: I go to school every day.",
              "Sự thật hiển nhiên (general truth): The sun rises in the east.",
              "Lịch trình, thời gian biểu: The train leaves at 7 a.m.",
            ],
          },
          {
            heading: "Cấu trúc",
            formula: "(+) S + V(s/es)   ·   (−) S + do/does + not + V   ·   (?) Do/Does + S + V?",
            body:
              "Ngôi thứ ba số ít (he / she / it) thì động từ thêm -s/-es. " +
              "Câu phủ định và nghi vấn mượn trợ động từ (auxiliary) do/does.",
            examples: [
              { en: "She works in a hospital.", vi: "Cô ấy làm việc ở bệnh viện." },
              { en: "They don't live here.", vi: "Họ không sống ở đây." },
              { en: "Does he speak English?", vi: "Anh ấy có nói tiếng Anh không?" },
            ],
          },
          {
            heading: "Dấu hiệu nhận biết",
            body:
              "Trạng từ tần suất (adverbs of frequency): always, usually, often, " +
              "sometimes, rarely, never; và: every day/week, on Mondays.",
          },
        ],
        mistakes: [
          {
            wrong: "He go to work by bus.",
            right: "He goes to work by bus.",
            note: "Ngôi thứ ba số ít phải thêm -es: go → goes.",
          },
          {
            wrong: "She doesn't likes coffee.",
            right: "She doesn't like coffee.",
            note: "Sau does/doesn't, động từ trở về nguyên thể (bare infinitive).",
          },
        ],
      },
      {
        id: "present-continuous",
        title: "Hiện tại tiếp diễn · Present Continuous",
        short: "HT tiếp diễn",
        level: "A1",
        summary: "Hành động đang xảy ra ngay lúc nói hoặc quanh thời điểm hiện tại.",
        sections: [
          {
            heading: "Khi nào dùng",
            bullets: [
              "Hành động đang diễn ra ngay bây giờ: I am reading now.",
              "Giai đoạn tạm thời quanh hiện tại: She is studying for exams this week.",
              "Kế hoạch đã sắp xếp trong tương lai gần: We are meeting John tomorrow.",
            ],
          },
          {
            heading: "Cấu trúc",
            formula: "S + am/is/are + V-ing",
            examples: [
              { en: "They are playing football.", vi: "Họ đang chơi bóng đá." },
              { en: "I'm not working today.", vi: "Hôm nay tôi không làm việc." },
              { en: "Is it raining?", vi: "Trời có đang mưa không?" },
            ],
          },
          {
            heading: "Lưu ý: động từ chỉ trạng thái (stative verbs)",
            body:
              "Các động từ chỉ trạng thái như like, love, know, want, need, " +
              "understand thường KHÔNG chia tiếp diễn. Nói 'I want' chứ không 'I am wanting'.",
          },
        ],
        mistakes: [
          {
            wrong: "I am understanding the lesson.",
            right: "I understand the lesson.",
            note: "understand là động từ trạng thái, không dùng thì tiếp diễn.",
          },
          {
            wrong: "She is go to school.",
            right: "She is going to school.",
            note: "Sau am/is/are phải là V-ing.",
          },
        ],
      },
      {
        id: "present-perfect",
        title: "Hiện tại hoàn thành · Present Perfect",
        short: "HT hoàn thành",
        level: "A2",
        summary: "Nối quá khứ với hiện tại: việc đã xảy ra nhưng còn liên quan đến hiện tại.",
        sections: [
          {
            heading: "Khi nào dùng",
            bullets: [
              "Trải nghiệm không nói rõ thời gian: I have visited Japan.",
              "Việc vừa hoàn thành, còn ảnh hưởng hiện tại: She has just finished.",
              "Bắt đầu trong quá khứ, kéo dài đến nay: We have lived here for 5 years.",
            ],
          },
          {
            heading: "Cấu trúc",
            formula: "S + have/has + V3 (past participle)",
            examples: [
              { en: "I have seen that film.", vi: "Tôi đã xem bộ phim đó (rồi)." },
              { en: "He hasn't called yet.", vi: "Anh ấy vẫn chưa gọi." },
              { en: "Have you ever eaten sushi?", vi: "Bạn đã bao giờ ăn sushi chưa?" },
            ],
          },
          {
            heading: "for vs since",
            body:
              "for + khoảng thời gian (for 3 years). since + mốc thời gian (since 2020). " +
              "Dấu hiệu khác: already, yet, just, ever, never, recently.",
          },
        ],
        mistakes: [
          {
            wrong: "I have seen him yesterday.",
            right: "I saw him yesterday.",
            note: "Có mốc thời gian quá khứ rõ ràng (yesterday) thì dùng quá khứ đơn.",
          },
          {
            wrong: "She has lived here since 5 years.",
            right: "She has lived here for 5 years.",
            note: "Khoảng thời gian dùng for, không dùng since.",
          },
        ],
      },
      {
        id: "past-simple",
        title: "Quá khứ đơn · Past Simple",
        short: "Quá khứ đơn",
        level: "A1",
        summary: "Hành động đã bắt đầu và kết thúc trong quá khứ, có mốc thời gian.",
        sections: [
          {
            heading: "Khi nào dùng",
            bullets: [
              "Hành động hoàn tất trong quá khứ: I visited Hanoi last year.",
              "Chuỗi hành động kế tiếp: He woke up, washed his face and left.",
              "Thói quen trong quá khứ: When I was young, I played a lot.",
            ],
          },
          {
            heading: "Cấu trúc",
            formula: "(+) S + V2/V-ed   ·   (−) S + did not + V   ·   (?) Did + S + V?",
            body:
              "Động từ có quy tắc thêm -ed; động từ bất quy tắc (irregular verbs) " +
              "phải học thuộc (go → went, see → saw). Câu phủ định/nghi vấn mượn did.",
            examples: [
              { en: "They watched a movie.", vi: "Họ đã xem một bộ phim." },
              { en: "I didn't go to the party.", vi: "Tôi đã không đến bữa tiệc." },
              { en: "Did she call you?", vi: "Cô ấy có gọi cho bạn không?" },
            ],
          },
          {
            heading: "Dấu hiệu nhận biết",
            body: "yesterday, last night/week, ago, in 2010, when I was a child.",
          },
        ],
        mistakes: [
          {
            wrong: "I didn't went home.",
            right: "I didn't go home.",
            note: "Sau did/didn't, động từ về nguyên thể: went → go.",
          },
        ],
      },
      {
        id: "past-continuous",
        title: "Quá khứ tiếp diễn · Past Continuous",
        short: "QK tiếp diễn",
        level: "A2",
        summary: "Hành động đang diễn ra tại một thời điểm trong quá khứ.",
        sections: [
          {
            heading: "Khi nào dùng",
            bullets: [
              "Đang xảy ra tại một thời điểm quá khứ: At 8 p.m. I was cooking.",
              "Một hành động đang diễn ra thì việc khác xen vào (interrupted action): " +
                "I was sleeping when the phone rang.",
              "Hai hành động song song: She was reading while he was cooking.",
            ],
          },
          {
            heading: "Cấu trúc",
            formula: "S + was/were + V-ing",
            examples: [
              { en: "We were waiting for the bus.", vi: "Chúng tôi đang đợi xe buýt." },
              {
                en: "While I was studying, she called.",
                vi: "Trong khi tôi đang học thì cô ấy gọi.",
              },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "When she called, I cooked dinner.",
            right: "When she called, I was cooking dinner.",
            note: "Hành động đang diễn ra (nền) dùng quá khứ tiếp diễn; việc xen vào dùng quá khứ đơn.",
          },
        ],
      },
      {
        id: "future",
        title: "Tương lai · Will & Be going to",
        short: "Tương lai",
        level: "A2",
        summary: "Phân biệt 'will' (quyết định tức thì, dự đoán) và 'be going to' (dự định, dấu hiệu).",
        sections: [
          {
            heading: "will — quyết định ngay, dự đoán",
            formula: "S + will + V (nguyên thể)",
            bullets: [
              "Quyết định ngay lúc nói: It's cold. I'll close the window.",
              "Dự đoán dựa trên ý kiến: I think it will rain tomorrow.",
              "Lời hứa, đề nghị: I will help you.",
            ],
          },
          {
            heading: "be going to — dự định, bằng chứng",
            formula: "S + am/is/are + going to + V",
            bullets: [
              "Dự định đã có sẵn: I'm going to study abroad.",
              "Dự đoán dựa trên dấu hiệu hiện tại: Look at those clouds — it's going to rain.",
            ],
          },
        ],
        mistakes: [
          {
            wrong: "I will to call you.",
            right: "I will call you.",
            note: "Sau will là động từ nguyên thể không 'to'.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 2. MẠO TỪ & DANH TỪ — ARTICLES & NOUNS
  // ─────────────────────────────────────────────────────────────
  {
    id: "articles-nouns",
    title: "Mạo từ & Danh từ · Articles & Nouns",
    blurb: "Dùng a / an / the đúng cách; danh từ đếm được và không đếm được.",
    color: "#0ea5e9",
    topics: [
      {
        id: "articles",
        title: "Mạo từ · Articles (a / an / the)",
        short: "Mạo từ",
        level: "A1",
        summary: "a/an cho danh từ chưa xác định; the cho danh từ đã xác định.",
        sections: [
          {
            heading: "Mạo từ không xác định (Indefinite): a / an",
            body:
              "Dùng trước danh từ đếm được số ít, khi nhắc lần đầu hoặc chung chung. " +
              "Dùng 'a' trước phụ âm (a book), 'an' trước nguyên âm phát âm (an hour, an apple).",
            examples: [
              { en: "I saw a dog.", vi: "Tôi thấy một con chó (chung chung)." },
              { en: "She is an engineer.", vi: "Cô ấy là một kỹ sư." },
            ],
          },
          {
            heading: "Mạo từ xác định (Definite): the",
            body:
              "Dùng khi cả người nói và người nghe đều biết đối tượng nào: vật đã nhắc, " +
              "vật duy nhất (the sun), hoặc xác định rõ.",
            examples: [
              { en: "The dog I saw was huge.", vi: "Con chó tôi thấy rất to (đã xác định)." },
              { en: "The Earth is round.", vi: "Trái Đất hình tròn (duy nhất)." },
            ],
          },
          {
            heading: "Không dùng mạo từ (zero article)",
            body:
              "Danh từ số nhiều/không đếm được mang nghĩa chung chung; tên riêng, " +
              "bữa ăn, môn học: I like music. We have lunch at noon.",
          },
        ],
        mistakes: [
          {
            wrong: "I am a engineer.",
            right: "I am an engineer.",
            note: "engineer bắt đầu bằng nguyên âm /e/ nên dùng 'an'.",
          },
          {
            wrong: "She plays the football.",
            right: "She plays football.",
            note: "Môn thể thao không dùng 'the'. (Nhưng nhạc cụ thì có: play the piano.)",
          },
        ],
      },
      {
        id: "countable",
        title: "Đếm được & Không đếm được · Countable / Uncountable",
        short: "Đếm được",
        level: "A2",
        summary: "Danh từ đếm được có số nhiều; danh từ không đếm được thì không.",
        sections: [
          {
            heading: "Phân biệt",
            bullets: [
              "Đếm được (countable): a book → two books, an apple → apples.",
              "Không đếm được (uncountable): water, money, information, advice, rice.",
              "Không đếm được luôn đi với động từ số ít: The information is useful.",
            ],
          },
          {
            heading: "Cách đếm danh từ không đếm được",
            body:
              "Dùng đơn vị đo: a glass of water, a piece of advice, a bottle of milk, " +
              "two kilos of rice.",
            examples: [
              { en: "Can I have a cup of coffee?", vi: "Cho tôi một tách cà phê được không?" },
              { en: "He gave me some good advice.", vi: "Anh ấy cho tôi vài lời khuyên hay." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "I need some informations.",
            right: "I need some information.",
            note: "information không đếm được, không có dạng số nhiều.",
          },
          {
            wrong: "He gave me many advices.",
            right: "He gave me much advice / a lot of advice.",
            note: "advice không đếm được; dùng much/a lot of, không many.",
          },
        ],
      },
      {
        id: "quantifiers",
        title: "Lượng từ · Quantifiers (some / any / much / many)",
        short: "Lượng từ",
        level: "A2",
        summary: "Diễn tả số lượng: some/any, much/many, a few/a little.",
        sections: [
          {
            heading: "some vs any",
            bullets: [
              "some: câu khẳng định và lời mời/đề nghị. I have some money. Would you like some tea?",
              "any: câu phủ định và nghi vấn. I don't have any money. Is there any milk?",
            ],
          },
          {
            heading: "much / many / a lot of",
            bullets: [
              "many + danh từ đếm được số nhiều: many books.",
              "much + danh từ không đếm được: much water (thường trong phủ định/nghi vấn).",
              "a lot of / lots of + cả hai loại (dùng nhiều trong khẳng định).",
            ],
          },
          {
            heading: "a few / a little",
            body:
              "a few + đếm được (a few friends = một vài). a little + không đếm được " +
              "(a little time = một chút). 'few/little' (không 'a') mang nghĩa ít ỏi, gần như không.",
          },
        ],
        mistakes: [
          {
            wrong: "How much books do you have?",
            right: "How many books do you have?",
            note: "books đếm được nên dùng many.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 3. TÍNH TỪ & TRẠNG TỪ — ADJECTIVES & ADVERBS
  // ─────────────────────────────────────────────────────────────
  {
    id: "adj-adv",
    title: "Tính từ & Trạng từ · Adjectives & Adverbs",
    blurb: "Miêu tả tính chất, so sánh, và cách hành động diễn ra.",
    color: "#f59e0b",
    topics: [
      {
        id: "comparatives",
        title: "So sánh hơn & nhất · Comparatives & Superlatives",
        short: "So sánh",
        level: "A2",
        summary: "So sánh hai vật (hơn) hoặc xếp hạng cao nhất trong nhóm (nhất).",
        sections: [
          {
            heading: "So sánh hơn (Comparative)",
            formula: "tính từ ngắn + -er + than   ·   more + tính từ dài + than",
            bullets: [
              "Tính từ ngắn (1 âm tiết): tall → taller, big → bigger.",
              "Tính từ dài (2+ âm tiết): beautiful → more beautiful.",
              "Bất quy tắc: good → better, bad → worse, far → farther/further.",
            ],
            examples: [
              { en: "She is taller than me.", vi: "Cô ấy cao hơn tôi." },
              { en: "This book is more interesting.", vi: "Cuốn sách này thú vị hơn." },
            ],
          },
          {
            heading: "So sánh nhất (Superlative)",
            formula: "the + tính từ ngắn + -est   ·   the most + tính từ dài",
            examples: [
              { en: "He is the tallest in class.", vi: "Cậu ấy cao nhất lớp." },
              { en: "It's the most expensive car.", vi: "Đó là chiếc xe đắt nhất." },
            ],
          },
          {
            heading: "So sánh bằng (Equality)",
            formula: "as + adj + as",
            examples: [{ en: "She is as tall as her sister.", vi: "Cô ấy cao bằng chị mình." }],
          },
        ],
        mistakes: [
          {
            wrong: "She is more taller than me.",
            right: "She is taller than me.",
            note: "Không dùng đồng thời 'more' và '-er'.",
          },
          {
            wrong: "He is the most tall.",
            right: "He is the tallest.",
            note: "tall là tính từ ngắn nên dùng -est, không 'the most'.",
          },
        ],
      },
      {
        id: "adverbs",
        title: "Trạng từ · Adverbs",
        short: "Trạng từ",
        level: "A2",
        summary: "Bổ nghĩa cho động từ, tính từ hoặc cả câu — cho biết cách/khi/nơi/mức độ.",
        sections: [
          {
            heading: "Cách tạo trạng từ chỉ cách thức",
            body: "Thường thêm -ly vào tính từ: quick → quickly, careful → carefully. Bất quy tắc: good → well, fast → fast.",
            examples: [
              { en: "She speaks English fluently.", vi: "Cô ấy nói tiếng Anh trôi chảy." },
              { en: "He drives carefully.", vi: "Anh ấy lái xe cẩn thận." },
            ],
          },
          {
            heading: "Vị trí trạng từ",
            bullets: [
              "Trạng từ cách thức thường đứng sau động từ/tân ngữ: He runs quickly.",
              "Trạng từ tần suất đứng trước động từ thường, sau 'to be': I always read. / She is always late.",
            ],
          },
        ],
        mistakes: [
          {
            wrong: "She sings beautiful.",
            right: "She sings beautifully.",
            note: "Bổ nghĩa cho động từ 'sing' phải dùng trạng từ beautifully.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 4. GIỚI TỪ — PREPOSITIONS
  // ─────────────────────────────────────────────────────────────
  {
    id: "prepositions",
    title: "Giới từ · Prepositions",
    blurb: "Giới từ chỉ thời gian và nơi chốn: in / on / at và cách dùng.",
    color: "#10b981",
    topics: [
      {
        id: "prep-time",
        title: "Giới từ thời gian · Prepositions of Time (in / on / at)",
        short: "GT thời gian",
        level: "A1",
        summary: "at giờ, on ngày, in tháng/năm/khoảng dài.",
        sections: [
          {
            heading: "Quy tắc cốt lõi",
            bullets: [
              "at + giờ/thời điểm: at 7 o'clock, at noon, at night.",
              "on + ngày/thứ/ngày tháng: on Monday, on July 4th, on my birthday.",
              "in + tháng/năm/mùa/buổi: in May, in 2020, in summer, in the morning.",
            ],
            examples: [
              { en: "The meeting is at 3 p.m. on Friday.", vi: "Cuộc họp lúc 3 giờ chiều thứ Sáu." },
              { en: "She was born in 1998.", vi: "Cô ấy sinh năm 1998." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "I will see you in Monday.",
            right: "I will see you on Monday.",
            note: "Thứ trong tuần dùng 'on'.",
          },
          {
            wrong: "We meet at the morning.",
            right: "We meet in the morning.",
            note: "Buổi trong ngày dùng 'in' (ngoại lệ: at night).",
          },
        ],
      },
      {
        id: "prep-place",
        title: "Giới từ nơi chốn · Prepositions of Place (in / on / at)",
        short: "GT nơi chốn",
        level: "A1",
        summary: "in trong không gian kín, on trên bề mặt, at tại một điểm.",
        sections: [
          {
            heading: "Quy tắc cốt lõi",
            bullets: [
              "in + không gian bao quanh: in the room, in a car, in Vietnam.",
              "on + bề mặt tiếp xúc: on the table, on the wall, on the second floor.",
              "at + một điểm/địa điểm cụ thể: at the door, at the station, at home.",
            ],
            examples: [
              { en: "The keys are on the table.", vi: "Chìa khóa ở trên bàn." },
              { en: "She is at the bus stop.", vi: "Cô ấy đang ở trạm xe buýt." },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "I live at Vietnam.",
            right: "I live in Vietnam.",
            note: "Quốc gia/thành phố lớn dùng 'in'.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 5. CÂU ĐIỀU KIỆN & BỊ ĐỘNG — CONDITIONALS & PASSIVE
  // ─────────────────────────────────────────────────────────────
  {
    id: "conditionals-passive",
    title: "Câu điều kiện & Bị động · Conditionals & Passive",
    blurb: "Diễn đạt giả định 'nếu... thì...' và câu bị động.",
    color: "#8b5cf6",
    topics: [
      {
        id: "conditionals",
        title: "Câu điều kiện · Conditionals (0–1–2–3)",
        short: "Điều kiện",
        level: "B1",
        summary: "Bốn loại câu 'if' diễn tả từ sự thật đến giả định không có thật.",
        sections: [
          {
            heading: "Loại 0 — sự thật hiển nhiên",
            formula: "If + S + V(hiện tại), S + V(hiện tại)",
            examples: [{ en: "If you heat ice, it melts.", vi: "Nếu bạn đun nóng đá, nó tan ra." }],
          },
          {
            heading: "Loại 1 — có thể xảy ra (real future)",
            formula: "If + S + V(hiện tại), S + will + V",
            examples: [
              { en: "If it rains, I will stay home.", vi: "Nếu trời mưa, tôi sẽ ở nhà." },
            ],
          },
          {
            heading: "Loại 2 — giả định trái hiện tại (unreal present)",
            formula: "If + S + V(quá khứ), S + would + V",
            examples: [
              {
                en: "If I were rich, I would travel.",
                vi: "Nếu tôi giàu (nhưng không), tôi sẽ đi du lịch.",
              },
            ],
          },
          {
            heading: "Loại 3 — giả định trái quá khứ (unreal past)",
            formula: "If + S + had + V3, S + would have + V3",
            examples: [
              {
                en: "If I had studied, I would have passed.",
                vi: "Nếu tôi đã học (nhưng đã không), thì tôi đã đậu.",
              },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "If I will have time, I will call you.",
            right: "If I have time, I will call you.",
            note: "Mệnh đề 'if' (loại 1) dùng hiện tại đơn, không dùng will.",
          },
          {
            wrong: "If I was you, I would go.",
            right: "If I were you, I would go.",
            note: "Câu điều kiện loại 2 dùng 'were' cho mọi ngôi (were quy ước).",
          },
        ],
      },
      {
        id: "passive",
        title: "Câu bị động · Passive Voice",
        short: "Bị động",
        level: "B1",
        summary: "Nhấn mạnh đối tượng chịu tác động thay vì người thực hiện.",
        sections: [
          {
            heading: "Cấu trúc chung",
            formula: "S + be (chia thì) + V3 (+ by + tác nhân)",
            body:
              "Tân ngữ của câu chủ động trở thành chủ ngữ câu bị động. 'be' chia theo " +
              "đúng thì của câu gốc.",
            examples: [
              {
                en: "Active: They build houses. → Passive: Houses are built.",
                vi: "Chủ động: Họ xây nhà. → Bị động: Nhà được xây.",
              },
              {
                en: "The letter was written by Tom.",
                vi: "Lá thư được viết bởi Tom.",
              },
            ],
          },
          {
            heading: "Bị động ở các thì",
            bullets: [
              "Hiện tại đơn: is/are + V3 — English is spoken here.",
              "Quá khứ đơn: was/were + V3 — The house was sold.",
              "Hiện tại hoàn thành: has/have been + V3 — It has been done.",
              "Tương lai: will be + V3 — It will be finished tomorrow.",
            ],
          },
        ],
        mistakes: [
          {
            wrong: "The cake was make by her.",
            right: "The cake was made by her.",
            note: "Bị động cần V3 (past participle): make → made.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────
  // 6. CẤU TRÚC NÂNG CAO — ADVANCED STRUCTURES
  // ─────────────────────────────────────────────────────────────
  {
    id: "advanced",
    title: "Cấu trúc nâng cao · Advanced Structures",
    blurb: "Động từ khuyết thiếu, câu tường thuật, mệnh đề quan hệ.",
    color: "#ef4444",
    topics: [
      {
        id: "modals",
        title: "Động từ khuyết thiếu · Modal Verbs",
        short: "Modal verbs",
        level: "B1",
        summary: "can, could, may, might, must, should, have to — diễn đạt khả năng, sự cho phép, bắt buộc, lời khuyên.",
        sections: [
          {
            heading: "Ý nghĩa chính",
            bullets: [
              "Khả năng (ability): can/could — I can swim.",
              "Cho phép (permission): can/may — May I come in?",
              "Bắt buộc (obligation): must / have to — You must wear a helmet.",
              "Lời khuyên (advice): should / ought to — You should rest.",
              "Khả năng xảy ra (possibility): may/might/could — It might rain.",
            ],
          },
          {
            heading: "Quy tắc dùng",
            body:
              "Sau modal là động từ nguyên thể không 'to' (must go, should eat). " +
              "Modal không chia theo ngôi (không thêm -s): She can, không 'She cans'.",
            examples: [
              { en: "You should see a doctor.", vi: "Bạn nên đi khám bác sĩ." },
              { en: "He must finish it today.", vi: "Anh ấy phải hoàn thành hôm nay." },
            ],
          },
          {
            heading: "must vs have to",
            body:
              "must: bắt buộc từ ý người nói. have to: bắt buộc do hoàn cảnh/quy định. " +
              "Phủ định khác nghĩa: mustn't (cấm) ≠ don't have to (không cần).",
          },
        ],
        mistakes: [
          {
            wrong: "She can to drive.",
            right: "She can drive.",
            note: "Sau modal là nguyên thể không 'to'.",
          },
          {
            wrong: "You mustn't to be late.",
            right: "You mustn't be late.",
            note: "mustn't + V nguyên thể; mustn't = cấm, đừng làm.",
          },
        ],
      },
      {
        id: "reported",
        title: "Câu tường thuật · Reported Speech",
        short: "Tường thuật",
        level: "B1",
        summary: "Thuật lại lời người khác: lùi thì và đổi đại từ/trạng từ thời gian.",
        sections: [
          {
            heading: "Nguyên tắc lùi thì (backshift)",
            bullets: [
              "Hiện tại đơn → Quá khứ đơn: \"I am tired\" → He said he was tired.",
              "Hiện tại tiếp diễn → Quá khứ tiếp diễn.",
              "Quá khứ đơn / HT hoàn thành → Quá khứ hoàn thành.",
              "will → would, can → could, must → had to.",
            ],
          },
          {
            heading: "Đổi đại từ & trạng từ thời gian",
            body:
              "now → then, today → that day, tomorrow → the next day, yesterday → " +
              "the day before, here → there.",
            examples: [
              {
                en: '"I will call you tomorrow." → She said she would call me the next day.',
                vi: "“Tôi sẽ gọi bạn ngày mai.” → Cô ấy nói cô ấy sẽ gọi tôi vào ngày hôm sau.",
              },
            ],
          },
          {
            heading: "Câu hỏi tường thuật",
            body:
              "Câu hỏi Yes/No dùng if/whether; câu hỏi Wh- giữ từ để hỏi, nhưng trật tự " +
              "trở về dạng khẳng định: He asked where I lived.",
          },
        ],
        mistakes: [
          {
            wrong: "He said he is busy.",
            right: "He said he was busy.",
            note: "Sau 'said' (quá khứ) thường lùi thì: is → was.",
          },
        ],
      },
      {
        id: "relative",
        title: "Mệnh đề quan hệ · Relative Clauses",
        short: "MĐ quan hệ",
        level: "B2",
        summary: "Dùng who/which/that/whose/where để bổ nghĩa cho danh từ.",
        sections: [
          {
            heading: "Đại từ quan hệ (relative pronouns)",
            bullets: [
              "who — chỉ người: The man who called is my uncle.",
              "which — chỉ vật: The book which I read was great.",
              "that — người hoặc vật (mệnh đề xác định): The car that broke down...",
              "whose — sở hữu: The girl whose bag was stolen...",
              "where — nơi chốn: The town where I grew up.",
            ],
          },
          {
            heading: "Xác định vs không xác định",
            body:
              "Mệnh đề xác định (defining) cần thiết để hiểu nghĩa, KHÔNG có dấu phẩy. " +
              "Mệnh đề không xác định (non-defining) chỉ bổ sung thông tin, CÓ dấu phẩy " +
              "và không dùng 'that': My father, who is 60, still works.",
            examples: [
              {
                en: "The woman who lives next door is a doctor.",
                vi: "Người phụ nữ sống nhà bên là bác sĩ (xác định ai).",
              },
            ],
          },
        ],
        mistakes: [
          {
            wrong: "The book who I read was good.",
            right: "The book which/that I read was good.",
            note: "book là vật nên dùng which/that, không 'who'.",
          },
        ],
      },
    ],
  },
];



// ─────────────────────────────────────────────────────────────
// BÀI TẬP KIỂM TRA — COMPREHENSION EXERCISES
// 3 câu trắc nghiệm cho mỗi chủ đề, tra cứu theo topic.id.
// ─────────────────────────────────────────────────────────────

export interface GrammarExercise {
  question: string; // câu hỏi (dùng ___ cho chỗ trống)
  options: string[]; // các lựa chọn
  answer: number; // chỉ số đáp án đúng (0-based)
  explain: string; // giải thích (tiếng Việt)
}

/** Câu hỏi do AI sinh cho bộ bài tập (15 câu/bộ). */
export interface GeneratedQuestion {
  type: "mcq" | "fill";
  prompt: string; // câu hỏi (có thể chứa "___")
  options?: string[]; // chỉ cho mcq
  answer: string; // đáp án đúng (text)
  explain: string; // giải thích (tiếng Việt)
}

export const GRAMMAR_EXERCISES: Record<string, GrammarExercise[]> = {
  "present-simple": [
    {
      question: "She ___ to the gym every morning.",
      options: ["go", "goes", "going"],
      answer: 1,
      explain: "Ngôi thứ ba số ít (she) thêm -es: go → goes.",
    },
    {
      question: "They ___ like spicy food.",
      options: ["doesn't", "don't", "aren't"],
      answer: 1,
      explain: "Chủ ngữ số nhiều (they) dùng don't.",
    },
    {
      question: "___ he work on weekends?",
      options: ["Do", "Does", "Is"],
      answer: 1,
      explain: "Câu hỏi với ngôi thứ ba số ít dùng trợ động từ Does.",
    },
  ],
  "present-continuous": [
    {
      question: "Be quiet! The baby ___.",
      options: ["sleeps", "is sleeping", "sleep"],
      answer: 1,
      explain: "Hành động đang xảy ra ngay lúc nói → hiện tại tiếp diễn.",
    },
    {
      question: "I ___ the answer to this question.",
      options: ["am knowing", "know", "knowing"],
      answer: 1,
      explain: "know là động từ trạng thái, không chia tiếp diễn.",
    },
    {
      question: "Look! It ___ outside.",
      options: ["snow", "snows", "is snowing"],
      answer: 2,
      explain: "Đang diễn ra ngay bây giờ (Look!) → am/is/are + V-ing.",
    },
  ],
  "present-perfect": [
    {
      question: "I ___ never ___ to Paris.",
      options: ["have / been", "has / been", "did / go"],
      answer: 0,
      explain: "Trải nghiệm chưa từng có → have/has + V3; chủ ngữ I dùng have.",
    },
    {
      question: "She has worked here ___ 2019.",
      options: ["for", "since", "in"],
      answer: 1,
      explain: "since + mốc thời gian (2019).",
    },
    {
      question: "We ___ already ___ lunch.",
      options: ["have / had", "have / have", "has / eaten"],
      answer: 0,
      explain: "have + V3 của eat/have-meal; 'had' là V3 của have (ăn).",
    },
  ],
  "past-simple": [
    {
      question: "He ___ to London last summer.",
      options: ["go", "went", "has gone"],
      answer: 1,
      explain: "Có mốc quá khứ (last summer) → quá khứ đơn; go → went.",
    },
    {
      question: "They ___ come to the meeting yesterday.",
      options: ["didn't", "don't", "weren't"],
      answer: 0,
      explain: "Phủ định quá khứ đơn dùng didn't + V nguyên thể.",
    },
    {
      question: "___ you see the film last night?",
      options: ["Do", "Did", "Have"],
      answer: 1,
      explain: "Câu hỏi quá khứ đơn (last night) dùng Did.",
    },
  ],
  "past-continuous": [
    {
      question: "I ___ TV when the lights went out.",
      options: ["watched", "was watching", "watch"],
      answer: 1,
      explain: "Hành động đang diễn ra (nền) khi việc khác xen vào → QK tiếp diễn.",
    },
    {
      question: "While she ___, the phone rang.",
      options: ["cooked", "was cooking", "cooks"],
      answer: 1,
      explain: "while + quá khứ tiếp diễn diễn tả hành động đang xảy ra.",
    },
    {
      question: "At 9 p.m. last night, we ___ dinner.",
      options: ["were having", "had", "have"],
      answer: 0,
      explain: "Tại một thời điểm cụ thể trong quá khứ → was/were + V-ing.",
    },
  ],
  future: [
    {
      question: "It's so hot. I ___ open the window.",
      options: ["will", "am going to", "open"],
      answer: 0,
      explain: "Quyết định ngay lúc nói → will.",
    },
    {
      question: "Look at those dark clouds! It ___ rain.",
      options: ["will", "is going to", "rains"],
      answer: 1,
      explain: "Dự đoán dựa trên dấu hiệu hiện tại → be going to.",
    },
    {
      question: "I've decided. I ___ study medicine.",
      options: ["will", "am going to", "study"],
      answer: 1,
      explain: "Dự định đã có sẵn → be going to.",
    },
  ],
  articles: [
    {
      question: "She is ___ honest person.",
      options: ["a", "an", "the"],
      answer: 1,
      explain: "honest có 'h' câm, phát âm bắt đầu bằng nguyên âm → an.",
    },
    {
      question: "___ sun is very bright today.",
      options: ["A", "An", "The"],
      answer: 2,
      explain: "Vật duy nhất (the sun) → the.",
    },
    {
      question: "I love ___ music.",
      options: ["a", "the", "(không mạo từ)"],
      answer: 2,
      explain: "Danh từ không đếm được mang nghĩa chung chung → không mạo từ.",
    },
  ],
  countable: [
    {
      question: "Could you give me some ___?",
      options: ["informations", "information", "an information"],
      answer: 1,
      explain: "information không đếm được, không có số nhiều.",
    },
    {
      question: "There ___ a lot of water in the bottle.",
      options: ["is", "are", "were"],
      answer: 0,
      explain: "water không đếm được → động từ số ít (is).",
    },
    {
      question: "I'd like two ___ of bread.",
      options: ["pieces", "piece", "breads"],
      answer: 0,
      explain: "Đếm danh từ không đếm được qua đơn vị: two pieces of bread.",
    },
  ],
  quantifiers: [
    {
      question: "How ___ apples do you want?",
      options: ["much", "many", "any"],
      answer: 1,
      explain: "apples đếm được → many.",
    },
    {
      question: "There isn't ___ milk left.",
      options: ["some", "any", "many"],
      answer: 1,
      explain: "Câu phủ định dùng any.",
    },
    {
      question: "I only have ___ time, so let's hurry.",
      options: ["a few", "a little", "many"],
      answer: 1,
      explain: "time không đếm được → a little.",
    },
  ],
  comparatives: [
    {
      question: "This box is ___ than that one.",
      options: ["heavy", "heavier", "more heavy"],
      answer: 1,
      explain: "Tính từ ngắn → thêm -er: heavy → heavier.",
    },
    {
      question: "It was the ___ day of my life.",
      options: ["happiest", "most happy", "happier"],
      answer: 0,
      explain: "So sánh nhất với tính từ ngắn → the + -est.",
    },
    {
      question: "She is as tall ___ her brother.",
      options: ["than", "as", "like"],
      answer: 1,
      explain: "So sánh bằng: as + adj + as.",
    },
  ],
  adverbs: [
    {
      question: "He drives very ___.",
      options: ["careful", "carefully", "carefuly"],
      answer: 1,
      explain: "Bổ nghĩa cho động từ drive → trạng từ carefully.",
    },
    {
      question: "She sings ___.",
      options: ["beautiful", "beautifully", "beauty"],
      answer: 1,
      explain: "Trạng từ cách thức: beautiful → beautifully.",
    },
    {
      question: "I ___ go to bed late.",
      options: ["never", "am never", "never am"],
      answer: 0,
      explain: "Trạng từ tần suất đứng trước động từ thường (go).",
    },
  ],
  "prep-time": [
    {
      question: "The class starts ___ 8 o'clock.",
      options: ["in", "on", "at"],
      answer: 2,
      explain: "Giờ cụ thể → at.",
    },
    {
      question: "My birthday is ___ June.",
      options: ["in", "on", "at"],
      answer: 0,
      explain: "Tháng → in.",
    },
    {
      question: "We have a meeting ___ Monday.",
      options: ["in", "on", "at"],
      answer: 1,
      explain: "Thứ trong tuần → on.",
    },
  ],
  "prep-place": [
    {
      question: "The cat is ___ the table.",
      options: ["in", "on", "at"],
      answer: 1,
      explain: "Trên bề mặt → on.",
    },
    {
      question: "She lives ___ Japan.",
      options: ["in", "on", "at"],
      answer: 0,
      explain: "Quốc gia → in.",
    },
    {
      question: "I'll meet you ___ the bus stop.",
      options: ["in", "on", "at"],
      answer: 2,
      explain: "Một điểm cụ thể → at.",
    },
  ],
  conditionals: [
    {
      question: "If you heat water to 100°C, it ___.",
      options: ["boils", "will boil", "boiled"],
      answer: 0,
      explain: "Sự thật hiển nhiên (loại 0): cả hai vế hiện tại đơn.",
    },
    {
      question: "If it rains tomorrow, we ___ at home.",
      options: ["stay", "will stay", "stayed"],
      answer: 1,
      explain: "Điều kiện loại 1: if + hiện tại, mệnh đề chính will + V.",
    },
    {
      question: "If I ___ you, I would apologize.",
      options: ["am", "was", "were"],
      answer: 2,
      explain: "Điều kiện loại 2 dùng 'were' cho mọi ngôi.",
    },
  ],
  passive: [
    {
      question: "English ___ in many countries.",
      options: ["speaks", "is spoken", "spoken"],
      answer: 1,
      explain: "Bị động hiện tại đơn: is/are + V3.",
    },
    {
      question: "The bridge ___ in 1990.",
      options: ["built", "was built", "is built"],
      answer: 1,
      explain: "Bị động quá khứ đơn: was/were + V3.",
    },
    {
      question: "This song ___ by millions of people.",
      options: ["has been heard", "has heard", "is hearing"],
      answer: 0,
      explain: "Bị động hiện tại hoàn thành: has/have been + V3.",
    },
  ],
  modals: [
    {
      question: "You ___ wear a seatbelt. It's the law.",
      options: ["should", "must", "might"],
      answer: 1,
      explain: "Bắt buộc theo quy định → must.",
    },
    {
      question: "She ___ drive when she was 16.",
      options: ["can", "could", "must"],
      answer: 1,
      explain: "Khả năng trong quá khứ → could.",
    },
    {
      question: "You look tired. You ___ get some rest.",
      options: ["should", "must", "can"],
      answer: 0,
      explain: "Lời khuyên → should.",
    },
  ],
  reported: [
    {
      question: 'He said he ___ tired. (gốc: "I am tired")',
      options: ["is", "was", "has been"],
      answer: 1,
      explain: "Lùi thì: hiện tại đơn → quá khứ đơn (is → was).",
    },
    {
      question: 'She told me she ___ call. (gốc: "I will call")',
      options: ["will", "would", "can"],
      answer: 1,
      explain: "Lùi thì: will → would.",
    },
    {
      question: "He asked where I ___.",
      options: ["live", "lived", "do live"],
      answer: 1,
      explain: "Câu hỏi tường thuật: trật tự khẳng định + lùi thì (live → lived).",
    },
  ],
  relative: [
    {
      question: "The man ___ called you is here.",
      options: ["which", "who", "whose"],
      answer: 1,
      explain: "Chỉ người → who.",
    },
    {
      question: "The book ___ I bought is interesting.",
      options: ["who", "which", "where"],
      answer: 1,
      explain: "Chỉ vật → which (hoặc that).",
    },
    {
      question: "That's the girl ___ bag was stolen.",
      options: ["who", "which", "whose"],
      answer: 2,
      explain: "Quan hệ sở hữu → whose.",
    },
  ],
};
