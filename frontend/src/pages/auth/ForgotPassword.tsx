import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { authService } from '@/services/auth.service'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas/auth.schema'
import { ROUTES } from '@/lib/constants'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      await authService.forgotPassword(data)
      setIsSuccess(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset link'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">{t('auth.forgotPassword.successTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            {t('auth.forgotPassword.successMessage')}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm text-primary hover:underline"
          >
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.forgotPassword.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('auth.forgotPassword.description')}
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.forgotPassword.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
                      autoComplete="email"
                      autoFocus
                      inputMode="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.forgotPassword.submitting')}
                </>
              ) : (
                t('auth.forgotPassword.submit')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          to={ROUTES.LOGIN}
          className="text-sm text-primary hover:underline"
        >
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </CardFooter>
    </Card>
  )
}
