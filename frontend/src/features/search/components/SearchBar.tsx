import { useState, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
}

const DEBOUNCE_MS = 300

export function SearchBar({ value, onChange, onSubmit, placeholder }: SearchBarProps) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayValue = focused ? draft : value

  const cancelDebounce = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(() => {
    cancelDebounce()
    onChange(draft)
    onSubmit(draft)
    setDraft(draft)
    setFocused(false)
  }, [cancelDebounce, draft, onChange, onSubmit])

  const handleTyping = useCallback((text: string) => {
    setDraft(text)
    cancelDebounce()
    timerRef.current = setTimeout(() => {
      onChange(text)
    }, DEBOUNCE_MS)
  }, [cancelDebounce, onChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    flush()
  }

  const handleClear = () => {
    cancelDebounce()
    setDraft('')
    onChange('')
    onSubmit('')
    setFocused(false)
  }

  const handleBlur = () => {
    cancelDebounce()
    setFocused(false)
    setDraft(value)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={displayValue}
          onChange={(e) => handleTyping(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Search by product name, ingredient, or concern...'}
          className="pl-9 pr-9"
        />
        {displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="submit" size="icon" variant="default">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  )
}
