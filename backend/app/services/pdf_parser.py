from __future__ import annotations

from pathlib import Path

import fitz


def extract_pdf_pages(path: Path) -> list[tuple[int, str]]:
    doc = fitz.open(path)
    pages: list[tuple[int, str]] = []
    try:
        for page_index, page in enumerate(doc, start=1):
            pages.append((page_index, page.get_text("text")))
    finally:
        doc.close()
    return pages

