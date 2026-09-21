import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PeriodSelector } from './PeriodSelector';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

describe('PeriodSelector', () => {
  it('shows custom date inputs and reports changes', () => {
    const onChange = vi.fn();
    render(<PeriodSelector value="custom" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } });
    expect(onChange).toHaveBeenCalledWith('custom', '2026-09-01', undefined);
  });
});