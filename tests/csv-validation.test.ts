import { describe, it, expect } from "vitest";
import { parseCsv, validateCsvRows, CsvValidationError, CSV_LIMITS } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses a standard CSV with a header row", () => {
    const rows = parseCsv("firstName,lastName\nAda,Lovelace\nGrace,Hopper");
    expect(rows).toEqual([
      { firstName: "Ada", lastName: "Lovelace" },
      { firstName: "Grace", lastName: "Hopper" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('name,note\n"Doe, John","Says ""hi"""');
    expect(rows).toEqual([{ name: "Doe, John", note: 'Says "hi"' }]);
  });

  it("skips fully blank rows", () => {
    const rows = parseCsv("a,b\n1,2\n\n3,4");
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns an empty array for a header-only file", () => {
    expect(parseCsv("a,b\n")).toEqual([]);
  });
});

describe("validateCsvRows", () => {
  it("accepts a small, well-formed row set", () => {
    expect(() => validateCsvRows([{ a: "1" }, { a: "2" }])).not.toThrow();
  });

  it("rejects a row count over the configured limit", () => {
    const rows = Array.from({ length: CSV_LIMITS.maxRows + 1 }, () => ({ a: "1" }));
    expect(() => validateCsvRows(rows)).toThrow(CsvValidationError);
  });

  it("rejects a field longer than the configured limit", () => {
    const rows = [{ note: "x".repeat(CSV_LIMITS.maxFieldLength + 1) }];
    expect(() => validateCsvRows(rows)).toThrow(CsvValidationError);
  });

  it("accepts a field exactly at the limit", () => {
    const rows = [{ note: "x".repeat(CSV_LIMITS.maxFieldLength) }];
    expect(() => validateCsvRows(rows)).not.toThrow();
  });
});
