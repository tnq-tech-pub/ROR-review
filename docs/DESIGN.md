# Design Document

**Product:** Affiliation Review (ROR Review)  
**Maintainer:** TNQTech  
**Repository:** [https://github.com/tnq-tech-pub/ROR-review](https://github.com/tnq-tech-pub/ROR-review)  
**Status:** Open-source community contribution  
**Last updated:** August 2026

---

## 1. Purpose

Affiliation Review is a web application that helps reviewers match author affiliation strings against the [Research Organization Registry (ROR)](https://ror.org), inspect candidate matches, capture review comments, prepare organization insertion drafts, and export files suitable for further ROR curation workflows.

The application is an **independent community tool**. It is not an official ROR service and does not bypass the official ROR curation process.

---

## 2. Goals and non-goals

### Goals

- Accept affiliations via paste or CSV/TXT upload
- Call the public ROR API for affiliation/query matching
- Present match scores and selection status for human review
- Persist remarks, verification outcomes, and insertion drafts
- Export review reports (CSV) and insertion templates (XLSX)
- Provide a clear UI workflow: Input → Review → Verify

### Non-goals

- Acting as an official ROR intake or approval system
- Automatic acceptance of organizations into the ROR registry
- Full identity/SSO user management (left to deployers)
- Replacing the ROR API, registry UI, or curation tooling

---

## 3. Users and primary use cases

| Persona | Use case |
|---|---|
| Affiliation reviewer | Match affiliations, add comments, mark verified / no match |
| Curation assistant | Prepare insertion drafts for missing organizations |
| Deployer / operator | Host the tool for a team or community workflow |

---

## 4. System architecture

```
┌─────────────┐     HTTPS/HTTP      ┌──────────────────────┐
│  Browser UI │ ◄─────────────────► │  Flask + Gunicorn    │
│  (HTML/CSS/ │                     │  ror_ui.py           │
│   JS)       │                     └──────────┬───────────┘
└─────────────┘                                │
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     │                         │                         │
                     ▼                         ▼                         ▼
            ┌────────────────┐      ┌────────────────────┐     ┌─────────────────┐
            │ ror_implementor│      │ Filesystem storage │     │ Public ROR API  │
            │ (parallel ROR  │      │ JSON batches + CSV │     │ api.ror.org     │
            │  API calls)    │      │ / XLSX exports     │     └─────────────────┘
            └────────────────┘      └────────────────────┘
```

### Components

| Component | Role |
|---|---|
| `ror_ui.py` | Flask routes, CSV/XLSX I/O, verification/insertion APIs, documentation pages |
| `ror_implementor.py` | Affiliation parsing, ROR API client, parallel processing |
| `templates/` | UI and legal documentation pages |
| `static/` | CSS, JS, brand assets |
| `ror_results/` | Runtime data (batches, verifications, insertions, remarks) |

---

## 5. User experience design

### 5.1 Screens

1. **Input view**
   - Branding (ROR logo)
   - Title and short description
   - 3-step stepper: Input Affiliations → Review Results → Verify
   - Split input: textarea + drag-and-drop CSV upload
   - Process Affiliations action

2. **Results view**
   - Go Back
   - Search summary (“Searched for N affiliations”)
   - Collapsible filters (Batch, Result, Chosen, Score)
   - Downloads and Verify Selected
   - Results table with score badges, comments, insertion, status, actions

3. **Shared footer**
   - Contribute panel (TNQTech open-source statement + disclaimer + GitHub)
   - Legal links and software/data licensing summary

### 5.2 Workflow

```
Paste / upload affiliations
        ↓
Process (ROR API matching)
        ↓
Review results (filters, comments, insertion drafts)
        ↓
Verify selected rows
        ↓
Download insertions (.xlsx) / review report (.csv)
```

---

## 6. Data model (filesystem)

No relational database is used. State is stored on disk.

### 6.1 Batch results

Path pattern: `ror_results/batches/<batch_id>/aff_NNN.json`

Typical fields include affiliation string, affiliation/query search responses, scores, and identifiers needed for detail views.

### 6.2 Remarks CSV

`ror_remarks.csv`  
Columns: `row_id`, `timestamp`, `batch_id`, `affiliation_id`, `remarks`

### 6.3 Verifications CSV

Daily files under `ror_results/verifications/`  
Include verification outcome (`verified` / `no_result_found`) and related metadata.

### 6.4 Insertions CSV + XLSX export

`ror_insertions.csv` stores structured insertion JSON.  
XLSX download fills the public ROR bulk-processing template sheet for requestor-provided data.

### 6.5 Row identity

`row_id = "<batch_id>::<affiliation_id>"`  
Example: `2026-08-04T10-00-00Z::aff_001`

---

## 7. API design (application)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Main UI |
| `GET` | `/terms` | Terms of Service |
| `GET` | `/security` | Security & Compliance |
| `GET` | `/accessibility` | Accessibility Statement |
| `POST` | `/api/process` | Process pasted text and/or uploaded file |
| `GET` | `/api/results` | List unverified rows |
| `GET` | `/api/result` | Detail JSON for one affiliation |
| `POST` | `/api/remarks` | Save comments |
| `POST` | `/api/verify` | Verify one row |
| `POST` | `/api/verify/bulk` | Verify filtered set |
| `POST` | `/api/insertion` | Save insertion draft |
| `GET` | `/api/insertions/download` | XLSX export |
| `GET` | `/api/remarks/download` | CSV review report |

External dependency: public ROR REST API (`api.ror.org`), documented at [ror.readme.io](https://ror.readme.io/).

---

## 8. Technical stack

| Layer | Technology |
|---|---|
| Language | Python 3.11 |
| Web framework | Flask 3.0.3 |
| WSGI server | Gunicorn 22.0.0 |
| HTTP client | requests 2.32.3 |
| Spreadsheet export | openpyxl 3.1.5 |
| Frontend | HTML, CSS, vanilla JavaScript |
| Packaging / deploy | Docker, Docker Compose |
| Parallelism | `concurrent.futures.ThreadPoolExecutor` |
| Concurrency safety | `fcntl` file locks for CSV appends |

---

## 9. Design decisions

| Decision | Rationale |
|---|---|
| Filesystem storage | Simple deploy, easy backup/export, no DB ops burden |
| Parallel ROR calls | Improves throughput for multi-affiliation batches |
| Human-in-the-loop verification | Matches are assistive; curation remains external |
| Separate software vs data licensing | Clarifies MIT app code vs CC0 ROR data |
| Host networking option | Helps environments where container DNS cannot resolve `api.ror.org` |

---

## 10. Branding and UI constraints

- Use official ROR logo/assets per [ROR display guidelines](https://ror.readme.io/docs/display)
- Use official TNQTech reverse logo in the dark contribute panel
- Clearly disclose independent/community status (not an official ROR product)

---

## 11. Extensibility

Possible future enhancements (not currently required):

- Optional authentication / multi-user audit trails
- Persistence backend (Postgres/SQLite)
- Richer accessibility table navigation
- Configurable scoring thresholds and match policies

---

## 12. Related documents

- [Deployment Procedure](./DEPLOYMENT.md)
- [Legal & Compliance](./LEGAL_COMPLIANCE.md)
- In-app pages: `/terms`, `/security`, `/accessibility`
- Privacy Policy: [https://ror.org/about/privacy/](https://ror.org/about/privacy/)
