import { AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  message?: string
}

export function EmptyState({ message = 'No products match your filters. Try adjusting your criteria.' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  )
}
