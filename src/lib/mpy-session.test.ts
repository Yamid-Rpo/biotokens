import { describe, it, expect } from "vitest";
import { parseTestReport, errorLine } from "./mpy-session";
describe("mpy-session", () => {
  it("parses board test report", () => {
    const r = parseTestReport('x\nTESTS:[["/tests/a.py","test_x",false,"AssertionError()",3]]\n');
    expect(r).toEqual([{ file: "/tests/a.py", name: "test_x", ok: false, error: "AssertionError()", ms: 3 }]);
  });
  it("finds traceback line for file", () => {
    expect(errorLine('File "/main.py", line 2\nFile "/main.py", line 14, in read', "/main.py")).toBe(14);
    expect(errorLine('File "/x.py", line 2', "/main.py")).toBeNull();
  });
});
