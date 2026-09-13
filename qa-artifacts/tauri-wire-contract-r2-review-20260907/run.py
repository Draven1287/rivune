from pathlib import Path
import os,subprocess,sys
root=Path(__file__).resolve().parent;workspace=root.parents[1];env=dict(os.environ)
env["CARGO_HOME"]=str(workspace/".toolchains/cargo");env["RUSTUP_HOME"]=str(workspace/".toolchains/rustup");env["PATH"]=env["CARGO_HOME"]+"/bin:"+env.get("PATH","")
r=subprocess.run(["cargo","run","--offline","--quiet"],cwd=root,env=env,capture_output=True,text=True)
(root/"BUILD.log").write_text(r.stderr);print(r.stderr[-1200:])
if r.returncode:sys.exit(r.returncode)
(root/"RUST_WIRE.json").write_text(r.stdout)
