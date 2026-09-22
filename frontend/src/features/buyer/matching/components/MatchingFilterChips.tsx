import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MatchQueryParams } from '@/schemas/matching.schema';

interface MatchingFilterChipsProps {
  filters: MatchQueryParams;
  onRemove: (key: keyof MatchQueryParams) => void;
  onClearAll: () => void;
}

export function MatchingFilterChips({ filters, onRemove, onClearAll }: MatchingFilterChipsProps) {
  const chips: { key: keyof MatchQueryParams; label: string }[] = [];

  if (filters.categoryId) chips.push({ key: 'categoryId', label: `Category: ${filters.categoryId}` });
  if (filters.skinTypes && filters.skinTypes !== 'all') chips.push({ key: 'skinTypes', label: `Skin: ${filters.skinTypes}` });
  if (filters.ingredients) chips.push({ key: 'ingredients', label: `Ingredients: ${filters.ingredients}` });
  if (filters.minPrice !== undefined) chips.push({ key: 'minPrice', label: `Min: ${filters.minPrice}` });
  if (filters.maxPrice !== undefined) chips.push({ key: 'maxPrice', label: `Max: ${filters.maxPrice}` });
  if (filters.rating !== undefined) chips.push({ key: 'rating', label: `Rating: ${filters.rating}+` });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button onClick={() => onRemove(chip.key)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground">
        Clear all
      </button>
    </div>
  );
}
