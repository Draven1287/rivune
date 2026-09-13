"""Run only this host-free Rust crate with the workspace-local toolchain."""
from pathlib import Path
import os, subprocess, json, hashlib, sys
crate = Path(__file__).resolve().parent
workspace = crate.parents[2]
env = dict(os.environ)
env["CARGO_HOME"] = str(workspace / ".toolchains/cargo")
env["RUSTUP_HOME"] = str(workspace / ".toolchains/rustup")
env["PATH"] = str(workspace / ".toolchains/cargo/bin") + os.pathsep + env.get("PATH", "")
env["CARGO_TARGET_DIR"] = str(crate / "target")
commands = [["cargo", "--version"], ["rustc", "-vV"], ["cargo", "test", *sys.argv[1:]]]
files = ["Cargo.toml", "src/lib.rs", "tests/preview.rs"]
if (crate / "Cargo.lock").exists(): files.append("Cargo.lock")
inputs = [crate / name for name in files] + sorted((crate.parent / "fixtures").glob("*.json"))
def source_hashes():
    return {str(path.relative_to(crate.parent)):hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}
before = source_hashes()
results = []
for command in commands:
    result = subprocess.run(command, cwd=crate, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    results.append({"command":command,"exit_code":result.returncode,"output":result.stdout})
    print(result.stdout, end="", flush=True)
    if result.returncode: break
after = source_hashes()
unchanged = before == after
receipt = {"scope":"Isolated import preview crate only; no app launch or provider requests", "results":results, "source_hashes":after, "inputs_unchanged_during_execution":unchanged}
(crate / "TEST_EXECUTION.json").write_text(json.dumps(receipt, indent=2) + "\n")
sys.exit(results[-1]["exit_code"] if unchanged else 1)
