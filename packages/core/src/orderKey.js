// Fractional indexing (LexoRank-like) for base62
const ALPH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPH.length;

function idx(ch) { return ALPH.indexOf(ch); }

// Return a key strictly between a and b (a < result < b), where a or b may be null.
// Based on the "fractional indexing" trick: compare digit-by-digit; when a gap exists, pick the midpoint.
// If one side runs out of digits, treat it as below MIN (for a) or above MAX (for b).
export function keyBetween(a, b) {
  const A = a || '';
  const B = b || '';

  let i = 0;
  let out = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // virtual digits: a[-∞]=MIN-1, b[+∞]=MAX+1
    const av = i < A.length ? idx(A[i]) : -1;    // -1 means below the smallest
    const bv = i < B.length ? idx(B[i]) : BASE;  // BASE means above the largest
    const lo = Math.max(av, 0);                  // clamp to [0..BASE-1]
    const hi = Math.min(bv, BASE - 1);

    if (lo + 1 < hi) {
      // choose midpoint
      const mid = Math.floor((lo + hi) / 2);
      out += ALPH[mid];
      return out;
    }

    // No room at this digit; copy from A if present, otherwise use MIN and continue
    if (av === -1) {
      // A exhausted => we're inserting before B; emit MIN and keep going
      out += ALPH[0];
    } else {
      out += A[i];
    }
    i += 1;
  }
}

// Convenience helpers
export function keyAfter(a) {
  // strictly after 'a' (b = +∞)
  return keyBetween(a, null);
}

export function keyBefore(b) {
  // strictly before 'b' (a = -∞)
  return keyBetween(null, b);
}
