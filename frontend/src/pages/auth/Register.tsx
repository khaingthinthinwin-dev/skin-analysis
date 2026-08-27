import { useState, useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Check, Upload, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema'
import { ROUTES, getDashboardRoute } from '@/lib/constants'

export default function Register() {
  const { t } = useTranslation()
  const { register, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const navigate = useNavigate()

  if (authLoading) return null
  if (isAuthenticated && user) return <Navigate to={getDashboardRoute(user.role)} replace />
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'buyer',
      licenseFile: null,
      agreeToTerms: false,
    },
    mode: 'onTouched',
  })

  const password = form.watch('password')
  const role = form.watch('role')

  const passwordRequirements = [
    { met: password.length >= 8, label: t('auth.register.passwordRequirement.length') },
    { met: /[A-Z]/.test(password), label: t('auth.register.passwordRequirement.uppercase') },
    { met: /[a-z]/.test(password), label: t('auth.register.passwordRequirement.lowercase') },
    { met: /[0-9]/.test(password), label: t('auth.register.passwordRequirement.number') },
    { met: /[@$!%*?&]/.test(password), label: t('auth.register.passwordRequirement.special') },
  ]

  const handleFileChange = (file: File | null) => {
    setLicenseFile(file)
    form.setValue('licenseFile', file, { shouldValidate: true })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleRemoveFile = () => {
    setLicenseFile(null)
    form.setValue('licenseFile', null, { shouldValidate: true })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      await register({ ...data, licenseFile })
      toast.success(t('auth.register.success'))
      navigate(ROUTES.LOGIN)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.register.title')}</CardTitle>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.fullName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('auth.register.fullNamePlaceholder')}
                      autoComplete="name"
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('auth.register.emailPlaceholder')}
                      autoComplete="email"
                      maxLength={255}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth.register.passwordPlaceholder')}
                        autoComplete="new-password"
                        maxLength={128}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    <div className="mt-2 space-y-1">
                      {passwordRequirements.map((req, index) => (
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
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.confirmPassword')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('auth.register.confirmPasswordPlaceholder')}
                        autoComplete="new-password"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showConfirmPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('auth.register.iAm')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value: string) => {
                        field.onChange(value)
                        if (value === 'buyer') {
                          handleRemoveFile()
                        }
                      }}
                      value={field.value || ''}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="buyer" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t('auth.register.buyer')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="merchant" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t('auth.register.merchant')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* License Upload - Conditional */}
            {role === 'merchant' && (
              <FormField
                control={form.control}
                name="licenseFile"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {t('auth.register.license')}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <div>
                        {licenseFile ? (
                          <div className="flex items-center justify-between rounded-md border border-input bg-background p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm">{licenseFile.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={handleRemoveFile}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors ${
                              isDragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-input hover:border-primary/50'
                            }`}
                          >
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground text-center">
                              {t('auth.register.licensePlaceholder')}
                            </p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileChange(file)
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t('auth.register.licenseHelper')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Terms of Service Checkbox */}
            <FormField
              control={form.control}
              name="agreeToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(checked: boolean) => field.onChange(checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('auth.register.agreeToTerms')}{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        {t('auth.register.termsOfService')}
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.register.submitting')}
                </>
              ) : (
                t('auth.register.submit')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t('auth.register.hasAccount')}{' '}
          <Link to={ROUTES.LOGIN} className="text-primary hover:underline">
            {t('auth.register.signIn')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
