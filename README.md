# Base64 JS Benchmark

This project benchmarks the native `Uint8Array.toBase64()` and `Uint8Array.fromBase64()` methods in JavaScript.

## Requirements

- Bun or Node.js version 25+ (for native support of the Base64 methods)

## Installation

```bash
npm install
```

## Running the Benchmark

With Node.js:
```bash
npm start
```

With Bun:
```bash
bun run benchmark.js
```

The benchmark will test encoding and decoding performance for various payload sizes and output results to the console.