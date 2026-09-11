import argparse
import csv
import io
import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROR_API_BASE = "https://api.ror.org/v2/organizations"
ROR_REQUEST_TIMEOUT = int(os.getenv("ROR_REQUEST_TIMEOUT", "60"))
ROR_PARALLEL_WORKERS = max(1, int(os.getenv("ROR_PARALLEL_WORKERS", "6")))

_AFFILIATION_CSV_COLUMNS = {
    "affiliation",
    "affiliation_string",
    "affiliation string",
    "affiliations",
}


def _http_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    session.mount("https://", HTTPAdapter(max_retries=retry, pool_maxsize=10))
    session.mount("http://", HTTPAdapter(max_retries=retry, pool_maxsize=10))
    return session


_THREAD_LOCAL = threading.local()


def _get_session() -> requests.Session:
    session = getattr(_THREAD_LOCAL, "session", None)
    if session is None:
        session = _http_session()
        _THREAD_LOCAL.session = session
    return session


def _quote_query(value: str) -> str:
    if " " in value:
        return f"\"{value}\""
    return value


def ror_affiliation_search(affiliation: str) -> Dict[str, Any]:
    response = _get_session().get(
        ROR_API_BASE,
        params={"affiliation": affiliation},
        timeout=ROR_REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def ror_query_search(query: str) -> Dict[str, Any]:
    response = _get_session().get(
        ROR_API_BASE,
        params={"query": _quote_query(query)},
        timeout=ROR_REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def query_string_from_affiliation(affiliation: str) -> str:
    for part in affiliation.split(","):
        value = part.strip()
        if value:
            return value
    return affiliation.strip()


def parse_affiliation_lines(text: str) -> List[str]:
    affiliations: List[str] = []
    seen: Set[str] = set()
    for line in text.splitlines():
        value = line.strip()
        if not value or value.startswith("#"):
            continue
        if value not in seen:
            seen.add(value)
            affiliations.append(value)
    return affiliations


def parse_affiliation_csv(text: str) -> List[str]:
    if not text.strip():
        return []

    affiliations: List[str] = []
    seen: Set[str] = set()

    def add_value(raw: str) -> None:
        value = raw.strip()
        if value and value not in seen:
            seen.add(value)
            affiliations.append(value)

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames:
        field_map = {name.lower().strip(): name for name in reader.fieldnames if name}
        selected = None
        for candidate in _AFFILIATION_CSV_COLUMNS:
            if candidate in field_map:
                selected = field_map[candidate]
                break
        if selected:
            for row in reader:
                add_value(row.get(selected, ""))
            return affiliations

    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        return []

    first = [cell.strip().lower() for cell in rows[0]]
    start = 1 if any(cell in _AFFILIATION_CSV_COLUMNS for cell in first) else 0
    for row in rows[start:]:
        if row:
            add_value(row[0])
    return affiliations


def parse_affiliation_upload(filename: str, content: str) -> List[str]:
    name = (filename or "").lower()
    if name.endswith(".csv"):
        return parse_affiliation_csv(content)
    return parse_affiliation_lines(content)


def _process_one_affiliation(index: int, affiliation: str) -> Tuple[int, Dict[str, Any]]:
    aff_id = f"aff_{index:03d}"
    query_string = query_string_from_affiliation(affiliation)
    record: Dict[str, Any] = {
        "affiliation_id": aff_id,
        "original_affiliation": affiliation,
        "affiliation_string": affiliation,
        "query_string": query_string,
    }

    if affiliation:
        record["affiliation_search"] = ror_affiliation_search(affiliation)
    if query_string:
        record["query_search"] = ror_query_search(query_string)

    return index, record


def process_affiliation_strings(
    affiliations: List[str],
    output_dir: Path,
    max_workers: Optional[int] = None,
) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not affiliations:
        return []

    workers = max(1, max_workers or ROR_PARALLEL_WORKERS)
    workers = min(workers, len(affiliations))
    records_by_index: Dict[int, Dict[str, Any]] = {}

    if workers == 1:
        for index, affiliation in enumerate(affiliations, start=1):
            row_index, record = _process_one_affiliation(index, affiliation)
            records_by_index[row_index] = record
    else:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(_process_one_affiliation, index, affiliation)
                for index, affiliation in enumerate(affiliations, start=1)
            ]
            for future in as_completed(futures):
                row_index, record = future.result()
                records_by_index[row_index] = record

    written: List[Path] = []
    for index in sorted(records_by_index):
        aff_id = f"aff_{index:03d}"
        output_path = output_dir / f"{aff_id}.json"
        output_path.write_text(
            json.dumps(records_by_index[index], ensure_ascii=True, indent=2),
            encoding="utf-8",
        )
        written.append(output_path)

    return written


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run ROR affiliation searches for plain-text affiliation strings."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to a .txt (one affiliation per line) or .csv file.",
    )
    parser.add_argument(
        "--output",
        default="ror_results/batches/manual",
        help="Directory to write per-affiliation JSON results.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=ROR_PARALLEL_WORKERS,
        help=f"Parallel ROR API workers (default: {ROR_PARALLEL_WORKERS}).",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    content = input_path.read_text(encoding="utf-8-sig")
    affiliations = parse_affiliation_upload(input_path.name, content)
    if not affiliations:
        raise SystemExit("No affiliations found in input file.")

    written = process_affiliation_strings(
        affiliations,
        Path(args.output),
        max_workers=max(1, args.workers),
    )
    print(f"Wrote {len(written)} result file(s) to {args.output}")


if __name__ == "__main__":
    main()
