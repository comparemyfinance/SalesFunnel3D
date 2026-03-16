from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
print(f"Serving {ROOT} at http://localhost:{PORT}")
ThreadingHTTPServer(("0.0.0.0", PORT), SimpleHTTPRequestHandler).serve_forever()
