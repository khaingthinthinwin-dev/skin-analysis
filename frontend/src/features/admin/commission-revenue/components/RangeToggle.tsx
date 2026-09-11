import React from 'react';
import { TrendRange } from '../services/commission.service';

interface RangeToggleProps {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
}

const RANGES: { value: TrendRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
];

// [H6] 7d | 30d | 90d | 1y toggle group for the trend chart (DD_02).
export const RangeToggle: React.FC<RangeToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={`px-3.5 py-1.5 text-xs font-medium border-none cursor-pointer ${
            value === r.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground'
          } ${r.value !== '1y' ? 'border-r border-r-border' : ''}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
};
