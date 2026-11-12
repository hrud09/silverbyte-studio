#!/usr/bin/env python3
"""Local dev server that mirrors GitHub Pages clean URLs.

    python3 scripts/serve.py [port]      (default 8765)

/business serves business.html, the same way the live site does. Plain
`python -m http.server` returns 404 for those links.
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        parts = urlsplit(self.path)
        path = parts.path
        local = self.translate_path(path)
        if not os.path.exists(local) and not path.endswith('/'):
            if os.path.isfile(local + '.html'):
                self.path = path + '.html' + (f'?{parts.query}' if parts.query else '')
        return super().send_head()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(CleanUrlHandler, directory=ROOT)
    print(f'Serving {ROOT} at http://localhost:{port}')
    ThreadingHTTPServer(('', port), handler).serve_forever()
