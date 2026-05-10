import { FcfaPipe } from './fcfa.pipe';

describe('FcfaPipe', () => {
  let pipe: FcfaPipe;

  beforeEach(() => {
    pipe = new FcfaPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('retourne "— FCFA" pour null', () => {
    expect(pipe.transform(null)).toBe('— FCFA');
  });

  it('retourne "— FCFA" pour undefined', () => {
    expect(pipe.transform(undefined)).toBe('— FCFA');
  });

  it('retourne "0 FCFA" pour 0', () => {
    expect(pipe.transform(0)).toBe('0 FCFA');
  });

  it('formate 15000 en "15 000 FCFA" (séparateur insécable)', () => {
    const result = pipe.transform(15000);
    // fr-FR utilise   (narrow no-break space) ou   (no-break space)
    // on normalise pour la comparaison en remplaçant tous les espaces Unicode
    const normalized = result.replace(/\s/g, ' ');
    expect(normalized).toBe('15 000 FCFA');
  });

  it('formate -15000 en "-15 000 FCFA" (montant négatif)', () => {
    const result = pipe.transform(-15000);
    const normalized = result.replace(/\s/g, ' ');
    expect(normalized).toBe('-15 000 FCFA');
  });

  it('formate 1500000 en "1 500 000 FCFA" (millions)', () => {
    const result = pipe.transform(1500000);
    const normalized = result.replace(/\s/g, ' ');
    expect(normalized).toBe('1 500 000 FCFA');
  });
});
