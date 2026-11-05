"""Test freeze and release invariants that protect live-agent evidence integrity."""
import importlib.util
import tempfile
import unittest
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'authenticated_mediation.py'
sys.path.insert(0, str(MODULE.parent))
SPEC = importlib.util.spec_from_file_location('mediation', MODULE)
MEDIATION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MEDIATION)


class EvidenceTest(unittest.TestCase):
    """Exercise tampering and failed signoff rather than model behavior."""

    def setUp(self) -> None:
        """Create a minimal team-endorsed synthetic artifact."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        m = MEDIATION
        m.write_new(self.folder / 'spec.json', {'case_id': 'x', 'budget': 1,
                    'core': ['a', 'b'], 'roles': {'a': {}, 'b': {}}})
        m.write_new(self.folder / 'draft.json', {'case_id': 'x', 'budget_spent': 1,
                    'actions': [{'cost': 1, 'owner': 'a', 'source_messages': ['m1']}]})
        for actor in ['a', 'b']:
            m.write_new(self.folder / 'responses' / f'{actor}.json', {
                'message_id': 'm1', 'actor': actor, 'endorsed': True,
                'artifact_sha256': m.digest((self.folder / 'draft.json').read_bytes())})
        m.write_new(self.folder / 'sealed-events.json', {'events': []})

    def seal(self) -> None:
        """Freeze the test artifact with both team endorsements."""
        MEDIATION.freeze(self.folder, self.folder / 'draft.json', ['a.json', 'b.json'])

    def test_missing_and_stale_endorsements(self) -> None:
        """Reject draft changes after signoff."""
        with self.assertRaises(AssertionError):
            MEDIATION.freeze(self.folder, self.folder / 'draft.json', ['a.json'])
        with (self.folder / 'draft.json').open('a') as handle:
            handle.write(' ')
        with self.assertRaisesRegex(AssertionError, 'endorsed exactly'):
            self.seal()

    def test_freeze_tampering_and_event_tampering(self) -> None:
        """Reject post-freeze event changes before deployment."""
        self.seal()
        with (self.folder / 'sealed-events.json').open('a') as handle:
            handle.write(' ')
        with self.assertRaises(AssertionError):
            MEDIATION.reveal(self.folder)

    def test_write_once(self) -> None:
        """Prevent silently overwriting retained failures or approvals."""
        self.seal()
        with self.assertRaises(FileExistsError):
            self.seal()


if __name__ == '__main__':
    unittest.main()
