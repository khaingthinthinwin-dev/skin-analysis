import { api } from '@/lib/api';

export const MASTER_DATA_TYPES = [
  'user-roles',
  'order-statuses',
  'discount-types',
  'categories',
  'ad-placements',
] as const;

export type MasterDataType = (typeof MASTER_DATA_TYPES)[number];

export type MasterDataCrudType = Exclude<MasterDataType, 'ad-placements'>;

export interface UserRoleRow {
  id: number;
  roleCode: string;
  roleName: string;
  description: string | null;
  isActive: boolean;
}

export interface OrderStatusRow {
  id: number;
  statusCode: string;
  statusName: string;
  displayOrder: number;
  isTerminalState: boolean;
  description: string | null;
}

export interface DiscountTypeRow {
  id: number;
  typeCode: string;
  typeName: string;
  isActive: boolean;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
  sortOrder: number;
  parent?: { id: string; name: string } | null;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
}

export const masterDataService = {
  list: async <T>(type: MasterDataCrudType): Promise<T[]> => {
    const response = await api.get(`/admin/master-data/${type}`);
    return response.data.data as T[];
  },

  createCategory: async (input: CreateCategoryInput): Promise<CategoryRow> => {
    const response = await api.post('/admin/master-data/categories', input);
    return response.data.data as CategoryRow;
  },
};
