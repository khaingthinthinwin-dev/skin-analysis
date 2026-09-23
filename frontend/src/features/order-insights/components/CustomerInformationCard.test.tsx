import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerInformationCard } from './CustomerInformationCard';
import type { MerchantCustomerInfoDto } from '../types/merchantOrderFulfillment.types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));

const customer: MerchantCustomerInfoDto = {
  name: 'Aye Aye',
  email: 'aye@example.com',
  phone: '+95 912345678',
};

describe('CustomerInformationCard', () => {
  it('renders customer name, email and phone', () => {
    render(<CustomerInformationCard customer={customer} />);

    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Aye Aye')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('aye@example.com')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('+95 912345678')).toBeInTheDocument();
  });

  it('does not render a phone row when the phone is null', () => {
    render(<CustomerInformationCard customer={{ ...customer, phone: null }} />);

    expect(screen.getByText('Aye Aye')).toBeInTheDocument();
    expect(screen.queryByText('Phone')).not.toBeInTheDocument();
  });
});