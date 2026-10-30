import importlib.util
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location('bank_statement_inspector', Path(__file__).parents[1] / 'scripts/import/inspect_bank_statement.py')
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
inspect = module.inspect_text
LEGACY = 'Tarih Valör Açıklama İşlem Tutarı İşlem Saati Bakiye Dekont No\n'
MODERN = 'Tarih Aralığı\nTarih Saat İşlem Açıklama İşlem Tutarı Bakiye\n'
old1 = '01.10.2026 01.10.2026 Synthetic receipt 100.00 10:00:00 1,100.00 9000000001\n'
old2 = '02.10.2026 02.10.2026 Synthetic fee -2.50 10:00:00 1,097.50 9000000002\n'
new1 = '02/10/2026 10:00:00 Diğer Synthetic fee -2,50 TL 1.097,50 TL\n'
new2 = '01/10/2026 10:00:00 Diğer Synthetic receipt 100,00 TL 1.100,00 TL\n'

class InspectionTests(unittest.TestCase):
    def test_legacy_references_and_fee_direction(self):
        r = inspect(LEGACY + old1 + old2)
        self.assertTrue(r['safe_to_continue_review'])
        self.assertEqual(r['transactions'], 2)
        self.assertEqual(r['missing_reference_rows'], 0)
        self.assertFalse(r['posting_authorized'])

    def test_modern_reversed_chronology_and_missing_references(self):
        r = inspect(MODERN + new1 + new2)
        self.assertTrue(r['safe_to_continue_review'])
        self.assertEqual(r['missing_reference_rows'], 2)
        self.assertEqual(r['balance_transitions'], 1)

    def test_same_second_rows_reverse_in_printed_order(self):
        s = MODERN + new1 + new2.replace('01/10/2026', '02/10/2026')
        self.assertTrue(inspect(s)['safe_to_continue_review'])

    def test_balance_mismatch_blocks_review_gate(self):
        r = inspect(LEGACY + old1 + old2.replace('1,097.50', '1,097.51'))
        self.assertEqual(r['balance_mismatches'], 1)
        self.assertFalse(r['safe_to_continue_review'])

    def test_daily_opening_closing_lines_are_not_transactions(self):
        r = inspect(LEGACY + old1 + '01.10.2026 GÜNSONU BAKİYESİ KULL: 1,100.00\n' + old2 + '02.10.2026 KAPANIŞ BAKİYESİ KULL: 1,097.50\n')
        self.assertEqual(r['transactions'], 2)

    def test_unrecognized_dated_row_cannot_be_silently_omitted(self):
        with self.assertRaisesRegex(ValueError, 'Unrecognized'):
            inspect(LEGACY + old1 + '03.10.2026 damaged transaction\n')

    def test_malformed_grouping_cannot_match_a_partial_amount(self):
        with self.assertRaisesRegex(ValueError, 'Unrecognized'):
            inspect(LEGACY + old1.replace('100.00 10:', '1,00.00 10:'))

    def test_invalid_calendar_date_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Invalid date'):
            inspect(LEGACY + old1.replace('01.10.2026', '31.02.2026'))

    def test_repeated_reference_is_flagged(self):
        r = inspect(LEGACY + old1 + old1)
        self.assertEqual(r['repeated_reference_identities'], 1)
        self.assertFalse(r['safe_to_continue_review'])

    def test_unknown_ambiguous_and_image_only_sources_fail_closed(self):
        for source in ['image only', LEGACY + MODERN + old1, LEGACY]:
            with self.subTest(source=source):
                with self.assertRaises(ValueError):
                    inspect(source)

    def test_summary_does_not_return_account_reference_or_amounts(self):
        r = inspect(LEGACY + old1 + old2)
        serialized = str(r)
        self.assertNotIn('9000000001', serialized)
        self.assertNotIn('1,100.00', serialized)
        self.assertNotIn('Synthetic receipt', serialized)
        self.assertNotIn('movements', r)

if __name__ == '__main__':
    unittest.main()
