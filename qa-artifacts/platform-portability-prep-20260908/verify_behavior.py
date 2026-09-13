from pathlib import Path
from tempfile import TemporaryDirectory

SAFE_WINDOWS_NAMES = ("{name}.exe", "{name}.com")


def discover(directories, platform):
    found = []
    for provider, name in (("codex", "codex"), ("claude", "claude")):
        candidates = ((name,) if platform == "posix" else tuple(
            pattern.format(name=name) for pattern in SAFE_WINDOWS_NAMES
        ))
        for directory in directories:
            match = next((directory / candidate for candidate in candidates
                          if (directory / candidate).is_file()), None)
            if match is not None:
                found.append((provider, match))
                break
    return found


def touch(path):
    path.write_bytes(b"not executed")


with TemporaryDirectory(prefix="rivune-portability-") as root:
    root = Path(root)
    spaced = root / "provider tools with spaces"
    spaced.mkdir()
    touch(spaced / "codex.com")
    for suffix in ("cmd", "bat", "ps1"):
        touch(spaced / f"claude.{suffix}")
    assert discover([spaced], "windows") == [("codex", spaced / "codex.com")]

    first, second = root / "first", root / "second"
    first.mkdir()
    second.mkdir()
    touch(first / "codex.com")
    touch(second / "codex.exe")
    touch(first / "claude.com")
    touch(first / "claude.exe")
    assert discover([first, second], "windows") == [
        ("codex", first / "codex.com"),
        ("claude", first / "claude.exe"),
    ]

    posix = root / "posix"
    posix.mkdir()
    touch(posix / "codex")
    touch(posix / "claude.exe")
    assert discover([posix], "posix") == [("codex", posix / "codex")]

print("PASS: 3 deterministic discovery scenarios; no executable was launched")
