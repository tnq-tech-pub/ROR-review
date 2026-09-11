const INSERTION_RECORD_TYPE = "ror_org_insertion_v1";
const INSERTIONS_DOWNLOAD_NAME = "PUBLIC ROR Bulk Processing Template - New Records.xlsx";
const REMARKS_DOWNLOAD_NAME = "ror_remarks.csv";

const state = {
  rows: [],
  insertionEditRow: null,
  hasProcessed: false,
  searchedCount: 0,
  filtersOpen: false,
};

const activeFilters = {
  batch: "all",
  result: "all",
  chosen: "all",
  score: "all",
};

const els = {
  inputView: document.getElementById("inputView"),
  resultsView: document.getElementById("resultsView"),
  affiliationInput: document.getElementById("affiliationInput"),
  affiliationFile: document.getElementById("affiliationFile"),
  selectedFileName: document.getElementById("selectedFileName"),
  dropZone: document.getElementById("dropZone"),
  browseFileBtn: document.getElementById("browseFileBtn"),
  processAffiliations: document.getElementById("processAffiliations"),
  processError: document.getElementById("processError"),
  processStatus: document.getElementById("processStatus"),
  goBackBtn: document.getElementById("goBackBtn"),
  searchedFor: document.getElementById("searchedFor"),
  toggleFilters: document.getElementById("toggleFilters"),
  filtersPanel: document.getElementById("filtersPanel"),
  filterBatch: document.getElementById("filterBatch"),
  filterResult: document.getElementById("filterResult"),
  filterChosen: document.getElementById("filterChosen"),
  filterScore: document.getElementById("filterScore"),
  applyFilters: document.getElementById("applyFilters"),
  resetFilters: document.getElementById("resetFilters"),
  verifyFiltered: document.getElementById("verifyFiltered"),
  downloadInsertions: document.getElementById("downloadInsertions"),
  downloadRemarks: document.getElementById("downloadRemarks"),
  resultsBody: document.getElementById("resultsBody"),
  insertionModal: document.getElementById("insertionModal"),
  insertionForm: document.getElementById("insertionForm"),
  insertionModalClose: document.getElementById("insertionModalClose"),
  insertionCancel: document.getElementById("insertionCancel"),
  insertionModalMeta: document.getElementById("insertionModalMeta"),
  insertionFormError: document.getElementById("insertionFormError"),
};

function showInputView() {
  els.inputView.classList.remove("hidden");
  els.resultsView.classList.add("hidden");
  updateStepper(1);
}

function showResultsView() {
  els.inputView.classList.add("hidden");
  els.resultsView.classList.remove("hidden");
  updateStepper(2);
  els.searchedFor.textContent = `Searched for ${state.searchedCount} affiliation${
    state.searchedCount === 1 ? "" : "s"
  }`;
}

function updateStepper(activeStep) {
  document.querySelectorAll(".stepper__item").forEach((item) => {
    const step = Number(item.dataset.step);
    item.classList.remove("is-active", "is-done");
    if (step < activeStep) item.classList.add("is-done");
    else if (step === activeStep) item.classList.add("is-active");
  });
}

function parseStructuredInsertion(text) {
  if (!text || !String(text).trim()) return null;
  try {
    const o = JSON.parse(text);
    if (o && o._type === INSERTION_RECORD_TYPE && typeof o === "object") return o;
  } catch (_) {
    /* legacy plain text */
  }
  return null;
}

function insertionSummary(note) {
  const o = parseStructuredInsertion(note);
  if (o && o.organization_name) {
    const t = o.organization_name;
    return t.length > 36 ? `${t.slice(0, 36)}…` : t;
  }
  if (note && String(note).trim()) return "Legacy text";
  return "—";
}

function getInsFields() {
  return Array.from(els.insertionForm.querySelectorAll("[data-ins-field]"));
}

