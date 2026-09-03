import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload, Trash2, Camera } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useProfile } from '../hooks/useProfile'
import { updateProfileSchema, type UpdateProfileFormData } from '@/schemas/profile.schema'
import { toast } from 'sonner'
import type { Profile } from '@/types/profile.types'

interface ProfileFormProps {
  profile: Profile
}

function getInitials(name: string): string {
  return (name || '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function compressImage(file: File, maxWidth = 400, maxHeight = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = (err) => reject(err)
      img.src = e.target?.result as string
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const { t } = useTranslation()
  const { updateProfile } = useProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialAvatar = profile.avatar || profile.avatarUrl || ''
  const [avatarPreview, setAvatarPreview] = useState<string>(initialAvatar)
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name || '',
      avatarUrl: initialAvatar,
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.')
      return
    }

    try {
      setIsProcessingImage(true)
      const dataUrl = await compressImage(file)
      setAvatarPreview(dataUrl)
      form.setValue('avatarUrl', dataUrl, { shouldValidate: true, shouldDirty: true })
      toast.success('Avatar image loaded! Click "Save Changes" to save.')
    } catch {
      toast.error('Failed to read selected image file.')
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview('')
    form.setValue('avatarUrl', '', { shouldValidate: true, shouldDirty: true })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data)
      toast.success(t('profile.form.success', 'Profile updated successfully'))
    } catch {
      toast.error(t('profile.form.error', 'Failed to update profile'))
    }
  }

  const currentName = form.watch('name') || profile.name

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.form.title', 'Edit Profile')}</CardTitle>
        <CardDescription>
          {t('profile.form.description', 'Update your personal information')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Selection Section */}
            <div className="space-y-3">
              <FormLabel>Profile Avatar</FormLabel>
              <div className="flex items-center space-x-6">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to select local avatar"
                >
                  <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-sm transition-opacity group-hover:opacity-80">
                    <AvatarImage src={avatarPreview || undefined} alt={currentName} />
                    <AvatarFallback className="text-xl font-medium">
                      {getInitials(currentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                    >
                      {isProcessingImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Choose Local Photo
                    </Button>

                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={handleRemoveAvatar}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Avatar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select any JPG, PNG, WEBP image from your device.
                  </p>
                </div>
              </div>
            </div>

            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.form.name', 'Full Name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.form.namePlaceholder', 'Enter your name')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('profile.form.nameDescription', 'Your name as it appears on your account')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateProfile.isPending || isProcessingImage}>
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('profile.form.saving', 'Saving...')}
                </>
              ) : (
                t('profile.form.save', 'Save Changes')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
