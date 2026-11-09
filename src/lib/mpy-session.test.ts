import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTestReport, errorLine } from "./mpy-session";
describe("mpy-session", () => {
  it("parses board test report", () => {
    const r = parseTestReport('x\nTESTS:[["/tests/a.py","test_x",false,"AssertionError()",3]]\n');
    assert.deepEqual(r, [{ file: "/tests/a.py", name: "test_x", ok: false, error: "AssertionError()", ms: 3 }]);
  });
  it("finds traceback line for file", () => {
    assert.equal(errorLine('File "/main.py", line 2\nFile "/main.py", line 14, in read', "/main.py"), 14);
    assert.equal(errorLine('File "/x.py", line 2', "/main.py"), null);
  });
});
