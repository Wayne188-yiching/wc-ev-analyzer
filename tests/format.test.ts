import { formatNT, formatPct, dateLabel, uid } from '../src/lib/format';

describe('formatNT', () => {
  it('1. formatNT(0) → "NT$0"', () => {
    expect(formatNT(0)).toBe('NT$0');
  });

  it('2. formatNT(1234) → "NT$1,234"', () => {
    expect(formatNT(1234)).toBe('NT$1,234');
  });

  it('3. formatNT(1234.7) rounds → "NT$1,235"', () => {
    expect(formatNT(1234.7)).toBe('NT$1,235');
  });

  it('4. formatNT(-300) places minus before NT$ → "-NT$300"', () => {
    expect(formatNT(-300)).toBe('-NT$300');
  });

  it('5. formatNT(300, { signed: true }) → "+NT$300"', () => {
    expect(formatNT(300, { signed: true })).toBe('+NT$300');
  });

  it('6. formatNT(-300, { signed: true }) → "-NT$300"', () => {
    expect(formatNT(-300, { signed: true })).toBe('-NT$300');
  });

  it('7. formatNT(NaN) guarded → "NT$0"', () => {
    expect(formatNT(NaN)).toBe('NT$0');
  });

  it('8. formatNT(Infinity) guarded → "NT$0"', () => {
    expect(formatNT(Infinity)).toBe('NT$0');
  });
});

describe('formatPct', () => {
  it('9. formatPct(5.0) → "+5.0%"', () => {
    expect(formatPct(5.0)).toBe('+5.0%');
  });

  it('10. formatPct(-3.2) → "-3.2%"', () => {
    expect(formatPct(-3.2)).toBe('-3.2%');
  });

  it('11. formatPct(0) → "+0.0%"', () => {
    expect(formatPct(0)).toBe('+0.0%');
  });

  it('12. formatPct(4.876, 2) → "+4.88%"', () => {
    expect(formatPct(4.876, 2)).toBe('+4.88%');
  });

  it('13. formatPct(NaN) → "—"', () => {
    expect(formatPct(NaN)).toBe('—');
  });
});

describe('dateLabel', () => {
  it('14. dateLabel("2026-06-19T12:00:00") → "6/19 (週五)"', () => {
    expect(dateLabel('2026-06-19T12:00:00')).toBe('6/19 (週五)');
  });

  it('15. dateLabel("not-a-date") guarded → "—"', () => {
    expect(dateLabel('not-a-date')).toBe('—');
  });
});

describe('uid', () => {
  it('16. returns non-empty [a-z0-9]+ string', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[a-z0-9]+$/);
    expect(id.length).toBeGreaterThanOrEqual(4);
  });

  it('17. 100 calls produce 100 distinct values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});
