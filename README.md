# Affiliation Review (ROR Review)

A web application that helps reviewers match author affiliation strings against the [Research Organization Registry (ROR)](https://ror.org), inspect candidate matches, capture review comments, prepare organization insertion drafts, and export files for further ROR curation workflows.

This is an **independent community tool** maintained by [TNQTech](https://tnqtech.com/). It is **not** an official ROR service and does not bypass the official [ROR curation process](https://ror.org/).

## Features

- Paste affiliation strings or upload a CSV/TXT file
- Match affiliations against the public [ROR API](https://ror.readme.io/)
- Review match scores, add comments, and mark rows verified or as no match
- Draft missing-organization insertion records
- Export a review report (CSV) and insertion template (XLSX)

Workflow: **Input Affiliations → Review Results → Verify**

## Quick start

### Docker Compose (recommended)

Requires Docker Engine, Docker Compose, and outbound HTTPS access to `api.ror.org`.

```bash
mkdir -p ror_results
docker compose up -d --build
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

XLSX insertion export needs the public ROR bulk-processing template in the project root:

`PUBLIC ROR Bulk Processing Template - New Records.xlsx`

### Local development

Requires Python 3.11.

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

The app listens on [http://127.0.0.1:8000](http://127.0.0.1:8000).

`sample.txt` contains example affiliation strings you can paste into the input view.

## Usage

1. Paste affiliations (one per line) or upload a `.txt` / `.csv` file.
2. Click **Process Affiliations** to query the ROR API.
3. Review matches, add comments, and optionally create insertion drafts for missing organizations.
4. Verify selected rows.
5. Download the review report (CSV) and insertions (XLSX).

CSV uploads should use an `affiliation` or `affiliation_string` column. If neither is present, the first column is used.

Match outputs are assistive. Human review is required; exports are not automatic acceptances into the ROR registry.

## Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11 |
| Web framework | Flask 3.0.3 |
| WSGI server | Gunicorn 22.0.0 |
| HTTP client | requests |
| Spreadsheet export | openpyxl |
| Frontend | HTML, CSS, vanilla JavaScript |
| Deploy | Docker, Docker Compose |
| Storage | Filesystem (`ror_results/`) — no database |

## Project layout

```text
ror_ui.py              Flask app and API routes
ror_implementor.py     Affiliation parsing and parallel ROR API client
templates/             UI and legal pages
static/                CSS, JS, and brand assets
ror_results/           Runtime batches, remarks, verifications, insertions
docs/                  Design, deployment, and legal documentation
```

## Documentation

- [Design](docs/DESIGN.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Legal & compliance](docs/LEGAL_COMPLIANCE.md)
- In-app pages: `/terms`, `/security`, `/accessibility`

## License

- **Application source code:** [MIT License](LICENSE) © TNQ Tech - Public
- **ROR registry data and schemas:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

User-provided affiliation strings, remarks, and insertion drafts remain the responsibility of the deploying organization.

## Contributing

Contributions are welcome via [GitHub Issues](https://github.com/tnq-tech-pub/ROR-review/issues) and pull requests: bug fixes, accessibility improvements, documentation, and UI clarity that preserves the required disclaimer and licensing messaging.

Please do not remove the independent-community disclaimer or imply official ROR endorsement.
