const ROWS = "ABCDEFGHI";
const COLS = "123456789";

let puzzleString = "";
let startTimeMs = null;
let startedAtIso = null;
let moves = [];
let stepCounter = 0;
let loggingEnabled = false;

const gridEl = document.getElementById("sudoku-grid");
const puzzleInput = document.getElementById("puzzle-input");
const loadBtn = document.getElementById("load-btn");
const startBtn = document.getElementById("start-btn");
const downloadJsonBtn = document.getElementById("download-json");
const downloadCsvBtn = document.getElementById("download-csv");
const statusEl = document.getElementById("status");
const numpadButtons = document.querySelectorAll(".numpad-btn");

let selectedCell = null;
let cellState = [];

function cellId(row, col) {
  return `${ROWS[row]}${COLS[col]}`;
}

function logMove(row, col, digitOrNull, action) {
  if (!loggingEnabled || startTimeMs === null) {
    return;
  }
  const now = Date.now();
  stepCounter += 1;
  moves.push({
    step: stepCounter,
    timestamp_ms: now,
    elapsed_ms: now - startTimeMs,
    row,
    col,
    cell: cellId(row, col),
    digit: digitOrNull,
    action,
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#a23d3d" : "#24527a";
}

function buildEmptyState() {
  cellState = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({ value: "", given: false }))
  );
}

function createGrid() {
  gridEl.innerHTML = "";
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (col === 2 || col === 5) {
        cell.classList.add("subgrid-right");
      }
      if (row === 2 || row === 5) {
        cell.classList.add("subgrid-bottom");
      }
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.addEventListener("click", () => selectCell(cell));
      gridEl.appendChild(cell);
    }
  }
}

function selectCell(cell) {
  if (selectedCell) {
    selectedCell.classList.remove("selected");
  }
  selectedCell = cell;
  if (selectedCell) {
    selectedCell.classList.add("selected");
  }
}

function updateCellDisplay(row, col) {
  const index = row * 9 + col;
  const cell = gridEl.children[index];
  const state = cellState[row][col];
  cell.textContent = state.value;
  cell.classList.toggle("given", state.given);
}

function applyPuzzleString(raw) {
  puzzleString = raw;
  buildEmptyState();
  if (selectedCell) {
    selectedCell.classList.remove("selected");
    selectedCell = null;
  }
  for (let i = 0; i < 81; i += 1) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const ch = raw[i];
    if (ch >= "1" && ch <= "9") {
      cellState[row][col] = { value: ch, given: true };
    } else {
      cellState[row][col] = { value: "", given: false };
    }
  }
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      updateCellDisplay(row, col);
    }
  }
}

function isValidPuzzle(input) {
  return input.length === 81 && /^[0-9.]+$/.test(input);
}

function resetLogging() {
  startTimeMs = null;
  startedAtIso = null;
  loggingEnabled = false;
  moves = [];
  stepCounter = 0;
  startBtn.disabled = false;
  downloadJsonBtn.disabled = false;
  downloadCsvBtn.disabled = false;
}

function handleDigitInput(digit) {
  if (!selectedCell) {
    return;
  }
  const row = Number(selectedCell.dataset.row);
  const col = Number(selectedCell.dataset.col);
  const state = cellState[row][col];
  if (state.given) {
    return;
  }
  if (digit === "clear") {
    if (state.value !== "") {
      state.value = "";
      updateCellDisplay(row, col);
      logMove(row, col, null, "clear");
    }
    return;
  }
  if (state.value !== digit) {
    state.value = digit;
    updateCellDisplay(row, col);
    logMove(row, col, digit, "set");
  }
}

function handleKeydown(event) {
  const active = document.activeElement;
  if (active === puzzleInput) {
    return;
  }
  if (!selectedCell) {
    return;
  }
  if (event.key >= "1" && event.key <= "9") {
    event.preventDefault();
    handleDigitInput(event.key);
  } else if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    handleDigitInput("clear");
  }
}

function startSolving() {
  if (!puzzleString) {
    return;
  }
  startedAtIso = new Date().toISOString();
  startTimeMs = Date.now();
  loggingEnabled = true;
  setStatus("Logging started. Every move will be recorded.");
}

function downloadJson() {
  const finishedAtIso = new Date().toISOString();
  const payload = {
    puzzle_string: puzzleString,
    rows: 9,
    cols: 9,
    started_at: startedAtIso,
    finished_at: finishedAtIso,
    moves,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `sudoku_replay_${Date.now()}.json`);
}

function downloadCsv() {
  const header = "step,timestamp_ms,elapsed_ms,row,col,cell,digit,action";
  const rows = moves.map((move) => {
    const digit = move.digit === null ? "" : move.digit;
    return [
      move.step,
      move.timestamp_ms,
      move.elapsed_ms,
      move.row,
      move.col,
      move.cell,
      digit,
      move.action,
    ].join(",");
  });
  const finishedAtIso = new Date().toISOString();
  const meta = [
    `# puzzle_string: ${puzzleString}`,
    `# started_at: ${startedAtIso ?? ""}`,
    `# finished_at: ${finishedAtIso}`,
  ];
  const csvContent = [header, ...rows, ...meta].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `sudoku_replay_${Date.now()}.csv`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

loadBtn.addEventListener("click", () => {
  const raw = puzzleInput.value.replace(/\s/g, "");
  if (!isValidPuzzle(raw)) {
    setStatus(
      `Puzzle must be 81 characters of digits 0-9 or dots. Currently ${raw.length}.`,
      true
    );
    return;
  }
  applyPuzzleString(raw);
  resetLogging();
  setStatus("Puzzle loaded. Click Start solving when ready.");
});

startBtn.addEventListener("click", () => {
  startSolving();
  startBtn.disabled = true;
});

downloadJsonBtn.addEventListener("click", downloadJson);

downloadCsvBtn.addEventListener("click", downloadCsv);

numpadButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const digit = btn.dataset.digit;
    handleDigitInput(digit);
  });
});

document.addEventListener("keydown", handleKeydown);

createGrid();
buildEmptyState();
setStatus("Load a puzzle to begin.");
