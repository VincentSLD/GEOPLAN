"""
Proxy local pour les appels Webfleet.connect API (contourne le CORS)
Lancer : python proxy_webfleet.py
Le proxy écoute sur http://localhost:8889
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode
import requests
import json

# ═══ IDENTIFIANTS WEBFLEET — À REMPLIR ═══
WEBFLEET_ACCOUNT  = "gph284"
WEBFLEET_USERNAME = "admin"
WEBFLEET_PASSWORD = "123456"
WEBFLEET_APIKEY   = "9321614f-5839-4f13-9287-c206ffae92ad"
# ═══════════════════════════════════════════

WEBFLEET_BASE = "https://csv.business.tomtom.com/extern"

class WebfleetHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        # Le frontend envoie /action=showObjectReportExtern&...
        # On construit l'URL complète avec les credentials
        path = self.path.lstrip('/')

        # Extraire l'action et les params depuis le path
        params = {}
        if '?' in path:
            path, qs = path.split('?', 1)
            for part in qs.split('&'):
                if '=' in part:
                    k, v = part.split('=', 1)
                    params[k] = v

        # Si le path contient l'action directement
        if path and 'action' not in params:
            params['action'] = path

        # Ajouter les credentials et options de format
        params.update({
            'account': WEBFLEET_ACCOUNT,
            'username': WEBFLEET_USERNAME,
            'password': WEBFLEET_PASSWORD,
            'apikey': WEBFLEET_APIKEY,
            'outputformat': 'json',
            'lang': 'fr',
            'useISO8601': 'true',
            'useUTF8': 'true',
        })

        url = WEBFLEET_BASE + '?' + urlencode(params)
        print(f"[WEBFLEET] GET {params.get('action', '?')}")

        try:
            r = requests.get(url, timeout=30)
            print(f"[WEBFLEET] Response: {r.status_code} ({len(r.content)} bytes)")

            self.send_response(r.status_code)
            self._cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()

            # Webfleet peut renvoyer du JSON ou du CSV selon les cas
            # On essaie de parser le JSON, sinon on renvoie tel quel
            content = r.content
            try:
                # Vérifier que c'est du JSON valide
                json.loads(content)
            except (json.JSONDecodeError, ValueError):
                # Si c'est du CSV ou texte d'erreur, l'emballer en JSON
                text = content.decode('utf-8', errors='replace')
                content = json.dumps({"raw": text, "error": "non-json response"}).encode('utf-8')

            self.wfile.write(content)

        except Exception as e:
            print(f"[WEBFLEET] Error: {e}")
            self.send_response(502)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    port = 8889
    server = HTTPServer(('localhost', port), WebfleetHandler)
    print(f"=== Proxy Webfleet démarré sur http://localhost:{port} ===")
    print(f"=== Cible: {WEBFLEET_BASE} ===")
    if WEBFLEET_ACCOUNT == "VOTRE_COMPTE":
        print("⚠  ATTENTION: Identifiants non configurés ! Éditez proxy_webfleet.py")
    print("Appuyez Ctrl+C pour arrêter")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nProxy arrêté.")
