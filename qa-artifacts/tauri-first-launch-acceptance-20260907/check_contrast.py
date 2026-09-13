import json
from pathlib import Path

PAIRS = {
    "dark primary": ("#f7f8fb", "#090b10"),
    "dark muted": ("#bfc6d8", "#0c0f16"),
    "warning status": ("#ffe2ad", "#3c2c15"),
    "ready status": ("#caffdf", "#153326"),
    "focus ring on field": ("#a9bcff", "#0c0f16"),
    "light primary": ("#151824", "#eceef4"),
    "light sidebar": ("#1b1e29", "#e8eaf0"),
    "light field": ("#11141c", "#ffffff"),
}

def linear(channel):
    value = channel / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

def luminance(value):
    channels = [int(value[i:i + 2], 16) for i in (1, 3, 5)]
    return 0.2126 * linear(channels[0]) + 0.7152 * linear(channels[1]) + 0.0722 * linear(channels[2])

def ratio(foreground, background):
    high, low = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (high + 0.05) / (low + 0.05)

results = []
for name, (foreground, background) in PAIRS.items():
    value = ratio(foreground, background)
    threshold = 3.0 if name == "focus ring on field" else 4.5
    results.append({"name": name, "foreground": foreground, "background": background,
                    "ratio": round(value, 2), "threshold": threshold, "pass": value >= threshold})

output = {"schema": "rivune-first-launch-contrast/v1", "source": "bound-source/web/styles.css",
          "allPass": all(item["pass"] for item in results), "pairs": results,
          "limits": "Opaque declared color pairs only. Disabled-opacity composites and packaged WebView rendering remain manual checks."}
Path("evidence/CONTRAST.json").write_text(json.dumps(output, indent=2) + "\n")
if not output["allPass"]:
    raise SystemExit(1)
print("PASS", ", ".join(f"{item['name']} {item['ratio']}:1" for item in results))
