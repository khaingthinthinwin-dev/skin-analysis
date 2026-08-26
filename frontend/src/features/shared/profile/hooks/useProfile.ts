import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService } from '../services/profile.service'
import type { UpdateProfileData, ChangePasswordData } from '@/types/profile.types'
import { useAuth } from '@/providers/AuthProvider'

export function useProfile() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => profileService.updateProfile(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await refreshUser()
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordData) => profileService.changePassword(data),
  })

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
  }
}
