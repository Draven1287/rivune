"""Compile pure production appearance policy and test legacy preservation without defaults/UI."""
import hashlib
import subprocess
import tempfile
from pathlib import Path

source = Path('Rivune/Theme.swift').read_text()
start = source.index('// BEGIN Rivune appearance preference policy')
end = source.index('// END Rivune appearance preference policy.')
policy = source[start:end]
checks = r'''
@main struct AppearancePolicyChecks {
 static func main() {
  var count = 0
  func check(_ passed: Bool, _ name: String) {
   precondition(passed, name)
   count += 1
  }
  for raw: String? in [nil, "", "future-preset", "GRAPHITE"] {
   for galaxy in [false, true] {
    for stars in [false, true] {
     for dim in [-0.2, 0, 0.35, 1.2] {
      let resolved = RivuneAppearancePolicy.configuration(rawPreset: raw, galaxy: galaxy, stars: stars, dim: dim, presetStars: !stars, presetDim: 0.8)
      check(resolved.preset == nil && resolved.galaxy == galaxy && resolved.stars == stars && resolved.dim == dim, "Absent/unknown key must preserve exact legacy values")
     }
    }
   }
  }
  let legacyNan = RivuneAppearancePolicy.configuration(rawPreset: nil, galaxy: false, stars: true, dim: .nan)
  check(legacyNan.dim.isNaN, "Legacy resolution does not rewrite even an invalid old dim")
  for preset in RivuneBackgroundPreset.allCases {
   let value = RivuneAppearancePolicy.configuration(rawPreset: preset.rawValue, galaxy: false, stars: true, dim: 0.5)
   check(value.preset == preset && value.galaxy == (preset == .cosmos) && value.stars == (preset == .cosmos), "Preset texture/quietness policy")
   check(value.dim == 0.5, "Within-range legacy brightness reused without new setting")
  }
  let customized = RivuneAppearancePolicy.configuration(rawPreset: "cosmos", galaxy: false, stars: false, dim: 0.62, presetStars: true, presetDim: 0.2)
  check(customized.galaxy && customized.stars && customized.dim == 0.3, "Preset overrides independent; brightness bounded")
  let restored = RivuneAppearancePolicy.configuration(rawPreset: "", galaxy: false, stars: false, dim: 0.62, presetStars: true, presetDim: 0.2)
  check(!restored.galaxy && !restored.stars && restored.dim == 0.62, "Restore ignores separate preset customization")
  check(RivuneAppearancePolicy.configuration(rawPreset: "orbit", galaxy: true, stars: true, dim: 0.1).dim == 0.3, "Restrained bright boundary")
  check(RivuneAppearancePolicy.configuration(rawPreset: "orbit", galaxy: true, stars: true, dim: 1.4).dim == 0.85, "Restrained dark boundary")
  check(RivuneAppearancePolicy.configuration(rawPreset: "orbit", galaxy: true, stars: true, dim: .infinity).dim == 0.35, "Finite fallback for new preset")
  check(RivuneBackgroundPreset.allCases.map(\.rawValue) == ["graphite", "orbit", "cosmos"], "Persisted preset IDs")
  print("PASS: \(count) pure policy assertions; no defaults, UI or provider access.")
 }
}
'''
with tempfile.TemporaryDirectory(prefix='rivune-appearance-policy-') as directory:
    swift = Path(directory) / 'Policy.swift'
    executable = Path(directory) / 'checks'
    swift.write_text(policy + '\n' + checks)
    subprocess.run(['xcrun', 'swiftc', '-swift-version', '6', '-parse-as-library',
                    '-module-cache-path', str(Path(directory) / 'modules'),
                    str(swift), '-o', str(executable)], check=True)
    subprocess.run([str(executable)], check=True)
print('Policy source SHA256:', hashlib.sha256(policy.encode()).hexdigest())
