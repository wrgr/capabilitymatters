"""Test rejection of undeclared expertise and evidence rather than simulate professional speech."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mediation_knowledge_gate import check_claims


class KnowledgeGateTest(unittest.TestCase):
    """Exercise clear permission boundaries and attribution requirements."""

    def check(self, scope: str, standing: str, basis: list[str]) -> None:
        """Apply a minimal analyst permission profile."""
        check_claims({'claims': [{'competency': scope, 'standing': standing, 'basis': basis}]},
                     {'competencies': ['measurement']}, {'E1'}, {'expert-01'})

    def test_specialist_scope_denied(self) -> None:
        """Block a declared specialist claim outside the assigned role."""
        with self.assertRaisesRegex(AssertionError, 'scope denied'):
            self.check('safety certification', 'role_judgment', ['E1'])

    def test_unknown_evidence_denied(self) -> None:
        """Reject an inaccessible evidence identifier."""
        with self.assertRaisesRegex(AssertionError, 'Unknown claim basis'):
            self.check('measurement', 'supplied_fact', ['PRIVATE-OTHER'])

    def test_hypothesis_cannot_be_promoted(self) -> None:
        """Keep unsupplied knowledge from being labeled an established fact."""
        with self.assertRaisesRegex(AssertionError, 'Hypothesis presented'):
            self.check('hypothesis', 'supplied_fact', ['E1'])
        self.check('hypothesis', 'hypothesis', ['public.brief'])

    def test_consultant_attribution_required(self) -> None:
        """Require an actual delivered message for specialist advice."""
        with self.assertRaisesRegex(AssertionError, 'Unattributed'):
            self.check('attributed_advice', 'attributed_advice', ['E1'])
        self.check('attributed_advice', 'attributed_advice', ['expert-01'])

    def test_cautious_scope_allows_actual_attribution(self) -> None:
        """Accept sourced advice without granting the receiving role specialist competence."""
        self.check('hypothesis', 'attributed_advice', ['expert-01'])
        with self.assertRaisesRegex(AssertionError, 'Unattributed'):
            self.check('hypothesis', 'attributed_advice', ['E1'])
        with self.assertRaisesRegex(AssertionError, 'Attribution standing required'):
            self.check('attributed_advice', 'role_judgment', ['expert-01'])


if __name__ == '__main__':
    unittest.main()
