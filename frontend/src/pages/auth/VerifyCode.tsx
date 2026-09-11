import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, RotateCcw } from 'lucide-react'
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
import { verifyCodeSchema, type VerifyCodeFormData } from '@/schemas/auth.schema'
import { ROUTES } from '@/lib/constants'

export default function VerifyCode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string })?.email

  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!email) {
      navigate(ROUTES.FORGOT_PASSWORD)
    }
  }, [email, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return
    setIsResending(true)
    setError(null)
    setResendSuccess(false)
    try {
      await authService.forgotPassword({ email })
      setResendSuccess(true)
      setCooldown(60)
    } catch (err) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to resend code')
      setError(errorMessage)
    } finally {
      setIsResending(false)
    }
  }, [email, cooldown])

  const form = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (data: VerifyCodeFormData) => {
    if (!email) return
    setIsLoading(true)
    setError(null)
    try {
      await authService.verifyCode({ email, code: data.code })
      navigate(ROUTES.RESET_PASSWORD, { state: { email, code: data.code } })
    } catch (err) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Invalid verification code')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!email) {
    return null
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3')

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.verifyCode.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('auth.verifyCode.description', { email: maskedEmail })}
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {resendSuccess && (
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <AlertDescription>{t('auth.verifyCode.resendSuccess')}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.verifyCode.codeLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      placeholder={t('auth.verifyCode.codePlaceholder')}
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={6}
                      className="text-center text-2xl tracking-[0.5em]"
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
                  {t('auth.verifyCode.verifying')}
                </>
              ) : (
                t('auth.verifyCode.submit')
              )}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="text-sm"
          >
            <RotateCcw className="mr-2 h-3 w-3" />
            {cooldown > 0
              ? t('auth.verifyCode.resendCooldown', { seconds: cooldown })
              : t('auth.verifyCode.resend')}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          to={ROUTES.FORGOT_PASSWORD}
          className="text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-1 inline h-3 w-3" />
          {t('auth.verifyCode.backToEmail')}
        </Link>
      </CardFooter>
    </Card>
  )
}
