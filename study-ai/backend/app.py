import hashlib
import json
import os
import shutil
from pathlib import Path

import orjson
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List

load_dotenv()

from parser import parse_to_markdown
from chunker import chunk_markdown, load_chunks, save_chunks
from search import build_index, load_index, search
from prompts import SYSTEM_PROMPT, build_ask_prompt, build_flashcard_prompt, build_quiz_prompt
from quiz import parse_flashcard_response, parse_quiz_response

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent.parent / "data"))
NOTES_DIR = Path(os.environ.get("NOTES_DIR", Path(__file__).parent.parent / "notes"))

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".md", ".txt"}

app = FastAPI(title="Study AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ORJSONResponse(JSONResponse):
    media_type = "application/json"

    def render(self, content) -> bytes:
        return orjson.dumps(content)


def session_data_dir(session_id: str) -> Path:
    return DATA_DIR / "sessions" / session_id


def _load_manifest(session_dir: Path) -> dict:
    manifest_file = session_dir / "manifest.json"
    if manifest_file.exists():
        return json.loads(manifest_file.read_text(encoding="utf-8"))
    return {}


def _save_manifest(session_dir: Path, manifest: dict) -> None:
    manifest_file = session_dir / "manifest.json"
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def _file_hash(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def _get_course(rel_path: Path) -> str:
    parts = rel_path.parts
    if len(parts) > 1:
        return parts[0]
    return "General"


def _parse_and_index_files(file_paths: list[Path], manifest: dict, session_dir: Path) -> list[str]:
    md_dir = session_dir / "markdown"
    md_dir.mkdir(parents=True, exist_ok=True)

    processed = []
    for file_path in file_paths:
        rel = file_path.relative_to(NOTES_DIR)
        rel_str = rel.as_posix()
        course = _get_course(rel)
        mtime = file_path.stat().st_mtime
        file_hash = _file_hash(file_path)

        md_stem = rel_str.replace("/", "__").replace("\\", "__")
        md_path = md_dir / (Path(md_stem).stem + ".md")

        parse_to_markdown(file_path, md_path)

        manifest[rel_str] = {
            "course": course,
            "filename": file_path.name,
            "modified": mtime,
            "hash": file_hash,
        }
        processed.append(rel_str)

    return processed


def _rebuild_chunks_and_index(manifest: dict, session_dir: Path) -> list[dict]:
    md_dir = session_dir / "markdown"
    chunks_file = session_dir / "chunks" / "chunks.json"
    bm25_path = session_dir / "bm25.pkl"

    all_chunks = []
    chunk_id = 0
    for rel_str, info in manifest.items():
        md_stem = rel_str.replace("/", "__").replace("\\", "__")
        md_path = md_dir / (Path(md_stem).stem + ".md")
        if not md_path.exists():
            continue
        md_text = md_path.read_text(encoding="utf-8")
        file_chunks = chunk_markdown(md_text, info["filename"], rel_str, course=info["course"])
        for c in file_chunks:
            c["id"] = chunk_id
            chunk_id += 1
        all_chunks.extend(file_chunks)

    chunks_file.parent.mkdir(parents=True, exist_ok=True)
    save_chunks(all_chunks, chunks_file)
    build_index(all_chunks, bm25_path)
    return all_chunks


def _load_session_index(session_dir: Path) -> tuple:
    bm25_path = session_dir / "bm25.pkl"
    return load_index(bm25_path)


def _load_session_chunks(session_dir: Path) -> list[dict]:
    chunks_file = session_dir / "chunks" / "chunks.json"
    return load_chunks(chunks_file)


def _call_gemini(prompt: str) -> str:
    from google import genai
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"system_instruction": SYSTEM_PROMPT},
    )
    return response.text


# ── Pydantic models ──────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str


class QuizRequest(BaseModel):
    topic: str = ""
    difficulty: str = "Medium"
    mcq: int = 5
    short: int = 3
    long: int = 1


