import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import summarize, present


class Phase1Tests(unittest.TestCase):
    def test_free_not_missing(self):
        self.assertTrue(present({'price': {'amount': 0}}, 'price'))
        self.assertFalse(present({'price': {'amount': None}}, 'price'))

    def test_latest_observation_replaces_old(self):
        data = {'schema_version': '1.0', 'attempts': [
            {'mode': 'detail', 'items': [{'id': 'x', 'description': None}]},
            {'mode': 'detail', 'items': [{'id': 'x', 'description': '본문'}]}]}
        result = summarize(data)
        self.assertEqual(result['detail']['unique_listings'], 1)
        self.assertEqual(result['detail']['field_presence']['description']['percent'], 100)
        self.assertIsNone(result['accuracy'])

    def test_unverified_not_zero_percent(self):
        result = summarize({'schema_version': '1.0', 'attempts': [{'mode': 'list', 'items': [], 'error': 'blocked'}]})
        self.assertIsNone(result['detail']['complete']['percent'])
        self.assertEqual(result['list']['page_errors'], 1)

    def test_invalid_schema(self):
        with self.assertRaises(ValueError):
            summarize({'schema_version': 'unknown', 'attempts': []})


if __name__ == '__main__':
    unittest.main()