function fillInsertionFormFromRow(row) {
  const structured = parseStructuredInsertion(row.insertion_note);
  const legacy =
    !structured && row.insertion_note && String(row.insertion_note).trim()
      ? String(row.insertion_note).trim()
      : "";

  getInsFields().forEach((el) => {
    const key = el.dataset.insField;
    if (!key) return;
    if (structured && Object.prototype.hasOwnProperty.call(structured, key)) {
      el.value = structured[key] == null ? "" : String(structured[key]);
    } else if (key === "requestor_comments" && legacy) {
      el.value = legacy;
    } else {
      el.value = "";
    }
  });
}

function collectInsertionRecord() {
  const rec = {};
  getInsFields().forEach((el) => {
    const key = el.dataset.insField;
    if (key) rec[key] = el.value.trim();
  });
  return rec;
}

function hideInsertionFormError() {
  els.insertionFormError.textContent = "";
  els.insertionFormError.classList.add("hidden");
}

function showInsertionFormError(message) {
  els.insertionFormError.textContent = message;
  els.insertionFormError.classList.remove("hidden");
}

function hideProcessError() {
  els.processError.textContent = "";
  els.processError.classList.add("hidden");
}

function showProcessError(message) {
  els.processError.textContent = message;
  els.processError.classList.remove("hidden");
}

function openInsertionModal(row) {
  state.insertionEditRow = row;
  els.insertionModalMeta.textContent = `${row.batch_id} · ${row.affiliation_id}`;
  hideInsertionFormError();
  fillInsertionFormFromRow(row);
  els.insertionModal.classList.remove("hidden");
}

function closeInsertionModal() {
  state.insertionEditRow = null;
  els.insertionModal.classList.add("hidden");
  hideInsertionFormError();
}

