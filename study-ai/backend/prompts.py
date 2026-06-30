SYSTEM_PROMPT = """You are an AI study assistant.

Answer ONLY using the supplied note excerpts.

If the answer cannot be found in the notes, say:
"I couldn't find that information in your notes."

Do not use outside knowledge.
Never guess.
Always cite the document name and page number.

If multiple excerpts disagree, explain the disagreement rather than choosing one."""


def build_ask_prompt(question: str, chunks: list) -> str:
    excerpts = ""
    for c in chunks:
        excerpts += f"[Document: {c['document']} | Page: {c['page']} | Heading: {c['heading']}]\n{c['text']}\n\n"
    return f"{excerpts}Question: {question}"


def build_quiz_prompt(topic: str, difficulty: str, mcq: int, short: int, long: int, chunks: list) -> str:
    excerpts = ""
    for c in chunks:
        excerpts += f"[Document: {c['document']} | Page: {c['page']} | Heading: {c['heading']}]\n{c['text']}\n\n"

    return f"""Using ONLY the following note excerpts, generate a practice quiz on the topic: "{topic}".
Difficulty: {difficulty}

Generate exactly:
- {mcq} multiple choice questions (MCQ)
- {short} short answer questions
- {long} long answer questions

Return your response as valid JSON with this exact structure:
{{
  "mcq": [
    {{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "source": "Document name, page X"}}
  ],
  "short": [
    {{"question": "...", "answer": "...", "source": "Document name, page X"}}
  ],
  "long": [
    {{"question": "...", "answer": "...", "source": "Document name, page X"}}
  ]
}}

Note excerpts:
{excerpts}"""


def build_flashcard_prompt(topic: str, chunks: list) -> str:
    excerpts = ""
    for c in chunks:
        excerpts += f"[Document: {c['document']} | Page: {c['page']} | Heading: {c['heading']}]\n{c['text']}\n\n"

    return f"""Using ONLY the following note excerpts, generate flashcards on the topic: "{topic}".

Return your response as a valid JSON array with this exact structure:
[
  {{"question": "...", "answer": "...", "source": "Document name, page X"}}
]

Note excerpts:
{excerpts}"""
