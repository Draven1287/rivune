"""Capture only this authorized Rivune test; never modify app history."""
import json
from datetime import datetime
from pathlib import Path

CONVERSATION_ID = "92CCDD8C-1A3E-4CF9-B924-A80017B0C01C"
root = Path(__file__).resolve().parent
history = Path.home() / "Library/Application Support/Rivune/conversations.json"
conversation = next(c for c in json.loads(history.read_text()) if c["id"] == CONVERSATION_ID)
turn = conversation["turns"][-1]
root.joinpath("conversation.json").write_text(json.dumps(conversation, indent=2))
trace = turn.get("togetherTrace", {})
for key in ("sharedPlan", "chatGPTReview", "claudeReview"):
    if trace.get(key):
        root.joinpath(key + ".md").write_text(trace[key])
for key in ("chatGPTAnswer", "claudeAnswer", "combinedAnswer"):
    if turn.get(key, {}).get("content"):
        root.joinpath(key + ".md").write_text(turn[key]["content"])
status = {
    "capturedAt": datetime.now().astimezone().isoformat(),
    "state": turn.get("executionState"),
    "phase": trace.get("phase"),
    "answerLengths": {k: len(turn.get(k, {}).get("content", "")) for k in ("chatGPTAnswer", "claudeAnswer", "combinedAnswer")},
    "errors": {k: v for k, v in turn.items() if "error" in k.lower()},
}
root.joinpath("latest-status.json").write_text(json.dumps(status, indent=2))
print(json.dumps(status, indent=2))
