import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'matchScore', label: 'Best Match' },
  { value: 'price', label: 'Price' },
  { value: 'rating', label: 'Rating' },
] as const;

type SortField = 'matchScore' | 'price' | 'rating' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface MatchingSortSelectProps {
  sort: SortField;
  order: SortOrder;
  source: string;
  onChange: (sort: SortField, order: SortOrder) => void;
}

export function MatchingSortSelect({ sort, order, onChange }: MatchingSortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={sort} onValueChange={(v) => onChange(v as SortField, order)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={order} onValueChange={(v) => onChange(sort, v as SortOrder)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Desc</SelectItem>
          <SelectItem value="asc">Asc</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
