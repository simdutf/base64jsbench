// Helper to format bytes nicely
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KiB';
  return (bytes/(1024*1024)).toFixed(2) + ' MiB';
}

// Check support first
if (typeof Uint8Array.prototype.toBase64 !== 'function' ||
    typeof Uint8Array.fromBase64 !== 'function') {
  console.log('Error: Your Node.js version does not support the native Uint8Array Base64 methods yet.');
  process.exit(1);
}

console.log('Running benchmarks for all payload sizes...\n');

(async () => {
  // Use a lightweight pseudo-random generator to avoid overloading
  // the system RNG when generating large buffers repeatedly.
  function pseudoRandomBytes(len) {
    const out = new Uint8Array(len);
    // simple 32-bit LCG seeded by Math.random()
    let seed = Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      out[i] = seed & 0xFF;
    }
    return out;
  }

  // Payload sizes to test (fixed list; selector removed)
  const sizeOptions = [1024, 16384, 32768, 65536];
  const results = [];

  // run sequentially for each size
  for (const s of sizeOptions) {
    console.log(`--- Payload size: ${formatBytes(s)} ---`);

    const orig = pseudoRandomBytes(s);
    const b64 = orig.toBase64();
    const bytesDecoded = Math.floor(b64.length * 3 / 4);
    const bytesEncoded = orig.length;

    // Using Benchmark.js: return a promise that resolves when suite completes
    await new Promise((resolve) => {
      const Benchmark = require('benchmark');
      const suite = new Benchmark.Suite();

      suite.add('Uint8Array.fromBase64()', function() {
        Uint8Array.fromBase64(b64);
      }, { minSamples: 5 });

      suite.add('Uint8Array.toBase64()', function() {
        orig.toBase64();
      }, { minSamples: 5 });

      suite.on('cycle', function(event) {
        const name = event.target.name;
        const hz = event.target.hz || 0;
        const ms = hz > 0 ? 1000 / hz : Infinity;
        const bytes = name.includes('fromBase64') ? bytesDecoded : bytesEncoded;
        const mbps = hz > 0 ? (bytes * hz / (1024*1024)) : 0;
        const msDisplay = isFinite(ms) ? Number(ms).toPrecision(3) : '∞';
        const line = `${name.padEnd(32)} ${msDisplay} ms → ${mbps.toFixed(2)} MiB/s`;
        console.log(line);
        results.push({ size: s, name, hz, mbps: parseFloat(mbps) });
      });

      suite.on('complete', function() {
        // validation
        let valid = false;
        try {
          const decoded = Uint8Array.fromBase64(b64);
          valid = decoded && decoded.length === orig.length;
          if (valid) {
            for (let i = 0; i < orig.length; i++) { if (decoded[i] !== orig[i]) { valid = false; break; } }
          }
        } catch (e) {
          console.log(`\nValidation     : error (${e.message})`);
          resolve();
          return;
        }
        console.log(`\nValidation     : ${valid ? 'OK' : 'MISMATCH'}`);
        const fastest = suite.filter('fastest').map('name');
        console.log(`Fastest: ${fastest.join(', ')}\n`);
        resolve();
      });

      suite.run({ async: true });
    });
  }

  console.log('All benchmarks completed.');
})();