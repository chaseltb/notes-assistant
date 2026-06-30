import pickle
from pathlib import Path
from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


def build_index(chunks: list[dict], index_path: Path) -> None:
    corpus = [_tokenize(c["text"]) for c in chunks]
    bm25 = BM25Okapi(corpus)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    with open(index_path, "wb") as f:
        pickle.dump({"bm25": bm25, "chunks": chunks}, f)


def load_index(index_path: Path) -> tuple:
    if not index_path.exists():
        return None, []
    with open(index_path, "rb") as f:
        data = pickle.load(f)
    return data["bm25"], data["chunks"]


def search(question: str, bm25: BM25Okapi, chunks: list[dict], top_k: int = 8) -> list[dict]:
    if bm25 is None or not chunks:
        return []
    tokens = _tokenize(question)
    scores = bm25.get_scores(tokens)
    indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]
    top_indices = {i for i, _ in indexed}

    neighbor_indices = set()
    for i in top_indices:
        if i > 0:
            neighbor_indices.add(i - 1)
        if i < len(chunks) - 1:
            neighbor_indices.add(i + 1)

    all_indices = top_indices | neighbor_indices

    seen_ids = set()
    result = []
    for i in sorted(all_indices):
        chunk = chunks[i]
        if chunk["id"] not in seen_ids:
            seen_ids.add(chunk["id"])
            result.append(chunk)

    result.sort(key=lambda c: c["id"])
    return result
