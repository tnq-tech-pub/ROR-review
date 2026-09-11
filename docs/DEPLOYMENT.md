# Deployment Procedure

**Product:** Affiliation Review (ROR Review)  
**Maintainer:** TNQTech  
**Repository:** [https://github.com/tnq-tech-pub/ROR-review](https://github.com/tnq-tech-pub/ROR-review)  
**Last updated:** August 2026

This document describes how to build, configure, deploy, operate, and troubleshoot the open-source Affiliation Review application.

---

## 1. Prerequisites

### Host requirements

- Linux server or workstation with Docker Engine and Docker Compose plugin
- Outbound HTTPS access to `api.ror.org` (and proxy settings if required)
- Working DNS resolution for `api.ror.org`
- Disk space for Docker images and growing `ror_results/` data

### Project files required at runtime

- Application source (`ror_ui.py`, `ror_implementor.py`, `templates/`, `static/`)
- `Dockerfile`, `docker-compose.yml`, `requirements.txt`
- Optional but recommended: `vendor/wheels/` for offline dependency install
- ROR bulk template file:  
  `PUBLIC ROR Bulk Processing Template - New Records.xlsx`

---

## 2. Recommended deployment (Docker Compose)

### 2.1 Prepare directory

```bash
cd /path/to/ror
mkdir -p ror_results
```

Ensure the XLSX template is present in the project root (same directory as `docker-compose.yml`).

### 2.2 Build and start

```bash
docker compose up -d --build
```

### 2.3 Verify

```bash
docker compose ps
curl -I http://127.0.0.1:8000/
```

Open `http://<host>:8000` in a browser.

### 2.4 Stop / restart

```bash
docker compose down
docker compose up -d --force-recreate
```

---

## 3. Runtime configuration

Configured via environment variables in `docker-compose.yml` (or overrides).

| Variable | Default / example | Purpose |
|---|---|---|
| `OUTPUT_ROOT` | `/data/ror_results` | Root output directory |
| `BATCHES_ROOT` | `/data/ror_results/batches` | JSON batch results |
| `CSV_DIR` | `/data/ror_results/verifications` | Verification CSVs |
| `INSERTIONS_CSV` | `/data/ror_results/ror_insertions.csv` | Insertion drafts |
| `REMARKS_CSV` | `/data/ror_results/ror_remarks.csv` | Remarks/comments |
| `INSERTIONS_TEMPLATE_XLSX` | `/app/PUBLIC ROR Bulk Processing Template - New Records.xlsx` | XLSX template path |
| `ROR_PARALLEL_WORKERS` | `6` | Parallel ROR API workers |
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | empty / local defaults | Corporate proxy support |
| `FLASK_STATIC_NO_CACHE` | `1` | Reduce stale static assets in dev |

### Volume mounts (Compose)

| Host path | Container path | Notes |
|---|---|---|
| `./ror_results` | `/data/ror_results` | Persistent results |
| `./templates` | `/app/templates` | Live UI templates |
| `./static` | `/app/static` | Live static assets |
| `./ror_ui.py` | `/app/ror_ui.py` | Live backend (with `--reload`) |
| `./ror_implementor.py` | `/app/ror_implementor.py` | Live processor |
| template XLSX | `/app/...xlsx` | Read-only mount |

### Networking note

Compose uses `network_mode: host` so the container inherits host DNS. This is useful when bridge DNS cannot resolve `api.ror.org`. With host networking, the app listens on host port **8000**.

Also mounts `/etc/resolv.conf` read-only for DNS consistency.

---

## 4. Gunicorn process model

Default Compose command:

```text
gunicorn -b 0.0.0.0:8000 --workers 2 --timeout 300 --reload ror_ui:app
```

| Setting | Value | Reason |
|---|---|---|
| Workers | 2 | Concurrent request handling |
| Timeout | 300s | Large affiliation batches can take time |
| Reload | enabled in Compose | Convenient for mounted source updates |

For production hardening, consider disabling `--reload` and placing TLS termination at a reverse proxy.

---

## 5. Production hardening checklist

1. Terminate HTTPS at Nginx/Traefik/Caddy (or equivalent)
2. Restrict network access (VPN, IP allowlist, reverse-proxy auth)
3. Disable Gunicorn `--reload` in production
4. Set resource limits (CPU/memory) in Compose/orchestrator
5. Back up `ror_results/` regularly
6. Define retention policy for batches/CSVs
7. Monitor disk growth and ROR API failures
8. Keep base image and dependencies updated

Example reverse-proxy target: `http://127.0.0.1:8000`

---

## 6. Local development (without Docker)

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OUTPUT_ROOT=./ror_results
export BATCHES_ROOT=./ror_results/batches
export CSV_DIR=./ror_results/verifications
export INSERTIONS_CSV=./ror_results/ror_insertions.csv
export REMARKS_CSV=./ror_results/ror_remarks.csv
export INSERTIONS_TEMPLATE_XLSX="./PUBLIC ROR Bulk Processing Template - New Records.xlsx"
python ror_ui.py
```

App runs at `http://127.0.0.1:8000`.

---

## 7. Offline / air-gapped style builds

The Dockerfile installs Python packages from vendored wheels:

```dockerfile
pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt
```

Ensure `vendor/wheels/` contains wheels compatible with Python 3.11 / Linux for:

- Flask
- requests (+ dependencies)
- gunicorn
- openpyxl (+ dependencies)

Rebuild after updating wheels:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## 8. Operational data layout

```text
ror_results/
├── batches/
│   └── <batch_id>/
│       ├── aff_001.json
│       └── ...
├── verifications/
│   └── ror_verifications_<date>.csv
├── ror_insertions.csv
└── ror_remarks.csv
```

Do not commit runtime result files with sensitive review content to public repositories unless intentionally sanitized.

---

## 9. Smoke test procedure

1. Open `/`
2. Paste 2–3 sample affiliations
3. Click **Process Affiliations**
4. Confirm results view loads and score badges appear
5. Add a comment and blur the field (save remarks)
6. Create/edit an insertion draft
7. Download Review Report (CSV) and Insertions (XLSX)
8. Mark one row verified and confirm it leaves the active list
9. Open `/terms`, `/security`, `/accessibility`
10. Confirm **Go to GitHub** opens  
    [https://github.com/tnq-tech-pub/ROR-review](https://github.com/tnq-tech-pub/ROR-review)

---

## 10. Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Cannot resolve `api.ror.org` | Container DNS | Keep host networking + host `resolv.conf`; check proxy vars |
| Process hangs / times out | Large batch / API latency | Raise Gunicorn timeout; tune `ROR_PARALLEL_WORKERS` |
| XLSX download 500 | Missing template file | Mount/copy the public ROR bulk template XLSX |
| Duplicate CSV headers | Concurrent writers (older builds) | Use current locked append implementation; clean file if needed |
| UI changes not visible | Browser cache | Hard refresh; confirm static volume mount |
| Empty process result | Bad CSV column | Use `affiliation` / `affiliation_string` or first column |

View logs:

```bash
docker compose logs -f ror-ui
```

---

## 11. Upgrade procedure

```bash
git pull   # or sync release artifacts
docker compose down
docker compose up -d --build --force-recreate
```

Preserve `ror_results/` across upgrades. Validate with the smoke test above.

---

## 12. Rollback

1. Check out previous known-good tag/commit
2. Rebuild/recreate containers
3. Restore `ror_results/` from backup if data was corrupted

---

## 13. Related documents

- [Design Document](./DESIGN.md)
- [Legal & Compliance](./LEGAL_COMPLIANCE.md)
- Application README: `../README.md`
