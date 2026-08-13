// Minimal, dependency-free CSV parser. Handles quoted fields and commas within quotes,
// which covers standard CRM/lead exports without pulling in an external package.

// Bounds on any CSV upload, enforced before rows are touched — an unbounded upload could
// exhaust memory or turn a single request into a multi-minute row-by-row DB write.
export const CSV_LIMITS = {
  maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
  maxRows: 5000,
  maxFieldLength: 500,
};

export class CsvValidationError extends Error {}

export function validateCsvFileSize(file: File): void {
  if (file.size > CSV_LIMITS.maxFileSizeBytes) {
    throw new CsvValidationError(
      `File is ${(file.size / (1024 * 1024)).toFixed(1)}MB, exceeding the ${CSV_LIMITS.maxFileSizeBytes / (1024 * 1024)}MB limit.`
    );
  }
}

export function validateCsvRows(rows: Record<string, string>[]): void {
  if (rows.length > CSV_LIMITS.maxRows) {
    throw new CsvValidationError(
      `CSV has ${rows.length} data rows, exceeding the ${CSV_LIMITS.maxRows}-row limit. Split it into smaller files.`
    );
  }
  for (let i = 0; i < rows.length; i++) {
    for (const value of Object.values(rows[i])) {
      if (value.length > CSV_LIMITS.maxFieldLength) {
        throw new CsvValidationError(
          `Row ${i + 2}: a field exceeds the ${CSV_LIMITS.maxFieldLength}-character limit.`
        );
      }
    }
  }
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== "")).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = (row[i] ?? "").trim();
    });
    return record;
  });
}

function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
