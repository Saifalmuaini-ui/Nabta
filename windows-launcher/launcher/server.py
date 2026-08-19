"""
Nabta - local web server.

Serves the app over http://localhost so the browser will grant camera access
(getUserMedia is blocked on file:// URLs), then opens it in your default browser.

Uses only the Python standard library - nothing to pip install, no internet
needed. Python 3.7 or newer.

Run via START.bat, or directly:  python launcher/server.py
"""

import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.path.dirname(HERE), "app")

PORT_RANGE = range(3000, 3021)


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static handler that understands Next.js export URLs."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        """Map /verify and /verify/ to app/verify/index.html."""
        local = super().translate_path(path)

        if os.path.isdir(local):
            index = os.path.join(local, "index.html")
            if os.path.isfile(index):
                return index

        if not os.path.exists(local):
            for candidate in (local + ".html",
                              os.path.join(local, "index.html")):
                if os.path.isfile(candidate):
                    return candidate

        return local

    def send_head(self):
        # Unknown route -> serve the exported 404 page rather than a bare error.
        local = self.translate_path(self.path)
        if not os.path.exists(local):
            fallback = os.path.join(ROOT, "404.html")
            if os.path.isfile(fallback):
                try:
                    f = open(fallback, "rb")
                except OSError:
                    return super().send_head()
                size = os.fstat(f.fileno())[6]
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(size))
                self.end_headers()
                return f
        return super().send_head()

    def end_headers(self):
        # Hashed asset filenames make long caching safe; HTML must stay fresh.
        if self.path.startswith("/_next/static/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass  # keep the console clean


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def find_port():
    for port in PORT_RANGE:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(("127.0.0.1", port))
            s.close()
            return port
        except OSError:
            continue
    return None


def main():
    if not os.path.isdir(ROOT):
        print()
        print("  ERROR: could not find the 'app' folder next to this launcher.")
        print("  Make sure you extracted the whole ZIP, keeping folders together.")
        print()
        input("  Press Enter to close...")
        return 1

    port = find_port()
    if port is None:
        print()
        print("  ERROR: no free port available (tried 3000-3020).")
        print("  Close any other local servers and try again.")
        print()
        input("  Press Enter to close...")
        return 1

    url = "http://localhost:%d/" % port

    print()
    print("   NABTA")
    print("   Plant. Verify. Earn.")
    print()
    print("   Running at  %s" % url)
    print("   Served by   Python %d.%d" % sys.version_info[:2])
    print()
    print("   The app should open in your browser automatically.")
    print("   If it does not, copy the address above into your browser.")
    print()
    print("   KEEP THIS WINDOW OPEN while using the app.")
    print("   Press Ctrl+C (or close this window) to stop.")
    print()
    print("   " + "-" * 58)
    print()

    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    with Server(("127.0.0.1", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print()
            print("   Nabta stopped.")
            print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
