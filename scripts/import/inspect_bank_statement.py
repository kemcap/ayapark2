"""Read-only structural/balance gate for the two known Yapi Kredi PDF layouts.

This intentionally does not return descriptions, identities or booking payloads.
A successful check is a source check, not authorization to post transactions.
"""
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import argparse
import json
import re
import subprocess

DATE = re.compile(r'^\s*\d{2}[./]\d{2}[./]\d{4}(?:\s|$)')
TIME = re.compile(r'\d{2}:\d{2}:\d{2}')
LEGACY_DATE = re.compile(r'^\s*(\d{2}\.\d{2}\.\d{4})\s')
MODERN_DATE = re.compile(r'^\s*(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2}:\d{2})\s')
LEGACY_TAIL = re.compile(r'(?<![\d.,-])(-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})\s+(\d+)\s*$')
MODERN_TAIL = re.compile(r'(?<![\d.,-])(-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}) TL\s+(-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}) TL\s*$')

@dataclass(frozen=True)
class Movement:
    date: str
    time: str
    cents: int
    balance_cents: int
    reference: str | None
    source_line: int


def inspect_text(text: str) -> dict:
    if len(text) > 20_000_000:
        raise ValueError('Extracted text exceeds inspection limit')
    legacy = 'Dekont No' in text and 'Valör' in text
    modern = 'İşlem Tutarı' in text and 'Tarih Aralığı' in text and 'Saat' in text
    if legacy == modern:
        raise ValueError('Unknown or ambiguous statement layout')
    movements = []
    for line_number, line in enumerate(text.splitlines(), 1):
        if not DATE.match(line):
            continue
        if not TIME.search(line):
            # Daily balance rows are not financial movements.
            if legacy and ('GÜNSONU BAKİYESİ' in line or 'AÇILIŞ BAKİYESİ' in line or 'KAPANIŞ BAKİYESİ' in line):
                continue
            raise ValueError(f'Unrecognized dated row at line {line_number}')
        head = (LEGACY_DATE if legacy else MODERN_DATE).match(line)
        tail = (LEGACY_TAIL if legacy else MODERN_TAIL).search(line)
        if not head or not tail or tail.start() < head.end():
            raise ValueError(f'Unrecognized movement at line {line_number}')
        try:
            date = datetime.strptime(head[1], '%d.%m.%Y' if legacy else '%d/%m/%Y').date().isoformat()
            if legacy:
                amount, clock, balance, reference = tail.groups()
                convert = lambda s: int(Decimal(s.replace(',', '')) * 100)
            else:
                amount, balance = tail.groups()
                clock, reference = head[2], None
                convert = lambda s: int(Decimal(s.replace('.', '').replace(',', '.')) * 100)
            datetime.strptime(clock, '%H:%M:%S')
            movements.append(Movement(date, clock, convert(amount), convert(balance), reference, line_number))
        except (ValueError, ArithmeticError) as error:
            raise ValueError(f'Invalid date, time or amount at line {line_number}') from error
    if not movements:
        raise ValueError('No movements found; image-only PDFs require a separate review')
    # New statements are printed newest first; reverse ties in printed order too.
    if modern:
        movements.reverse()
    order_errors = sum((a.date, a.time) > (b.date, b.time) for a, b in zip(movements, movements[1:]))
    mismatches = sum(a.balance_cents + b.cents != b.balance_cents for a, b in zip(movements, movements[1:]))
    identities = [(m.date, m.cents, m.reference) for m in movements if m.reference]
    return {
        'layout': 'legacy-reference' if legacy else 'modern-no-reference',
        'transactions': len(movements),
        'balance_transitions': len(movements) - 1,
        'balance_mismatches': mismatches,
        'chronology_errors': order_errors,
        'repeated_reference_identities': len(identities) - len(set(identities)),
        'missing_reference_rows': sum(m.reference is None for m in movements),
        'safe_to_continue_review': mismatches == 0 and order_errors == 0 and len(identities) == len(set(identities)),
        'posting_authorized': False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    args = parser.parse_args()
    if not args.pdf.is_file() or args.pdf.stat().st_size > 50_000_000:
        parser.error('Expected a PDF smaller than 50 MB')
    with args.pdf.open('rb') as source:
        if source.read(5) != b'%PDF-':
            parser.error('Expected a PDF file')
    try:
        result = subprocess.run(['pdftotext', '-layout', '-enc', 'UTF-8', str(args.pdf.resolve()), '-'], check=True, capture_output=True, timeout=45)
        report = inspect_text(result.stdout.decode('utf-8'))
    except (OSError, subprocess.SubprocessError, ValueError) as error:
        # Do not log pdftotext output, which may contain account or identity data.
        print(json.dumps({'error': type(error).__name__, 'inspection_complete': False}))
        return 2
    print(json.dumps(report))
    return 0 if report['safe_to_continue_review'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
