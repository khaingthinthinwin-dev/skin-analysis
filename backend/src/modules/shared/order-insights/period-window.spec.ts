import { UnprocessableEntityException } from '@nestjs/common';
import { resolvePeriodWindowUtc } from './period-window';

describe('resolvePeriodWindowUtc', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves today as the current UTC day (inclusive from/to, half-open query)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T23:59:59.000Z'));

    const window = resolvePeriodWindowUtc('today');

    expect(window).toEqual({
      code: 'today',
      from: '2026-03-15',
      to: '2026-03-15',
      start: new Date('2026-03-15T00:00:00.000Z'),
      endExclusive: new Date('2026-03-16T00:00:00.000Z'),
    });
  });

  it('resolves this_month as the current UTC calendar month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T00:00:00.000Z'));

    const window = resolvePeriodWindowUtc('this_month');

    expect(window).toEqual({
      code: 'this_month',
      from: '2026-03-01',
      to: '2026-03-31',
      start: new Date('2026-03-01T00:00:00.000Z'),
      endExclusive: new Date('2026-04-01T00:00:00.000Z'),
    });
  });

  it('resolves last_month as the previous UTC calendar month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

    const window = resolvePeriodWindowUtc('last_month');

    expect(window).toEqual({
      code: 'last_month',
      from: '2026-02-01',
      to: '2026-02-28',
      start: new Date('2026-02-01T00:00:00.000Z'),
      endExclusive: new Date('2026-03-01T00:00:00.000Z'),
    });
  });

  it('treats custom `to` as an inclusive calendar day', () => {
    const window = resolvePeriodWindowUtc('custom', '2026-08-01', '2026-08-31');

    expect(window).toEqual({
      code: 'custom',
      from: '2026-08-01',
      to: '2026-08-31',
      start: new Date('2026-08-01T00:00:00.000Z'),
      endExclusive: new Date('2026-09-01T00:00:00.000Z'),
    });
  });

  it('throws 422 when custom is missing from/to', () => {
    expect(() => resolvePeriodWindowUtc('custom')).toThrow(
      UnprocessableEntityException,
    );
    expect(() => resolvePeriodWindowUtc('custom')).toThrow(
      'Select a start and end date',
    );
  });

  it('throws 422 when custom to is before from', () => {
    expect(() =>
      resolvePeriodWindowUtc('custom', '2026-08-31', '2026-08-01'),
    ).toThrow('Select a start and end date');
  });
});