function rowNumericScore(row) {
  const raw = row.score == null ? "" : String(row.score).trim();
  if (!raw) return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function scoreAsPercent(row) {
  const n = rowNumericScore(row);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function getFilteredRows() {
  return state.rows.filter((row) => {
    if (activeFilters.batch !== "all" && row.batch_id !== activeFilters.batch) return false;

    const hasAff = row.affiliation_count > 0;
    const hasQuery = row.query_count > 0;
    if (activeFilters.result === "matched" && !hasAff) return false;
    if (activeFilters.result === "unmatched" && hasAff) return false;
    if (activeFilters.result === "query_has" && !hasQuery) return false;

    if (activeFilters.chosen === "true" && !row.chosen_any) return false;
    if (activeFilters.chosen === "false" && row.chosen_any) return false;

    if (activeFilters.score !== "all") {
      const n = rowNumericScore(row);
      if (!Number.isFinite(n)) return false;
      const pct = n <= 1 ? n * 100 : n;
      if (activeFilters.score === "one" && pct < 99.5) return false;
      if (activeFilters.score === "below_one" && pct >= 99.5) return false;
    }
    return true;
  });
}

function createBadge(text, variant, withDot) {
  const span = document.createElement("span");
  span.className = `badge badge--${variant}`;
  if (withDot) {
    const dot = document.createElement("span");
    dot.className = `badge__dot badge__dot--${variant}`;
    dot.setAttribute("aria-hidden", "true");
    span.appendChild(dot);
  }
  span.appendChild(document.createTextNode(text));
  return span;
}

function scoreCell(row) {
  const td = document.createElement("td");
  const pct = scoreAsPercent(row);
  if (pct == null) {
    td.appendChild(createBadge("—", "neutral", false));
    return td;
  }
  let variant = "danger";
  if (pct >= 95) variant = "success";
  else if (pct >= 70) variant = "warning";
  td.appendChild(createBadge(String(pct), variant, true));
  return td;
}

function selectedCell(row) {
  const td = document.createElement("td");
  if (row.chosen_any) {
    td.appendChild(createBadge("Selected", "success", false));
  } else {
    td.appendChild(createBadge("Not selected", "neutral", false));
  }
  return td;
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text || "";
  return td;
}

function renderRows() {
  const rows = getFilteredRows();
  els.resultsBody.innerHTML = "";

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "empty";
    td.textContent = state.rows.length
      ? "No rows match the current filters."
      : "No results yet.";
    tr.appendChild(td);
    els.resultsBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.appendChild(cell(row.affiliation_string));
    tr.appendChild(scoreCell(row));
    tr.appendChild(selectedCell(row));

    const remarksCell = document.createElement("td");
    remarksCell.className = "remarks-cell";
    const remarksInput = document.createElement("textarea");
    remarksInput.className = "remarks-input";
    remarksInput.rows = 2;
    remarksInput.placeholder = "Add comments…";
    remarksInput.value = row.remarks || "";
    remarksInput.addEventListener("change", () => saveRemarks(row, remarksInput));
    remarksInput.addEventListener("blur", () => saveRemarks(row, remarksInput));
    remarksCell.appendChild(remarksInput);
    tr.appendChild(remarksCell);

    const insertCell = document.createElement("td");
    insertCell.className = "insertion-cell";
    const wrap = document.createElement("div");
    wrap.className = "insertion-cell-inner";
    const summary = document.createElement("div");
    summary.className = "insertion-summary";
    summary.textContent = insertionSummary(row.insertion_note);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "link-button";
    btn.textContent = row.insertion_note ? "Edit record" : "Add record";
    btn.addEventListener("click", () => openInsertionModal(row));
    wrap.appendChild(summary);
    wrap.appendChild(btn);
    insertCell.appendChild(wrap);
    tr.appendChild(insertCell);

    const reviewCell = document.createElement("td");
    reviewCell.className = "review-cell";
    const reviewSelect = document.createElement("select");
    reviewSelect.className = "review-select";
    reviewSelect.title = "Set review status";
    [
      { value: "", label: "Pending" },
      { value: "verified", label: "✓ Verified" },
      { value: "no_result_found", label: "✗ No match" },
    ].forEach(({ value, label }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      reviewSelect.appendChild(opt);
    });
    reviewSelect.addEventListener("change", () => {
      if (reviewSelect.value) updateStepper(3);
      submitReviewOutcome(row, reviewSelect);
    });
    reviewCell.appendChild(reviewSelect);
    tr.appendChild(reviewCell);

    const detailCell = document.createElement("td");
    const detailBtn = document.createElement("button");
    detailBtn.className = "link-button";
    detailBtn.textContent = "View";
    detailBtn.addEventListener("click", () => openDetail(row));
    detailCell.appendChild(detailBtn);
    tr.appendChild(detailCell);

    els.resultsBody.appendChild(tr);
  });
}

function syncFiltersFromUi() {
  activeFilters.batch = els.filterBatch.value;
  activeFilters.result = els.filterResult.value;
  activeFilters.chosen = els.filterChosen.value;
  activeFilters.score = els.filterScore.value;
}

function applyFilters() {
  syncFiltersFromUi();
  renderRows();
}

function resetFilters() {
  els.filterBatch.value = "all";
  els.filterResult.value = "all";
  els.filterChosen.value = "all";
  els.filterScore.value = "all";
  syncFiltersFromUi();
  renderRows();
}

function setFiltersOpen(open) {
  state.filtersOpen = open;
  els.toggleFilters.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) els.filtersPanel.classList.remove("hidden");
  else els.filtersPanel.classList.add("hidden");
}

function updateBatchFilterOptions(preferredBatch) {
  const current = preferredBatch || els.filterBatch.value || "all";
  const batches = [...new Set(state.rows.map((row) => row.batch_id).filter(Boolean))];
  batches.sort((a, b) => b.localeCompare(a));

  els.filterBatch.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All";
  els.filterBatch.appendChild(allOpt);

  batches.forEach((batch) => {
    const opt = document.createElement("option");
    opt.value = batch;
    opt.textContent = batch;
    els.filterBatch.appendChild(opt);
  });

  els.filterBatch.value = batches.includes(current) ? current : "all";
  syncFiltersFromUi();
}

