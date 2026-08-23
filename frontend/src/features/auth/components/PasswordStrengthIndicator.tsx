import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PasswordRequirement {
  met: boolean
  label: string
}

interface PasswordStrengthIndicatorProps {
  password: string
}

function getStrengthLevel(requirements: PasswordRequirement[]): {
  label: string
  color: string
  width: string
} {
  const metCount = requirements.filter((r) => r.met).length
  if (metCount <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/5' }
  if (metCount === 2) return { label: 'Fair', color: 'bg-orange-500', width: 'w-2/5' }
  if (metCount === 3) return { label: 'Good', color: 'bg-yellow-500', width: 'w-3/5' }
  if (metCount === 4) return { label: 'Strong', color: 'bg-lime-500', width: 'w-4/5' }
  return { label: 'Very Strong', color: 'bg-green-500', width: 'w-full' }
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation()

  const requirements: PasswordRequirement[] = [
    { met: password.length >= 8, label: t('auth.register.passwordRequirement.length') },
    { met: /[A-Z]/.test(password), label: t('auth.register.passwordRequirement.uppercase') },
    { met: /[a-z]/.test(password), label: t('auth.register.passwordRequirement.lowercase') },
    { met: /[0-9]/.test(password), label: t('auth.register.passwordRequirement.number') },
    { met: /[@$!%*?&]/.test(password), label: t('auth.register.passwordRequirement.special') },
  ]

  const strength = getStrengthLevel(requirements)

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Password strength:</span>
          <span className="text-xs font-medium">{strength.label}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-xs ${
              req.met ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            <Check
              className={`h-3 w-3 ${
                req.met ? 'text-green-600' : 'text-muted-foreground'
              }`}
            />
            {req.label}
          </div>
        ))}
      </div>
    </div>
  )
}
