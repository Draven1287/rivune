"""Capture one explicitly selected test turn; never write app history or site files."""
import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("conversation_id")
parser.add_argument("turn_id")
parser.add_argument("--site", type=Path)
parser.add_argument("--output", type=Path)
args = parser.parse_args()
output = args.output or Path(__file__).resolve().parent / "evidence"
output.mkdir(exist_ok=True, parents=True)
history = Path.home() / "Library/Application Support/Rivune/conversations.json"
conversation = next(c for c in json.loads(history.read_text()) if c["id"] == args.conversation_id)
turn = next(t for t in conversation["turns"] if t["id"] == args.turn_id)
output.joinpath("turn.json").write_text(json.dumps(turn, indent=2) + "\n")
trace = turn.get("togetherTrace") or {}
for key in ("proposedPlan", "reviewedPlan", "sharedPlan", "chatGPTRawContribution", "claudeRawContribution", "chatGPTRawReview", "claudeRawReview", "chatGPTReview", "claudeReview"):
    if trace.get(key):
        output.joinpath(key + ".md").write_text(trace[key])
for key in ("chatGPTAnswer", "claudeAnswer", "combinedAnswer"):
    answer = turn.get(key) or {}
    if answer.get("content"):
        output.joinpath(key + ".md").write_text(answer["content"])
status = {
    "capturedAt": datetime.now().astimezone().isoformat(),
    "conversationID": args.conversation_id,
    "turnID": args.turn_id,
    "state": turn.get("executionState"),
    "phase": trace.get("phase"),
    "answerBytes": {key: len((turn.get(key) or {}).get("content", "").encode())
                    for key in ("chatGPTAnswer", "claudeAnswer", "combinedAnswer")},
    "errors": {key: value for key, value in turn.items() if "error" in key.lower()},
    "files": [],
}
answer = (turn.get("combinedAnswer") or {}).get("content", "").strip()
if answer:
    try:
        candidates = [answer] if answer.startswith("{") else re.findall(
            r"^```json[ \t]*\r?\n(.*?)^```[ \t]*$", answer, re.M | re.S)
        if len(candidates) != 1:
            raise ValueError("Expected one complete artifact manifest")
        manifest = json.loads(candidates[0])
        output.joinpath("manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        seen = set()
        for file in manifest["files"]:
            path = Path(file["path"])
            if path.is_absolute() or any(p in (".", "..") or p.startswith(".") for p in path.parts):
                raise ValueError("Unsafe path in final manifest")
            if str(path).casefold() in seen:
                raise ValueError("Duplicate path in final manifest")
            seen.add(str(path).casefold())
            data = file["content"].encode()
            item = {"path": str(path), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
            if args.site:
                target = args.site / path
                if not target.resolve().is_relative_to(args.site.resolve()):
                    raise ValueError("Site path resolves outside selected folder")
                item["existsOnDisk"] = target.is_file()
                item["exactMatchOnDisk"] = target.is_file() and target.read_bytes() == data
            status["files"].append(item)
    except (KeyError, TypeError, ValueError) as error:
        status["artifactError"] = str(error)
output.joinpath("status.json").write_text(json.dumps(status, indent=2) + "\n")
print(json.dumps(status, indent=2))
