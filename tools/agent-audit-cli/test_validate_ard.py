import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from validate_ard import validate_ard_catalog


class TestValidateArdCatalog(unittest.TestCase):
    def test_rejects_missing_spec_version_and_bad_urn(self):
        errors = validate_ard_catalog({
            "entries": [{"identifier": "bad-id", "displayName": "X", "type": "application/json"}]
        })
        self.assertTrue(any("specVersion" in e for e in errors))
        self.assertTrue(any("urn:air:" in e for e in errors))
        self.assertTrue(any("url o data" in e for e in errors))

    def test_rejects_non_dict_root_and_empty_entries(self):
        root_errors = validate_ard_catalog([])  # type: ignore[arg-type]
        self.assertTrue(any("oggetto" in e for e in root_errors))

        empty_errors = validate_ard_catalog({"specVersion": "1.0.0", "entries": []})
        self.assertTrue(any("entries" in e for e in empty_errors))

    def test_accepts_inline_data_and_rejects_bad_queries_and_media_type(self):
        valid_inline = validate_ard_catalog({
            "specVersion": "1.0.0",
            "entries": [
                {
                    "identifier": "urn:air:progettosiliceo:tools:inline-card",
                    "displayName": "Inline Card",
                    "type": "application/mcp-server-card+json",
                    "data": {"name": "inline-tool"},
                    "representativeQueries": ["Verifica schema inline"],
                }
            ],
        })
        self.assertEqual(valid_inline, [])

        invalid_entry = validate_ard_catalog({
            "specVersion": "1.0.0",
            "entries": [
                {
                    "identifier": "urn:air:progettosiliceo:tools:bad-fields",
                    "displayName": "",
                    "type": "invalidmediatype",
                    "url": "http://insecure.example.com",
                    "representativeQueries": [123],
                }
            ],
        })
        self.assertTrue(any("displayName" in e for e in invalid_entry))
        self.assertTrue(any("media type" in e for e in invalid_entry))
        self.assertTrue(any("url o data" in e for e in invalid_entry))
        self.assertTrue(any("representativeQueries" in e for e in invalid_entry))

    def test_validates_repo_ai_catalog_json(self):
        catalog_path = Path(__file__).resolve().parents[2] / "ai-catalog.json"
        data = json.loads(catalog_path.read_text(encoding="utf-8"))
        errors = validate_ard_catalog(data)
        self.assertEqual(errors, [])

    def test_cli_exit_codes(self):
        script_path = Path(__file__).resolve().parent / "validate_ard.py"
        catalog_path = Path(__file__).resolve().parents[2] / "ai-catalog.json"

        ok_proc = subprocess.run(
            [sys.executable, str(script_path), str(catalog_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(ok_proc.returncode, 0)
        self.assertIn("OK:", ok_proc.stdout)

        usage_proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(usage_proc.returncode, 2)

        with tempfile.TemporaryDirectory() as tmpdir:
            bad_path = Path(tmpdir) / "bad.json"
            bad_path.write_text('{"entries": []}', encoding="utf-8")
            bad_proc = subprocess.run(
                [sys.executable, str(script_path), str(bad_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(bad_proc.returncode, 1)
            self.assertIn("ERROR:", bad_proc.stderr)

            malformed_path = Path(tmpdir) / "malformed.json"
            malformed_path.write_text("{not json", encoding="utf-8")
            malformed_proc = subprocess.run(
                [sys.executable, str(script_path), str(malformed_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(malformed_proc.returncode, 1)
            self.assertIn("ERROR:", malformed_proc.stderr)


if __name__ == "__main__":
    unittest.main()