class FlashcardRequest(BaseModel):
    topic: str = ""


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/sync")
async def sync(x_session_id: str = Header(default="default")):
    session_dir = session_data_dir(x_session_id)
    session_dir.mkdir(parents=True, exist_ok=True)

    NOTES_DIR.mkdir(parents=True, exist_ok=True)

    manifest = _load_manifest(session_dir)

    found_files: dict[str, Path] = {}
    for ext in SUPPORTED_EXTENSIONS:
        for fp in NOTES_DIR.rglob(f"*{ext}"):
            rel_str = fp.relative_to(NOTES_DIR).as_posix()
            found_files[rel_str] = fp

    updated = []
    removed = []

    md_dir = session_dir / "markdown"
    md_dir.mkdir(parents=True, exist_ok=True)

    for rel_str in list(manifest.keys()):
        if rel_str not in found_files:
            info = manifest.pop(rel_str)
            md_stem = rel_str.replace("/", "__").replace("\\", "__")
            md_path = md_dir / (Path(md_stem).stem + ".md")
            if md_path.exists():
                md_path.unlink()
            removed.append(rel_str)

    files_to_process = []
    for rel_str, fp in found_files.items():
        mtime = fp.stat().st_mtime
        file_hash = _file_hash(fp)
        existing = manifest.get(rel_str)
        if existing and existing.get("hash") == file_hash and existing.get("modified") == mtime:
            continue
        files_to_process.append(fp)
        updated.append(rel_str)

    if files_to_process:
        _parse_and_index_files(files_to_process, manifest, session_dir)

    _save_manifest(session_dir, manifest)
    _rebuild_chunks_and_index(manifest, session_dir)

    return ORJSONResponse({
        "documents": len(manifest),
        "updated": updated,
        "removed": removed,
    })


@app.post("/upload")
async def upload(
    files: List[UploadFile] = File(...),
    course: str = Form(default="General"),
    x_session_id: str = Header(default="default"),
):
    session_dir = session_data_dir(x_session_id)
    session_dir.mkdir(parents=True, exist_ok=True)

    dest_dir = NOTES_DIR / course
    dest_dir.mkdir(parents=True, exist_ok=True)

    manifest = _load_manifest(session_dir)
    saved = []
    files_to_process = []

    for upload in files:
        filename = Path(upload.filename).name
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue
        dest_path = dest_dir / filename
        dest_path.write_bytes(await upload.read())
        saved.append(filename)
        files_to_process.append(dest_path)

    if files_to_process:
        _parse_and_index_files(files_to_process, manifest, session_dir)
        _save_manifest(session_dir, manifest)
        _rebuild_chunks_and_index(manifest, session_dir)

    return ORJSONResponse({"saved": saved})


@app.post("/ask")
async def ask(req: AskRequest, x_session_id: str = Header(default="default")):
    session_dir = session_data_dir(x_session_id)
    bm25, chunks = _load_session_index(session_dir)
    results = search(req.question, bm25, chunks, top_k=8)
    prompt = build_ask_prompt(req.question, results)
    answer = _call_gemini(prompt)

    sources = []
    seen = set()
    for c in results:
        key = (c["document"], c["page"], c["heading"])
        if key not in seen:
            seen.add(key)
            sources.append({"document": c["document"], "page": c["page"], "heading": c["heading"]})

    return ORJSONResponse({
        "answer": answer,
        "sources": sources,
        "excerpts": [
            {"document": c["document"], "page": c["page"], "heading": c["heading"], "text": c["text"]}
            for c in results
        ],
    })


@app.post("/quiz")
async def quiz(req: QuizRequest, x_session_id: str = Header(default="default")):
    session_dir = session_data_dir(x_session_id)
    bm25, chunks = _load_session_index(session_dir)
    results = search(req.topic or "study", bm25, chunks, top_k=15)
    prompt = build_quiz_prompt(req.topic, req.difficulty, req.mcq, req.short, req.long, results)
    raw = _call_gemini(prompt)
    data = parse_quiz_response(raw)
    return ORJSONResponse(data)


@app.post("/flashcards")
async def flashcards(req: FlashcardRequest, x_session_id: str = Header(default="default")):
    session_dir = session_data_dir(x_session_id)
    bm25, chunks = _load_session_index(session_dir)
    results = search(req.topic or "study", bm25, chunks, top_k=12)
    prompt = build_flashcard_prompt(req.topic, results)
    raw = _call_gemini(prompt)
    cards = parse_flashcard_response(raw)
    return ORJSONResponse(cards)


@app.get("/documents")
async def documents(x_session_id: str = Header(default="default")):
    session_dir = session_data_dir(x_session_id)
    chunks = _load_session_chunks(session_dir)
    seen = {}
    for c in chunks:
        key = c["document"]
        if key not in seen:
            seen[key] = {"name": c["document"], "course": c.get("course", "General"), "chunk_count": 0}
        seen[key]["chunk_count"] += 1
    return ORJSONResponse({"documents": list(seen.values())})


@app.get("/health")
async def health(x_session_id: str = Header(default="default")):
    session_dir = session_data_dir(x_session_id)
    chunks = _load_session_chunks(session_dir)
    doc_names = {c["document"] for c in chunks}
    courses = {c.get("course", "General") for c in chunks}
    return ORJSONResponse({
        "status": "ok",
        "indexed_chunks": len(chunks),
        "indexed_documents": len(doc_names),
        "courses": len(courses),
    })