function setSelectedFile(file) {
  if (!file) {
    els.affiliationFile.value = "";
    els.selectedFileName.textContent = "";
    return;
  }
  const dt = new DataTransfer();
  dt.items.add(file);
  els.affiliationFile.files = dt.files;
  els.selectedFileName.textContent = file.name;
}

async function processAffiliations() {
  hideProcessError();
  const pasted = els.affiliationInput.value.trim();
  const file = els.affiliationFile.files[0];

  if (!pasted && !file) {
    showProcessError("Paste affiliations or upload a .txt/.csv file.");
    return;
  }

  els.processAffiliations.disabled = true;
  const prevLabel = els.processAffiliations.textContent;
  els.processAffiliations.textContent = "Processing…";
  els.processStatus.textContent = "Calling ROR API for each affiliation…";

  try {
    let res;
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      if (pasted) formData.append("text", pasted);
      res = await fetch("/api/process", { method: "POST", body: formData });
    } else {
      res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasted }),
      });
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showProcessError(data.error || `Process failed (${res.status})`);
      els.processStatus.textContent = "";
      return;
    }

    const newRows = data.rows || [];
    const existingIds = new Set(state.rows.map((row) => row.row_id));
    newRows.forEach((row) => {
      if (!existingIds.has(row.row_id)) {
        state.rows.push(row);
        existingIds.add(row.row_id);
      }
    });

    state.hasProcessed = true;
    state.searchedCount = Number(data.processed || newRows.length || 0);
    updateBatchFilterOptions(data.batch_id || null);
    renderRows();
    showResultsView();
    els.processStatus.textContent = "";
    els.affiliationInput.value = "";
    setSelectedFile(null);
  } catch (e) {
    showProcessError(String(e));
    els.processStatus.textContent = "";
  } finally {
    els.processAffiliations.disabled = false;
    els.processAffiliations.textContent = prevLabel;
  }
}

async function downloadRemarksCsv() {
  const res = await fetch("/api/remarks/download");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = REMARKS_DOWNLOAD_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadInsertionsXlsx() {
  const res = await fetch("/api/insertions/download");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = INSERTIONS_DOWNLOAD_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveRemarks(row, input) {
  const remarks = input.value.trim();
  if (remarks === (row.remarks || "")) return;
  input.disabled = true;
  try {
    const res = await fetch("/api/remarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        row_id: row.row_id,
        remarks,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(err.error || `Save comments failed (${res.status})`);
      return;
    }
    row.remarks = remarks;
  } catch (e) {
    window.alert(String(e));
  } finally {
    input.disabled = false;
  }
}

async function submitReviewOutcome(row, select) {
  const verificationOutcome = select.value;
  if (!verificationOutcome) return;
  select.disabled = true;
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        row_id: row.row_id,
        verification_outcome: verificationOutcome,
        remarks: row.remarks || "",
        verifier: "",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(err.error || `Review save failed (${res.status})`);
      select.value = "";
      select.disabled = false;
      return;
    }
    state.rows = state.rows.filter((r) => r.row_id !== row.row_id);
    renderRows();
  } catch (e) {
    window.alert(String(e));
    select.value = "";
    select.disabled = false;
  }
}

async function submitInsertionForm(event) {
  event.preventDefault();
  hideInsertionFormError();
  const row = state.insertionEditRow;
  if (!row) return;

  const record = collectInsertionRecord();
  const year = record.year_established || "";
  if (year && !/^\d{4}$/.test(year)) {
    showInsertionFormError("Year established must be exactly four digits (YYYY) or leave empty.");
    return;
  }

  try {
    const res = await fetch("/api/insertion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        row_id: row.row_id,
        insertion_record: record,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showInsertionFormError(err.error || `Save failed (${res.status})`);
      return;
    }
    const normalized = { _type: INSERTION_RECORD_TYPE, ...record };
    row.insertion_note = JSON.stringify(normalized);
    closeInsertionModal();
    renderRows();
  } catch (e) {
    showInsertionFormError(String(e));
  }
}

