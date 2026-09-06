#!/usr/bin/env python3
import contextlib, importlib.util, io, json, os, pathlib, plistlib, tempfile, unittest
from unittest import mock
spec=importlib.util.spec_from_file_location('export',pathlib.Path(__file__).with_name('prepare_open_source.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.base=pathlib.Path(self.tmp.name)
        self.root=self.base/'source'; self.root.mkdir(); self.original=module.ROOT; module.ROOT=self.root
        files={'README.md':'Synthetic source', 'Rivune.xcodeproj/project.pbxproj':'MARKETING_VERSION = 0.2; CURRENT_PROJECT_VERSION = 123;'}
        for name,data in files.items():
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(data)
        for name in ['Info-Mac.plist','Info-iOS.plist']:
            p=self.root/'Rivune'/name;p.parent.mkdir(exist_ok=True)
            p.write_bytes(plistlib.dumps({'RivuneAccount':{'Enabled':True,'URL':'https://example.supabase.co','PublishableKey':'public-example'}}))
        self.names=list(files)+['Rivune/Info-Mac.plist','Rivune/Info-iOS.plist']
        (self.root/'scripts').mkdir();self.manifest()
    def manifest(self):
        (self.root/'scripts/open_source_files.txt').write_text('\n'.join(self.names)+'\n')
    def tearDown(self): module.ROOT=self.original;self.tmp.cleanup()
    def run_export(self,name):
        with contextlib.redirect_stdout(io.StringIO()): module.prepare(self.base/name)
    def test_blank_account_and_deterministic_archive(self):
        self.run_export('one');self.run_export('two')
        self.assertEqual((self.base/'one.zip').read_bytes(),(self.base/'two.zip').read_bytes())
        account=plistlib.loads((self.base/'one/Rivune/Info-Mac.plist').read_bytes())['RivuneAccount']
        self.assertFalse(account['Enabled']);self.assertEqual(account['URL'],'');self.assertEqual(account['PublishableKey'],'')
        self.assertTrue(plistlib.loads((self.root/'Rivune/Info-Mac.plist').read_bytes())['RivuneAccount']['Enabled'])
    def test_secret_failure_is_redacted(self):
        canary='GOCSPX-'+'a'*30
        (self.root/'README.md').write_text(canary)
        with self.assertRaises(SystemExit) as error:self.run_export('blocked')
        self.assertNotIn(canary,str(error.exception));self.assertIn('OAuth secret',str(error.exception))
        self.assertFalse((self.base/'blocked.zip').exists())
        self.assertFalse((self.base/'blocked').exists())
    def test_unlisted_private_file_excluded(self):
        (self.root/'history.json').write_text('private fixture')
        self.run_export('clean');self.assertFalse((self.base/'clean/history.json').exists())
    def test_symlink_rejected(self):
        (self.root/'link.txt').symlink_to(self.root/'README.md');self.names.append('link.txt');self.manifest()
        with self.assertRaises(SystemExit): self.run_export('blocked')
    def test_missing_project_source_rejected(self):
        (self.root/'Rivune.xcodeproj/project.pbxproj').write_text('path = Missing.swift;')
        with self.assertRaises(SystemExit):self.run_export('blocked')

    def test_deterministic_across_umasks(self):
        old=os.umask(0o022)
        try:
            self.run_export('open')
            os.umask(0o077); self.run_export('restricted')
        finally: os.umask(old)
        self.assertEqual((self.base/'open.zip').read_bytes(),(self.base/'restricted.zip').read_bytes())
    def test_short_read_removes_partial_copy(self):
        original=pathlib.Path.read_bytes
        def short(path):
            if path==self.root/'README.md': return b'x'
            return original(path)
        with mock.patch.object(pathlib.Path,'read_bytes',short):
            with self.assertRaises(SystemExit): self.run_export('short')
        self.assertFalse((self.base/'short').exists())
    def test_write_mismatch_removes_partial_copy(self):
        original=pathlib.Path.write_bytes
        def corrupt(path,data):
            if path==self.base/'mismatch/README.md': return original(path,b'corrupt')
            return original(path,data)
        with mock.patch.object(pathlib.Path,'write_bytes',corrupt):
            with self.assertRaises(SystemExit):self.run_export('mismatch')
        self.assertFalse((self.base/'mismatch').exists())

    def test_competing_archive_survives_exclusive_acquisition(self):
        archive=self.base/'competing.zip'; original=pathlib.Path.open
        def compete(path,mode='r',*args,**kwargs):
            if path==archive and mode=='x+b':
                with original(path,'wb') as file:file.write(b'other invocation')
            return original(path,mode,*args,**kwargs)
        with mock.patch.object(pathlib.Path,'open',compete):
            with self.assertRaises(FileExistsError):self.run_export('competing')
        self.assertEqual(archive.read_bytes(),b'other invocation')
        self.assertFalse((self.base/'competing').exists())
    def test_competing_directory_survives_exclusive_acquisition(self):
        destination=self.base/'competing'; original=pathlib.Path.mkdir
        def compete(path,*args,**kwargs):
            if path==destination:
                original(path,*args,**kwargs)
                (path/'other.txt').write_text('other invocation')
            return original(path,*args,**kwargs)
        with mock.patch.object(pathlib.Path,'mkdir',compete):
            with self.assertRaises(FileExistsError):self.run_export('competing')
        self.assertEqual((destination/'other.txt').read_text(),'other invocation')
    def test_competing_checksum_survives_exclusive_acquisition(self):
        checksum=self.base/'competing.zip.sha256';original=pathlib.Path.open
        def compete(path,mode='r',*args,**kwargs):
            if path==checksum and mode=='x':
                with original(path,'w') as file:file.write('other invocation')
            return original(path,mode,*args,**kwargs)
        with mock.patch.object(pathlib.Path,'open',compete):
            with self.assertRaises(FileExistsError):self.run_export('competing')
        self.assertEqual(checksum.read_text(),'other invocation')
        self.assertFalse((self.base/'competing.zip').exists())

if __name__=='__main__':unittest.main()
