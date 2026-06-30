import json
import re
from pathlib import Path


def _split_sentences(text: str) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in sentences if s.strip()]


def _words(text: str) -> list[str]:
    return text.split()


def _chunk_paragraph_block(paragraphs: list[str], target: int = 500, overlap: int = 100) -> list[str]:
    """Split a list of paragraphs into word-limited chunks with overlap."""
    chunks = []
    current_words: list[str] = []
    overlap_words: list[str] = []

    for para in paragraphs:
        para_words = _words(para)
        if len(para_words) > target:
            # Split long paragraph by sentences
            sentences = _split_sentences(para)
            for sentence in sentences:
                sw = _words(sentence)
                if len(current_words) + len(sw) > target and current_words:
                    chunks.append(" ".join(current_words))
                    overlap_words = current_words[-overlap:] if len(current_words) >= overlap else current_words[:]
                    current_words = overlap_words + sw
                else:
                    current_words.extend(sw)
        else:
            if len(current_words) + len(para_words) > target and current_words:
                chunks.append(" ".join(current_words))
                overlap_words = current_words[-overlap:] if len(current_words) >= overlap else current_words[:]
                current_words = overlap_words + para_words
            else:
                current_words.extend(para_words)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks


def chunk_markdown(md_text: str, document_name: str, source_filename: str, course: str = "") -> list[dict]:
    if not course:
        course = document_name.split()[0] if " " in document_name else document_name

    # Split by headings
    heading_pattern = re.compile(r'^(#{1,3} .+)$', re.MULTILINE)
    sections = []
    current_heading = ""
    current_body: list[str] = []

    lines = md_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if heading_pattern.match(line):
            if current_body:
                sections.append((current_heading, "\n".join(current_body)))
                current_body = []
            current_heading = line.lstrip("#").strip()
        else:
            current_body.append(line)
        i += 1

    if current_body:
        sections.append((current_heading, "\n".join(current_body)))

    chunks = []
    chunk_id = 0

    for heading, body in sections:
        # Split body into paragraphs (blank-line separated)
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', body) if p.strip()]

        body_word_count = len(_words(body))

        if body_word_count <= 600:
            # Single chunk
            if body.strip():
                chunks.append({
                    "id": chunk_id,
                    "document": document_name,
                    "page": 1,
                    "heading": heading,
                    "text": body.strip(),
                    "course": course,
                })
                chunk_id += 1
        else:
            sub_chunks = _chunk_paragraph_block(paragraphs)
            for sc in sub_chunks:
                if sc.strip():
                    chunks.append({
                        "id": chunk_id,
                        "document": document_name,
                        "page": 1,
                        "heading": heading,
                        "text": sc.strip(),
                        "course": course,
                    })
                    chunk_id += 1

    return chunks


def save_chunks(chunks: list[dict], path: Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8")


def load_chunks(path: Path) -> list[dict]:
    path = Path(path)
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))