async function verifyFilteredRows() {
  const rows = getFilteredRows();
  if (rows.length === 0) {
    window.alert("No rows match current filters.");
    return;
  }
  const outcome = window.prompt(
    'Bulk review status: type "verified" or "no_result_found"',
    "verified"
  );
  if (!outcome) return;
  const verificationOutcome = outcome.trim();
  if (verificationOutcome !== "verified" && verificationOutcome !== "no_result_found") {
    window.alert('Status must be "verified" or "no_result_found".');
    return;
  }
  els.verifyFiltered.disabled = true;
  const prevLabel = els.verifyFiltered.textContent;
  els.verifyFiltered.textContent = "Verifying…";
  updateStepper(3);
  try {
    const rowIds = rows.map((r) => r.row_id);
    const res = await fetch("/api/verify/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        row_ids: rowIds,
        verification_outcome: verificationOutcome,
        verifier: "",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(err.error || `Bulk verify failed (${res.status})`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    const done = Number(data.verified_count || 0);
    const idSet = new Set(rowIds);
    state.rows = state.rows.filter((r) => !idSet.has(r.row_id));
    renderRows();
    window.alert(`Verified ${done} row(s).`);
  } catch (e) {
    window.alert(String(e));
  } finally {
    els.verifyFiltered.disabled = false;
    els.verifyFiltered.textContent = prevLabel;
  }
}

function openDetail(row) {
  const url = new URL("/api/result", window.location.origin);
  url.searchParams.set("batch_id", row.batch_id);
  url.searchParams.set("affiliation_id", row.affiliation_id);
  window.open(url.toString(), "_blank");
}

/* File upload / drag-drop */
els.browseFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  els.affiliationFile.click();
});

els.dropZone.addEventListener("click", (e) => {
  if (e.target === els.browseFileBtn) return;
  els.affiliationFile.click();
});

els.dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    els.affiliationFile.click();
  }
});

["dragenter", "dragover"].forEach((evt) => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.dropZone.classList.add("is-dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.dropZone.classList.remove("is-dragover");
  });
});

els.dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) setSelectedFile(file);
});

els.affiliationFile.addEventListener("change", () => {
  const file = els.affiliationFile.files[0];
  els.selectedFileName.textContent = file ? file.name : "";
});

els.processAffiliations.addEventListener("click", processAffiliations);
els.goBackBtn.addEventListener("click", () => {
  showInputView();
});

els.toggleFilters.addEventListener("click", () => {
  setFiltersOpen(!state.filtersOpen);
});

els.applyFilters.addEventListener("click", applyFilters);
els.resetFilters.addEventListener("click", resetFilters);
els.verifyFiltered.addEventListener("click", verifyFilteredRows);

els.downloadInsertions.addEventListener("click", async () => {
  els.downloadInsertions.disabled = true;
  const prevLabel = els.downloadInsertions.textContent;
  els.downloadInsertions.textContent = "Preparing…";
  try {
    await downloadInsertionsXlsx();
  } catch (e) {
    window.alert(String(e));
  } finally {
    els.downloadInsertions.disabled = false;
    els.downloadInsertions.textContent = prevLabel;
  }
});

els.downloadRemarks.addEventListener("click", async () => {
  els.downloadRemarks.disabled = true;
  const prevLabel = els.downloadRemarks.textContent;
  els.downloadRemarks.textContent = "Preparing…";
  try {
    await downloadRemarksCsv();
  } catch (e) {
    window.alert(String(e));
  } finally {
    els.downloadRemarks.disabled = false;
    els.downloadRemarks.textContent = prevLabel;
  }
});

els.insertionForm.addEventListener("submit", submitInsertionForm);
els.insertionModalClose.addEventListener("click", closeInsertionModal);
els.insertionCancel.addEventListener("click", closeInsertionModal);
els.insertionModal.addEventListener("click", (event) => {
  if (event.target === els.insertionModal) {
    closeInsertionModal();
  }
});

syncFiltersFromUi();
showInputView();
