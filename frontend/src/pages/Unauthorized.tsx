import { Link } from 'react-router'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Unauthorized() {

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-4 px-4">
      <Shield className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-center text-muted-foreground">
        You do not have permission to access this page.
      </p>
      <Button asChild>
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  )
}
