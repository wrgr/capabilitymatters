"""Verify public transcript export preserves dialogue while excluding private runtime content."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from export_mediation_transcript import public_record


class TranscriptTest(unittest.TestCase):
    """Test selective retention rather than fabricate an agent execution."""

    def test_private_runtime_excluded(self) -> None:
        """Exclude reasoning and system/developer instructions."""
        for payload in [{'type': 'reasoning', 'content': 'private'},
                        {'type': 'message', 'role': 'developer', 'content': 'private'}]:
            self.assertIsNone(public_record({'type': 'response_item', 'payload': payload}))

    def test_public_prompt_and_tool_retained(self) -> None:
        """Preserve exact public content without account passthrough metadata."""
        for kind in ['agent_message', 'custom_tool_call', 'custom_tool_call_output']:
            row = {'timestamp': 'time', 'type': 'response_item',
                   'payload': {'type': kind, 'content': 'exact\ntext',
                               'internal_chat_message_metadata_passthrough': 'excluded'}}
            result = public_record(row)
            self.assertEqual(result['payload']['content'], 'exact\ntext')
            self.assertNotIn('internal_chat_message_metadata_passthrough', result['payload'])


if __name__ == '__main__':
    unittest.main()
