import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  const decrementDisabled = disabled || value <= min;
  const incrementDisabled = disabled || value >= max;

  return (
    <div className="inline-flex items-center rounded-md border">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={decrementDisabled}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-l-md transition-colors',
          decrementDisabled
            ? 'cursor-not-allowed text-muted-foreground/40'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="flex h-10 min-w-12 items-center justify-center border-x px-3 text-sm font-medium tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={incrementDisabled}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-r-md transition-colors',
          incrementDisabled
            ? 'cursor-not-allowed text-muted-foreground/40'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
