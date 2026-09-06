#!/usr/bin/env python3
"""Set public updater metadata before signing. Never handles a private key."""
import base64
import os
import plistlib
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

path = Path(sys.argv[1])
feed = os.environ['RIVUNE_UPDATE_FEED_URL']
key = os.environ['RIVUNE_UPDATE_PUBLIC_KEY']
team = os.environ['RIVUNE_UPDATE_TEAM_ID']
url = urlparse(feed)
if url.scheme != 'https' or not url.hostname or url.username or url.password or url.fragment:
    raise SystemExit('Update feed must be an HTTPS URL without credentials or fragment.')
if len(base64.b64decode(key, validate=True)) != 32 or not re.fullmatch(r'[A-Z0-9]{10}', team):
    raise SystemExit('Invalid public update key or Developer ID team.')
info = plistlib.loads(path.read_bytes())
info.update(RivuneDistribution='developer-id', SUFeedURL=feed, SUPublicEDKey=key, RivuneUpdateTeamID=team)
path.write_bytes(plistlib.dumps(info))
