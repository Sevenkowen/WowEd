"""Empaqueta el repo local, lo sube al VPS y ejecuta docker-compose build."""
import os
import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

HOST = "45.236.130.10"
PORT = 20213
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASS")
PROJECT_REMOTE = "/opt/wowed"
REPO_ROOT = Path(__file__).resolve().parents[2]

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "__pycache__",
    ".cursor",
    "dist",
    ".vite",
}
SKIP_FILES = {".env"}


def should_skip(rel: Path) -> bool:
    parts = set(rel.parts)
    if parts & SKIP_DIRS:
        return True
    if rel.name in SKIP_FILES:
        return True
    if rel.suffix in {".pyc", ".pyo"}:
        return True
    return False


def build_tarball(path: Path) -> None:
    with tarfile.open(path, "w:gz") as tar:
        for root, dirs, files in os.walk(REPO_ROOT):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            root_path = Path(root)
            for name in files:
                full = root_path / name
                rel = full.relative_to(REPO_ROOT)
                if should_skip(rel):
                    continue
                tar.add(full, arcname=str(rel).replace("\\", "/"))


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 1800) -> None:
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
        raise SystemExit(f"Comando falló ({code}): {cmd}")


def main() -> None:
    if not PASSWORD:
        sys.exit("Falta DEPLOY_SSH_PASS")

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tar_path = Path(tmp.name)
    print(f"Empaquetando {REPO_ROOT} ...")
    build_tarball(tar_path)
    print(f"Tarball: {tar_path} ({tar_path.stat().st_size // 1024} KB)")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=60)

    remote_tar = "/tmp/wowed-deploy.tar.gz"
    sftp = client.open_sftp()
    print(f"Subiendo a {remote_tar} ...")
    sftp.put(str(tar_path), remote_tar)
    sftp.close()
    tar_path.unlink(missing_ok=True)

    run(client, f"mkdir -p {PROJECT_REMOTE}")
    run(
        client,
        f"cd {PROJECT_REMOTE} && tar xzf {remote_tar} && rm -f {remote_tar}",
        timeout=300,
    )
    run(client, f"cd {PROJECT_REMOTE} && sed -i 's/\\r$//' deploy/remote-deploy.sh backend/docker-entrypoint.sh 2>/dev/null; chmod +x deploy/remote-deploy.sh backend/docker-entrypoint.sh")

    # docker-compose v1 on server
    run(
        client,
        f"cd {PROJECT_REMOTE} && docker-compose up -d --build",
        timeout=1800,
    )
    run(client, "curl -sf http://127.0.0.1/api/health; echo")
    run(client, "curl -sf http://127.0.0.1/api/health/db-schema; echo")
    run(client, f"cd {PROJECT_REMOTE} && docker-compose ps")

    client.close()
    print("Deploy completado: http://45.236.130.10/")


if __name__ == "__main__":
    main()
