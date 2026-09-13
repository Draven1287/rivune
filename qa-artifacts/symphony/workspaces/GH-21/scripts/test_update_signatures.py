#!/usr/bin/env python3
"""Disposable offline signature tests using official Sparkle; no Keychain access."""
import argparse, base64, os, pathlib, subprocess, tempfile, zipfile
p=argparse.ArgumentParser();p.add_argument('--sparkle-bin', required=True);a=p.parse_args()
tool=str(pathlib.Path(a.sparkle_bin)/'sign_update')
with tempfile.TemporaryDirectory(prefix='rivune-update-synthetic-') as t:
    root=pathlib.Path(t)
    key=root/'disposable-key';key.write_bytes(base64.b64encode(os.urandom(32)));key.chmod(0o600)
    archive=root/'Synthetic.zip'
    with zipfile.ZipFile(archive,'w') as z:z.writestr('synthetic.txt','Disposable test payload; not an application.')
    signature=subprocess.check_output([tool,'--ed-key-file',str(key),'-p',str(archive)],text=True).strip()
    good=subprocess.run([tool,'--verify','--ed-key-file',str(key),str(archive),signature],capture_output=True)
    assert good.returncode==0,'Valid synthetic signature rejected'
    with archive.open('ab') as f:f.write(b'tampered')
    bad=subprocess.run([tool,'--verify','--ed-key-file',str(key),str(archive),signature],capture_output=True)
    assert bad.returncode!=0,'Tampered archive incorrectly accepted'
    print('PASS: valid EdDSA archive accepted; modified archive rejected.')
    print('Disposable key removed. No Keychain, network, feed publication, or app installation used.')
