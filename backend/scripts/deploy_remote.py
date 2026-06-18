"""Uso puntual: DEPLOY_SSH_PASS=... python scripts/deploy_remote.py"""
import os
import sys

import paramiko

HOST = "45.236.130.10"
PORT = 20213
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASS")
if not PASSWORD:
    sys.exit("Falta DEPLOY_SSH_PASS en el entorno")


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 900) -> str:
    print(f">>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
    if code != 0:
        raise SystemExit(f"Comando falló ({code})")
    return out


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

    project = run(
        client,
        "test -d /opt/wowed && echo /opt/wowed || ls -d /root/WowEd /home/*/WowEd 2>/dev/null | head -1",
    ).strip().splitlines()[-1].strip()
    if not project:
        project = "/opt/wowed"
    print(f"Proyecto: {project}")

    run(
        client,
        f"cd {project} && "
        "(grep -q '^DEFAULT_INSTITUTION_ID=' .env && "
        "sed -i 's/^DEFAULT_INSTITUTION_ID=.*/DEFAULT_INSTITUTION_ID=00000000-0000-0000-0000-000000000001/' .env || "
        "echo 'DEFAULT_INSTITUTION_ID=00000000-0000-0000-0000-000000000001' >> .env)",
    )
    run(client, f"cd {project} && git checkout -- deploy/remote-deploy.sh 2>/dev/null || true")
    run(client, f"cd {project} && git pull origin main", timeout=120)
    run(client, f"cd {project} && sed -i 's/\\r$//' deploy/remote-deploy.sh backend/docker-entrypoint.sh 2>/dev/null; chmod +x deploy/remote-deploy.sh && bash deploy/remote-deploy.sh", timeout=1200)
    run(client, "curl -sf http://127.0.0.1/api/health; echo; curl -sf http://127.0.0.1/api/health/db-schema; echo")
    client.close()
    print("Deploy remoto OK.")


if __name__ == "__main__":
    main()
