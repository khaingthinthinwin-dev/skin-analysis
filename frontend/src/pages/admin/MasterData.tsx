import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMasterData } from '@/features/admin/master-data/hooks/useMasterData';
import { MasterDataTable } from '@/features/admin/master-data/components/MasterDataTable';
import { MasterDataFormDialog } from '@/features/admin/master-data/components/MasterDataFormDialog';
import { AdPlacementsTable } from '@/features/admin/master-data/components/AdPlacementsTable';
import { apiErrorMessage } from '@/features/admin/master-data/utils';
import {
  MASTER_DATA_TYPES,
  type CategoryRow,
  type CreateCategoryInput,
  type DiscountTypeRow,
  type MasterDataType,
  type OrderStatusRow,
  type UserRoleRow,
} from '@/features/admin/master-data/services/masterData.service';

const TAB_LABEL_KEYS: Record<MasterDataType, string> = {
  'user-roles': 'admin.masterData.tabs.userRoles',
  'order-statuses': 'admin.masterData.tabs.orderStatuses',
  'discount-types': 'admin.masterData.tabs.discountTypes',
  categories: 'admin.masterData.tabs.categories',
  'ad-placements': 'admin.masterData.tabs.adPlacements',
};

const NON_CATEGORY_TABS = [
  'user-roles',
  'order-statuses',
  'discount-types',
] as const;

export default function MasterData() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<MasterDataType>('user-roles');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const userRoles = useMasterData<UserRoleRow>('user-roles');
  const orderStatuses = useMasterData<OrderStatusRow>('order-statuses');
  const discountTypes = useMasterData<DiscountTypeRow>('discount-types');
  const categories = useMasterData<CategoryRow>('categories');

  const rowsByType = {
    'user-roles': userRoles.rowsQuery,
    'order-statuses': orderStatuses.rowsQuery,
    'discount-types': discountTypes.rowsQuery,
    categories: categories.rowsQuery,
  } as const;

  const handleCreate = (input: CreateCategoryInput) => {
    categories.createMutation.mutate(input, {
      onSuccess: () => {
        toast.success(t('admin.masterData.toast.categoryCreated', 'Category created'));
        setShowCreateDialog(false);
      },
      onError: (error) =>
        toast.error(apiErrorMessage(error, t('admin.masterData.toast.categoryCreateFailed', 'Failed to create category'))),
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.masterData.title', 'Master Data')}</h1>
          <p className="text-muted-foreground">
            {t('admin.masterData.subtitle', 'Reference data that drives roles, order flow, promotions and the product catalogue')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'categories' && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.masterData.newCategory', 'New Category')}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(next) => setTab(next as MasterDataType)}>
        <TabsList className="h-auto flex-wrap">
          {MASTER_DATA_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {t(TAB_LABEL_KEYS[type], type)}
            </TabsTrigger>
          ))}
        </TabsList>

        {NON_CATEGORY_TABS.map((type) => (
          <TabsContent key={type} value={type}>
            <MasterDataTable
              type={type}
              rows={rowsByType[type].data}
              isLoading={rowsByType[type].isPending}
            />
          </TabsContent>
        ))}

        <TabsContent value="categories">
          <MasterDataTable
            type="categories"
            rows={categories.rowsQuery.data}
            isLoading={categories.rowsQuery.isPending}
          />
        </TabsContent>

        <TabsContent value="ad-placements">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
              {t('admin.masterData.adPlacementsDescription', 'Placements are the fixed slots ads can be bought for. This tab shows the default placement definitions (code + name) only — tier packages, duration, max ads and daily rates are stored in ad_fee_settings and managed under Advertisements.')}
            </CardContent>
          </Card>
          <div className="mt-4">
            <AdPlacementsTable />
          </div>
        </TabsContent>
      </Tabs>

      {showCreateDialog && (
        <MasterDataFormDialog
          open
          isLoading={categories.createMutation.isPending}
          onSubmit={handleCreate}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
