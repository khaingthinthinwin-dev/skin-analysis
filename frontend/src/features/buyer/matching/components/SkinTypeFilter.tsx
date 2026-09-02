import { Checkbox } from '@/components/ui/checkbox'

const SKIN_TYPES = ['oily', 'dry', 'combination', 'normal', 'sensitive'] as const

interface SkinTypeFilterProps {
  selected: string[]
  onChange: (types: string[]) => void
  disabled?: boolean
}

export function SkinTypeFilter({ selected, onChange, disabled }: SkinTypeFilterProps) {
  // TODO: Implement skin type filter with i18n
  const handleChange = (type: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, type])
    } else {
      onChange(selected.filter((t) => t !== type))
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Skin Type</h3>
      {SKIN_TYPES.map((type) => (
        <label key={type} className="flex items-center gap-2">
          <Checkbox
            checked={selected.includes(type)}
            onCheckedChange={(checked) => handleChange(type, !!checked)}
            disabled={disabled}
          />
          <span className="capitalize">{type}</span>
        </label>
      ))}
    </div>
  )
}
