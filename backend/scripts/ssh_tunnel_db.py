"""Túnel SSH local → PostgreSQL en el VPS. Uso: DEPLOY_SSH_PASS=... python scripts/ssh_tunnel_db.py"""
import os
import select
import socket
import sys
import threading
import time

import paramiko

HOST = "45.236.130.10"
PORT = 20213
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASS")
LOCAL_PORT = int(os.environ.get("SSH_TUNNEL_LOCAL_PORT", "5432"))
REMOTE_HOST = "127.0.0.1"
REMOTE_PORT = 5432

if not PASSWORD:
    sys.exit("Falta DEPLOY_SSH_PASS en el entorno")


def _forward(local_sock: socket.socket, transport: paramiko.Transport) -> None:
    try:
        chan = transport.open_channel("direct-tcpip", (REMOTE_HOST, REMOTE_PORT), local_sock.getpeername())
    except Exception:
        local_sock.close()
        return

    def relay(src, dst):
        try:
            while True:
                r, _, _ = select.select([src], [], [], 1)
                if not r:
                    continue
                data = src.recv(4096)
                if not data:
                    break
                dst.sendall(data)
        except Exception:
            pass
        finally:
            try:
                src.close()
            except Exception:
                pass
            try:
                dst.close()
            except Exception:
                pass

    threading.Thread(target=relay, args=(local_sock, chan), daemon=True).start()
    threading.Thread(target=relay, args=(chan, local_sock), daemon=True).start()


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    transport = client.get_transport()
    if transport is None:
        sys.exit("No se pudo abrir transporte SSH")

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", LOCAL_PORT))
    server.listen(32)
    print(f"Tunnel activo: 127.0.0.1:{LOCAL_PORT} -> {HOST}:{REMOTE_PORT} (Ctrl+C para cerrar)", flush=True)

    try:
        while True:
            try:
                local_sock, _ = server.accept()
            except OSError:
                break
            threading.Thread(target=_forward, args=(local_sock, transport), daemon=True).start()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        client.close()


if __name__ == "__main__":
    main()
