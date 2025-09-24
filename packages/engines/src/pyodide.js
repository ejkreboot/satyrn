let _pyodidePromise = null;
let _py = null;
let _capture = { out: "", err: "" };

async function loadPyodideOnce(indexURL = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/") {
  if (!_pyodidePromise) {
    if (!globalThis.loadPyodide) {
      const s = document.createElement("script");
      s.src = indexURL + "pyodide.js";
      document.head.appendChild(s);
      await new Promise((res, rej) => { s.onload = res; s.onerror = rej; });
    }
    _pyodidePromise = globalThis.loadPyodide({ indexURL });
  }
  return _pyodidePromise;
}

function setupStdIO(py) {
  // Redirect Python stdout/stderr into our capture buffers
  if (typeof py.setStdout === "function") {
    py.setStdout({ batched: (s) => (_capture.out += s) });
  }
  if (typeof py.setStderr === "function") {
    py.setStderr({ batched: (s) => (_capture.err += s) });
  }
}

export function createPyodideEngine(opts = {}) {
  const { indexURL } = opts;

  async function ensure() {
    _py = _py || (await loadPyodideOnce(indexURL));
    // idempotent: safe to call more than once
    setupStdIO(_py);
    return _py;
  }

  return {
    kind: "pyodide",
    async run(code) {
      const py = await ensure();

      // clear previous capture
      _capture.out = "";
      _capture.err = "";

      let result;
      try {
        result = py.runPython(code);
      } catch (e) {
        _capture.err += String(e?.message || e);
      }

      const outputs = [];
      if (_capture.out) outputs.push({ mime: "text/plain", data: _capture.out });
      if (result !== undefined && result !== null && String(result) !== "None") {
        outputs.push({ mime: "text/plain", data: String(result) });
      }
      if (_capture.err) outputs.push({ mime: "text/plain", data: _capture.err });

      // Always return at least one output so UI shows a box
      return outputs.length ? outputs : [{ mime: "text/plain", data: "" }];
    }
  };
}
