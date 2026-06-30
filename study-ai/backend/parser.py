import shutil
from pathlib import Path


def parse_to_markdown(input_path: Path, output_path: Path) -> str:
    input_path = Path(input_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    ext = input_path.suffix.lower()

    if ext == ".md":
        md = input_path.read_text(encoding="utf-8")
        output_path.write_text(md, encoding="utf-8")
        return md

    if ext == ".txt":
        text = input_path.read_text(encoding="utf-8")
        output_path.write_text(text, encoding="utf-8")
        return text

    # .pdf, .docx, .pptx — use Docling
    from docling.document_converter import DocumentConverter
    converter = DocumentConverter()
    result = converter.convert(str(input_path))
    md = result.document.export_to_markdown()
    output_path.write_text(md, encoding="utf-8")
    return md
