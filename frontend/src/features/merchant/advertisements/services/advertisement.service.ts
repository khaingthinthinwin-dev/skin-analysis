import { api } from '@/lib/api';

export interface Advertisement {
  id: string;
  shopId: string;
  title: string;
  content?: string;
  announcementMessage: string;
  imageUrl?: string;
  linkUrl?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed';
  paymentAmount?: number;
  startsAt: string;
  expiresAt: string;
  rejectionReason?: string;
  createdAt: string;
  shop?: { id: string; name: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAdInput {
  title: string;
  content?: string;
  announcementMessage: string;
  imageUrl?: string;
  linkUrl?: string;
  paymentAmount: number;
  startsAt: string;
  expiresAt: string;
}

export const merchantAdService = {
  getAds: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Advertisement>> => {
    const response = await api.get('/merchant/advertisements', { params });
    return response.data;
  },

  getAd: async (id: string): Promise<Advertisement> => {
    const response = await api.get(`/merchant/advertisements/${id}`);
    return response.data;
  },

  createAd: async (data: CreateAdInput): Promise<Advertisement> => {
    const response = await api.post('/merchant/advertisements', data);
    return response.data;
  },

  updateAd: async (
    id: string,
    data: Partial<CreateAdInput>,
  ): Promise<Advertisement> => {
    const response = await api.patch(`/merchant/advertisements/${id}`, data);
    return response.data;
  },

  deleteAd: async (id: string): Promise<void> => {
    await api.delete(`/merchant/advertisements/${id}`);
  },
};
import api from '@/lib/api-client'
import type { AdListParams, AdPackage, Advertisement, PaginatedAds } from '../types'

interface ApiEnvelope<T> {
  data: T
}

function unwrap<T>(value: ApiEnvelope<T> | ApiEnvelope<ApiEnvelope<T>>): T {
  const firstValue = value.data
  if (typeof firstValue === 'object' && firstValue !== null && 'data' in firstValue) {
    if ('meta' in firstValue) {
      return firstValue as T
    }
    return (firstValue as ApiEnvelope<T>).data as T
  }
  return firstValue as T
}

export const advertisementService = {
  async listPackages(): Promise<AdPackage[]> {
    const response = await api.get<ApiEnvelope<AdPackage[]>>('/ads/packages')
    return unwrap(response.data)
  },

  async listAds(params: AdListParams): Promise<PaginatedAds> {
    const response = await api.get<ApiEnvelope<PaginatedAds>>('/ads/my-ads', { params })
    return unwrap(response.data)
  },

  async selectPackage(id: string): Promise<Advertisement> {
    const response = await api.post<ApiEnvelope<Advertisement>>(`/ads/packages/${id}/select`)
    return unwrap(response.data)
  },

  async uploadContent(id: string, formData: FormData): Promise<Advertisement> {
    const response = await api.patch<ApiEnvelope<Advertisement>>(`/ads/${id}/content`, formData)
    return unwrap(response.data)
  },

  async updateContent(id: string, formData: FormData): Promise<Advertisement> {
    const response = await api.patch<ApiEnvelope<Advertisement>>(`/ads/${id}`, formData)
    return unwrap(response.data)
  },

  async pay(id: string, paymentReference?: string): Promise<Advertisement> {
    const response = await api.post<ApiEnvelope<Advertisement>>(`/ads/${id}/pay`, { paymentReference })
    return unwrap(response.data)
  },

  async toggle(id: string, isActive: boolean): Promise<Advertisement> {
    const response = await api.patch<ApiEnvelope<Advertisement>>(`/ads/${id}/toggle`, { isActive })
    return unwrap(response.data)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/ads/${id}`)
  },
}
