import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryProgress } from './DeliveryProgress';
import { OrderStatus } from '../types/orderInsights.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object' && 'defaultValue' in fallback) {
        return (fallback as { defaultValue?: string }).defaultValue ?? key;
      }
      return key;
    },
    i18n: { resolvedLanguage: 'en-US', language: 'en-US' },
  }),
}));

describe('DeliveryProgress', () => {
  it('keeps the default variant unchanged: no Next caption, no step numbers, no timestamps', () => {
    const { container } = render(<DeliveryProgress currentStatus={OrderStatus.PLACED} />);

    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.queryAllByText('3')).toHaveLength(0);
    expect(container.textContent).not.toContain('Sep');
    const current = container.querySelector('li[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toContain('Placed');
  });

  it('merchant variant: dashed Next step, numbered pending steps and a history timestamp', () => {
    const { container } = render(
      <DeliveryProgress
        currentStatus={OrderStatus.PLACED}
        variant="merchant"
        timestamps={{ [OrderStatus.PLACED]: '2026-09-01T12:00:00.000Z' }}
      />,
    );

    expect(screen.getByText('Next')).toBeInTheDocument();
    // Confirmed is the dashed next step, so it is neither done nor numbered.
    expect(screen.queryAllByText('2')).toHaveLength(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(container.textContent).toMatch(/Sep \d/);
  });

  it('merchant variant: delivered shows every step complete with no Next step', () => {
    const { container } = render(
      <DeliveryProgress
        currentStatus={OrderStatus.DELIVERED}
        variant="merchant"
        timestamps={{
          [OrderStatus.PLACED]: '2026-09-01T12:00:00.000Z',
          [OrderStatus.CONFIRMED]: '2026-09-01T12:00:00.000Z',
          [OrderStatus.PACKED]: '2026-09-02T12:00:00.000Z',
          [OrderStatus.SHIPPED]: '2026-09-02T12:00:00.000Z',
          [OrderStatus.OUT_FOR_DELIVERY]: '2026-09-03T12:00:00.000Z',
          [OrderStatus.DELIVERED]: '2026-09-03T12:00:00.000Z',
        }}
      />,
    );

    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.queryAllByText('6')).toHaveLength(0);
    const connectors = container.querySelectorAll('[class*="mt-[17px]"]');
    expect(connectors).toHaveLength(5);
    connectors.forEach((line) => expect(line.className).toContain('bg-[#7c3aed]'));
  });

  it('merchant variant: connectors stay neutral until their step is reached', () => {
    const { container } = render(
      <DeliveryProgress currentStatus={OrderStatus.PLACED} variant="merchant" />,
    );

    const connectors = container.querySelectorAll('[class*="mt-[17px]"]');
    expect(connectors).toHaveLength(5);
    connectors.forEach((line) => expect(line.className).toContain('bg-[#e5e7eb]'));
  });

  it('hides step timestamps gracefully when history is unavailable', () => {
    const { container } = render(
      <DeliveryProgress currentStatus={OrderStatus.DELIVERED} variant="merchant" />,
    );

    expect(container.textContent).not.toMatch(/Sep \d/);
    expect(container.textContent).not.toMatch(/\d\d?:\d\d [AP]M/);
  });
});