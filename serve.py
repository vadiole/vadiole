import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.exists(path):
            return super().send_head()
        if os.path.exists(path + ".html"):
            self.path = self.path.split("?")[0] + ".html"
            return super().send_head()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        return open("404.html", "rb")

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"http://localhost:{port}/")
http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
