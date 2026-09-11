import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InlineStockEditorProps {
  value: number
  onSave: (value: number) => void
  disabled?: boolean
  className?: string
}

export function InlineStockEditor({
  value,
  onSave,
  disabled = false,
  className,
}: InlineStockEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const num = parseInt(editValue, 10)
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num)
    } else {
      setEditValue(String(value))
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Input
          ref={inputRef}
          type="number"
          min={0}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-20 text-xs"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
        >
          <Check className="h-3 w-3 text-emerald-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('group flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'text-sm font-medium',
          value <= 0 && 'text-destructive',
          value > 0 && value <= 10 && 'text-amber-600',
        )}
      >
        {value}
      </span>
      {!disabled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
