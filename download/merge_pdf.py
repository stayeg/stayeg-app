#!/usr/bin/env python3
"""Merge cover PDF + body PDF into final output with page normalization."""

from pypdf import PdfReader, PdfWriter, Transformation

A4_W, A4_H = 595.28, 841.89  # A4 in points

COVER_PDF = '/home/z/my-project/download/cover.pdf'
BODY_PDF = '/home/z/my-project/download/StayEg-CTO-Production-Review-body.pdf'
OUTPUT_PDF = '/home/z/my-project/download/StayEg-CTO-Production-Review.pdf'

def normalize_page_to_a4(page):
    """Scale a page to A4 if its dimensions don't match."""
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

def insert_cover(cover_pdf, body_pdf, output_pdf):
    """Insert cover as first page of body PDF -> single output file."""
    writer = PdfWriter()
    # Cover as page 1
    cover_page = PdfReader(cover_pdf).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    # Body pages follow
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({
        '/Title': 'StayEg Production Readiness Review',
        '/Author': 'CTO Review',
        '/Creator': 'Z.ai',
        '/Subject': 'CTO Production Readiness Review for StayEg Application'
    })
    with open(output_pdf, 'wb') as f:
        writer.write(f)
    print(f"Merged PDF: {output_pdf}")

if __name__ == '__main__':
    insert_cover(COVER_PDF, BODY_PDF, OUTPUT_PDF)
