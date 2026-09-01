import { describe, expect, it } from 'vitest';
import {
  arrondiCommercial,
  assertCentimes,
  eurosVersCentimes,
  formaterEuros,
} from '@/domain/tarification/centimes';

describe('centimes', () => {
  it("s'éloigne de zéro sur la moitié, symétriquement", () => {
    expect(arrondiCommercial(0.5)).toBe(1);
    expect(arrondiCommercial(-0.5)).toBe(-1);
    expect(arrondiCommercial(1.4)).toBe(1);
    expect(arrondiCommercial(-1.4)).toBe(-1);
  });

  it('convertit des euros sans dérive de flottant', () => {
    expect(eurosVersCentimes(19.99)).toBe(1999);
    expect(eurosVersCentimes(0.1 + 0.2)).toBe(30);
  });

  it('refuse un montant qui ne serait pas un entier de centimes', () => {
    expect(() => assertCentimes(10.5)).toThrow(/entier de centimes/);
    expect(() => assertCentimes(Number.NaN)).toThrow();
  });

  it('formate en euros français', () => {
    expect(formaterEuros(123_456).replace(/ | /g, ' ')).toBe('1 234,56 €');
  });
});
