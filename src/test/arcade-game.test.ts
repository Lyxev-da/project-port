import { beforeEach, describe, expect, it } from 'vitest';
import { analyze, PATTERNS, TIERS, toDigits } from '@/arcade/game/patterns';
import { applyDaily, applyRoll, effectiveLuck, fresh, loadSave, storeSave, upgradesFor } from '@/arcade/game/state';
import { currentAccount, isDevAccount, parseSaveEnvelope } from '@/arcade/game/accounts';

describe('Migrated original arcade rules', () => {
  beforeEach(() => localStorage.clear());

  it('does not trust an old local account record or the reserved developer name', () => {
    localStorage.setItem('one-in-a-zillion:current-account:v1', JSON.stringify({ id: 'dev-0000-zzzk', name: 'zzzk', role: 'admin' }));
    expect(currentAccount()).toBeNull();
    expect(isDevAccount({ id: 'player', name: 'zzzk', role: 'player', createdAt: 0 })).toBe(false);
  });

  it('retains the original 26 patterns and 12 rarity tiers', () => {
    expect(PATTERNS).toHaveLength(26);
    expect(TIERS).toHaveLength(12);
  });

  it('retains the exact jackpot and lucky sevens multipliers for 7777', () => {
    const result = analyze(toDigits('7777'));
    expect(result.hits.map((hit) => [hit.id, hit.mult])).toEqual([['lucky7', 77], ['jackpot', 1000]]);
    expect(result.rarity).toBe(77000);
  });

  it('keeps Hardcore luck at exactly one even with imported boosts', () => {
    const save = fresh('hardcore');
    save.up.luck = 20; save.charm = 25; save.chargeCount = 10;
    expect(effectiveLuck(save)).toBe(1);
  });

  it('offers only digit slots and auto-roll in Hardcore', () => {
    expect(upgradesFor('hardcore').map((upgrade) => upgrade.id)).toEqual(['slots', 'auto']);
    expect(upgradesFor('normal')).toHaveLength(11);
  });

  it('preserves the Standard daily gift of 50 coins and 25 boosted rolls', () => {
    const result = applyDaily(fresh('normal'));
    expect(result.coins).toBe(50);
    expect(result.next.charm).toBe(25);
    expect(effectiveLuck(result.next)).toBe(2);
  });

  it('never adds a luck charm to the Hardcore daily gift', () => {
    const result = applyDaily(fresh('hardcore'));
    expect(result.coins).toBe(50);
    expect(result.next.charm).toBe(0);
  });

  it('restores each mode independently after a roll', () => {
    const { next } = applyRoll(fresh('normal'), analyze(toDigits('7777')), false);
    storeSave(next);
    expect(loadSave('normal').rolls).toBe(1);
    expect(loadSave('normal').best[0]?.digits).toBe('7777');
    expect(loadSave('hardcore').rolls).toBe(0);
  });

  it('imports the original portable save format without mixing mode progress', () => {
    const standard = fresh('normal'); standard.rolls = 12;
    const hardcore = fresh('hardcore'); hardcore.rolls = 3;
    const result = parseSaveEnvelope(JSON.stringify({ format: 'one-in-a-zillion-save', modes: { normal: standard, hardcore } }));
    expect(result.modes.normal.rolls).toBe(12);
    expect(result.modes.hardcore.rolls).toBe(3);
    expect(() => parseSaveEnvelope('{"unrelated":true}')).toThrow('not a One in a Zillion save');
  });
});