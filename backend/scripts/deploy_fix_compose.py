"""Recrear contenedores tras error ContainerConfig de docker-compose v1."""
import os
import sys

import paramiko

HOST = "45.236.130.10"
PORT = 20213
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASS")
if not PASSWORD:
    sys.exit("Falta DEPLOY_SSH_PASS")


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 900) -> int:
    print(f">>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
    return code


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

    project = "/opt/wowed"
    cmds = [
        f"cd {project} && docker-compose stop api web || true",
        f"cd {project} && docker-compose rm -f api web || true",
        "docker rm -f wowed_api_1 wowed_web_1 2>/dev/null || true",
        f"cd {project} && docker-compose up -d --build",
        "sleep 12",
        f"cd {project} && docker-compose ps",
        "curl -sf http://127.0.0.1/api/health; echo",
        "curl -sf http://127.0.0.1/api/health/db-schema; echo",
    ]
    for cmd in cmds:
        code = run(client, cmd)
        if "up -d" in cmd and code != 0:
            sys.exit(code)

    client.close()
    print("Contenedores OK.")


if __name__ == "__main__":
    main()
