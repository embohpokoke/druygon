#!/usr/bin/env node
/**
 * Set or clear the Dru PIN. The PIN is read from stdin (not argv) and is never printed.
 *   printf '%s\n' "$PIN" | node /opt/druygon/scripts/set-dru-pin.js
 *   node /opt/druygon/scripts/set-dru-pin.js --clear
 * Interactive TTY: type PIN, Enter; input is hidden.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const store = require('../api/src/runtime/dru_auth_store');

function hideEchoRead() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      let buf = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (c) => { buf += c; });
      process.stdin.on('end', () => resolve(String(buf).trim()));
      process.stdin.on('error', reject);
      return;
    }
    const rs = process.stdin;
    const wasRaw = rs.isRaw;
    process.stderr.write('PIN Dru (4–10 digit, tidak ditampilkan): ');
    let buf = '';
    rs.setRawMode && rs.setRawMode(true);
    rs.resume();
    rs.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        cleanup();
        process.stderr.write('\n');
        resolve(buf);
        return;
      }
      if (ch === '\u0003') { cleanup(); process.exit(1); }
      if (ch === '\u007f' || ch === '\b') { buf = buf.slice(0, -1); return; }
      buf += ch;
    };
    function cleanup() {
      rs.removeListener('data', onData);
      try { rs.setRawMode && rs.setRawMode(!!wasRaw); } catch (_) {}
    }
    rs.on('data', onData);
  });
}

async function main() {
  if (process.argv.includes('--clear') || process.argv.includes('--unset')) {
    store.clearPin();
    process.stderr.write('PIN Dru dihapus. Route terlindungi akan menolak masuk (PIN belum diatur).\n');
    return;
  }
  const pin = await hideEchoRead();
  await store.setPin(pin);
  process.stderr.write('PIN Dru disimpan sebagai hash Argon2id. Nilai PIN tidak dicatat.\n');
}

main().catch((err) => {
  process.stderr.write((err.code === 'INVALID_PIN' ? err.message : 'Gagal menyimpan PIN') + '\n');
  process.exit(1);
});
