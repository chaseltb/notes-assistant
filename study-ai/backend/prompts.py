SYSTEM_PROMPT = """You are a precise study assistant. Your only job is to help students understand their own notes.

Rules you must never break:
- Answer exclusively from the note excerpts provided. Never use outside knowledge.
- If the answer is not in the notes, respond exactly: "I couldn't find that in your notes."
- Every factual claim must cite its source as (Document, Page X, Heading).
- If excerpts contradict each other, point out the contradiction — do not pick a side.
- Be concise. Students are studying, not reading an essay."""


def _format_excerpts(chunks: list) -> str:
    parts = []
    for c in chunks:
        header = f"[{c['document']} | Page {c['page']} | {c['heading']}]" if c.get('heading') else f"[{c['document']} | Page {c['page']}]"
        parts.append(f"{header}\n{c['text']}")
    return "\n\n---\n\n".join(parts)


def build_ask_prompt(question: str, chunks: list) -> str:
    excerpts = _format_excerpts(chunks)
    return f"""Below are excerpts from the student's notes. Use them to answer the question.

{excerpts}

---

Question: {question}

Instructions:
- Answer directly and concisely.
- Cite every fact as (Document, Page X) inline.
- If the notes don't contain enough information, say so explicitly."""


def build_quiz_prompt(topic: str, difficulty: str, mcq: int, short: int, long: int, chunks: list) -> str:
    excerpts = _format_excerpts(chunks)
    topic_line = f'Topic focus: "{topic}"' if topic else "Topic: cover the material broadly"

    difficulty_guide = {
        "Easy": "Test direct recall of definitions and basic facts. Questions should be answerable from a single sentence in the notes.",
        "Medium": "Test understanding and application. Require students to connect two or more concepts. Avoid trivially obvious answers.",
        "Hard": "Test deep understanding, edge cases, and the ability to reason across multiple concepts. Distractors should be plausible to someone who half-understands the material.",
    }.get(difficulty, "Test understanding and application.")

    return f"""You are generating a practice exam from a student's notes.

{topic_line}
Difficulty: {difficulty} — {difficulty_guide}

Generate exactly:
- {mcq} multiple choice questions
- {short} short answer questions
- {long} long answer questions

MCQ requirements:
- All 4 options must be plausible — no obviously absurd distractors
- Only one option is correct
- Options must be labelled exactly "A", "B", "C", "D" (no punctuation after the letter)
- The "answer" field contains only the letter: "A", "B", "C", or "D"

Short answer requirements:
- Question should require 1–3 sentences to answer well
- Model answer should be complete but concise

Long answer requirements:
- Question should require synthesis of multiple concepts
- Model answer should be a full paragraph or structured list

Return ONLY valid JSON in this exact structure, no other text:
{{
  "mcq": [
    {{"question": "...", "options": ["A ...", "B ...", "C ...", "D ..."], "answer": "A", "source": "Document, Page X"}}
  ],
  "short": [
    {{"question": "...", "answer": "...", "source": "Document, Page X"}}
  ],
  "long": [
    {{"question": "...", "answer": "...", "source": "Document, Page X"}}
  ]
}}

Note excerpts:
{excerpts}"""


def build_flashcard_prompt(topic: str, chunks: list) -> str:
    excerpts = _format_excerpts(chunks)
    topic_line = f'Topic focus: "{topic}"' if topic else "Cover the key concepts broadly."

    return f"""Generate flashcards from the student's notes for spaced-repetition study.

{topic_line}

Flashcard rules:
- One atomic concept per card — never cram two facts into one card
- Question side: a clear, specific question (not "What is X?" unless X is a definition worth memorising)
- Prefer questions that test: definitions, mechanisms, comparisons, causes/effects, sequences of steps
- Answer side: the minimal correct answer — no padding, no re-stating the question
- Avoid trivial cards (e.g. "What subject is this?" or cards where the answer is in the question)
- Aim for 10–20 cards. More is fine if the material warrants it.

Return ONLY a valid JSON array, no other text:
[
  {{"question": "...", "answer": "...", "source": "Document, Page X"}}
]

Note excerpts:
{excerpts}"""


def build_topic_prompt(md_text: str) -> str:
    # Use first ~1500 words to keep cost low
    words = md_text.split()
    preview = " ".join(words[:1500])

    return f"""A student just uploaded a study document. Read the opening section and identify what it covers.

Return ONLY valid JSON — no other text:
{{
  "title": "short descriptive title for this document (max 8 words)",
  "subject": "the academic subject or course (e.g. Molecular Biology, Calculus II, Microeconomics)",
  "topics": ["key topic 1", "key topic 2", "key topic 3"],
  "summary": "one sentence describing what a student will learn from this document"
}}

Document content:
{preview}"""
