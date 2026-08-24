# DD_PROD_02 — Frontend Page (Product Management)

> **Doc ID:** SKM-DD-PROD-02 | **Version:** 1.4 | **Status:** Released  
> **Last Updated:** 2026-08-24

---

## 1. Overview

The Product Management module consists of two main screens: **Product List** and **Product Form** (Create/Edit). The Product List enables merchants to view, search, filter, and manage their product catalog with bulk actions. The Product Form provides a comprehensive form for creating and editing product details, images, pricing, and inventory.

- **File Path (List):** `frontend/src/pages/merchant/ProductManagement.tsx`
- **File Path (Form):** `frontend/src/pages/merchant/ProductManagement.tsx` (embedded or separate component)
- **Route (List):** `/merchant/products`
- **Route (Create):** `/merchant/products/new`
- **Route (Edit):** `/merchant/products/:id/edit`
- **Shared Layout:** `DashboardLayout.tsx` (merchant dashboard wrapper with sidebar)

---

## 2. Layout Structure

Both pages use the merchant dashboard layout with sidebar navigation. The Product List displays a data table with action controls. The Product Form uses a multi-section form layout with image upload capabilities.

### 2.1 Product List Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                       BROWSER VIEWPORT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [A] PAGE HEADER                          │  │
│  │   "Product Management" + Breadcrumb                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [G] PENDING BANNER (conditional)          │  │
│  │   Shown to merchants with licenseStatus === 'pending'     │  │
│  │   Message (EN): "Your merchant account is pending         │  │
│  │   approval. Product management features are restricted    │  │
│  │   until your license is approved."                        │  │
│  │   Message (JA): "商品登録は承認後に利用できます"              │  │
│  │   Type: Info banner (amber background)                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [G2] REJECTION BANNER (conditional)       │  │
│  │   Shown to merchants with licenseStatus === 'rejected'    │  │
│  │   Message: "アカウントが拒否されました。理由: [rejectionReason]"│  │
│  │   ("Your account has been rejected. Reason: [...]")       │  │
│  │   Type: Error banner (red background)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [B] ACTION BAR                           │  │
│  │   [B1] Search Input    [B2] Status Filter                 │  │
│  │   [B3] Add Product Button (hidden for pending/rejected)   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [C] PRODUCT TABLE                        │  │
│  │   [C0] Select All  [C1] Thumbnail  [C2] Name             │  │
│  │   [C3] SKU         [C4] Price      [C5] Stock            │  │
│  │   [C6] Status      [C7] Featured   [C8] Edit (hidden*)   │  │
│  │   [C9] Delete (hidden*)  [C10] Toggle Active (hidden*)   │  │
│  │   * Action columns hidden for pending/rejected merchants  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [D] BULK ACTIONS BAR (hidden for pending) │  │
│  │   [D1] Selected Count  [D2] Activate  [D3] Deactivate    │  │
│  │   [D4] Delete                                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [E] PAGINATION                           │  │
│  │   [E1] Page Info  [E2] Prev/Next  [E3] Page Numbers      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [F] FOOTER CONTROLS                      │  │
│  │   [Language] [Theme]                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pending/Rejected Merchant Behavior (BR-PROD-027):**
- Merchants with `licenseStatus === 'pending'`: Product list loads with read-only table. All CRUD action buttons (Add Product, Edit, Delete, Toggle Active, Toggle Featured) and Bulk Actions bar are hidden. Pending banner `[G]` is displayed.
- Merchants with `licenseStatus === 'rejected'`: Same as pending, but rejection banner `[G2]` is displayed instead, showing the rejection reason.
- The product table data is still fetched (for read-only viewing), but the backend returns empty results for pending/rejected merchants (their products are not yet approved).
- If a pending/rejected merchant attempts a direct API call (POST/PATCH/DELETE), the backend returns `403 MERCHANT_NOT_APPROVED` or `403 MERCHANT_REJECTED`.

### 2.2 Product Form Layout (Create/Edit)

```
┌─────────────────────────────────────────────────────────────────┐
│                       BROWSER VIEWPORT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [A] PAGE HEADER                          │  │
│  │   "Add New Product" / "Edit Product" + Breadcrumb         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [B] ERROR ALERT (cond.)                  │  │
│  │   Shown on API errors                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [F] PRODUCT FORM                         │  │
│  │                                                           │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │  [F1] BASIC INFORMATION SECTION                   │   │  │
│  │   │  [F1-1] Product Name Input                        │   │  │
│  │   │  [F1-2] Short Description Textarea                │   │  │
│  │   │  [F1-3] Description Rich Text Editor              │   │  │
│  │   │  [F1-4] Category Select (tree)                    │   │  │
│  │   │  [F1-5] SKU Input                                 │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │  [F2] PRICING & INVENTORY SECTION                 │   │  │
│  │   │  [F2-1] Price Input                               │   │  │
│  │   │  [F2-2] Compare At Price Input                    │   │  │
│  │   │  [F2-3] Stock Quantity Input                      │   │  │
│  │   │  [F2-4] Low Stock Threshold Input                 │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │  [F3] PRODUCT IMAGES SECTION                      │   │  │
│  │   │  [F3-1] Image Upload Zone (drag & drop)           │   │  │
│  │   │  [F3-2] Image Preview Grid                        │   │  │
│  │   │  [F3-3] Reorder Handles                           │   │  │
│  │   │  [F3-4] Delete Image Button                       │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │  [F4] PRODUCT ATTRIBUTES SECTION                  │   │  │
│  │   │  [F4-1] Skin Types Checkbox Group                 │   │  │
│  │   │  [F4-2] Ingredients Tag Input                     │   │  │
│  │   │  [F4-3] Tags Tag Input                            │   │  │
│  │   │  [F4-4] Is Active Switch                          │   │  │
│  │   │  [F4-5] Is Featured Switch                        │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │  [F5] FORM ACTIONS SECTION                        │   │  │
│  │   │  [F5-1] Save Button                               │   │  │
│  │   │  [F5-2] Save as Draft Button                      │   │  │
│  │   │  [F5-3] Cancel Button                             │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  [G] FOOTER CONTROLS                      │  │
│  │   [Language] [Theme]                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Responsive Layout Breakpoints

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked form layout, table scrolls horizontally, bottom navigation |
| Tablet (`md:`) | 768px | Full-width form, collapsible sidebar, table with fewer columns |
| Desktop (`lg:`) | 1024px | Full-width form, sidebar navigation, full table columns |
| Wide (`xl:`) | 1280px | Full-width form, sidebar navigation, enhanced table spacing |

---

## 3. Form State & Validation (React Hook Form + Zod)

Both forms use `react-hook-form` with `zodResolver` for schema validation.

### 3.1 Product List Hook

```typescript
// frontend/src/features/merchant/products/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service';
import type { ProductListParams } from '../schemas/product.schema';

export function useProductList(params: ProductListParams) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      productService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      productService.update(id, { isFeatured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => productService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const bulkAction = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'activate' | 'deactivate' | 'delete' }) =>
      productService.bulkAction(ids, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateStock = useMutation({
    mutationFn: ({ id, stockQuantity }: { id: string; stockQuantity: number }) =>
      productService.updateStock(id, stockQuantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    products: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
    toggleActive,
    toggleFeatured,
    deleteProduct,
    bulkAction,
    updateStock,
  };
}
```

### 3.2 Product Form Hook

```typescript
// frontend/src/features/merchant/products/hooks/useProductForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { productSchema, type ProductFormData } from '../schemas/product.schema';
import { productService } from '../services/product.service';
import { toast } from 'sonner';

interface UseProductFormOptions {
  productId?: string;
}

export function useProductForm({ productId }: UseProductFormOptions = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(productId);

  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.getById(productId!),
    enabled: isEditing,
  });

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      shortDescription: '',
      description: '',
      categoryId: '',
      sku: '',
      price: 0,
      compareAtPrice: undefined,
      stockQuantity: 0,
      lowStockThreshold: 10,
      skinTypes: [],
      ingredients: [],
      tags: [],
      isActive: true,
      isFeatured: false,
      images: [],
    },
    mode: 'onChange',
  });

  // Populate form when editing
  React.useEffect(() => {
    if (existingProduct) {
      methods.reset({
        name: existingProduct.name,
        shortDescription: existingProduct.shortDescription,
        description: existingProduct.description,
        categoryId: existingProduct.categoryId,
        sku: existingProduct.sku ?? '',
        price: Number(existingProduct.price),
        compareAtPrice: existingProduct.compareAtPrice ? Number(existingProduct.compareAtPrice) : undefined,
        stockQuantity: existingProduct.stockQuantity,
        lowStockThreshold: existingProduct.lowStockThreshold,
        skinTypes: existingProduct.skinTypes ?? [],
        ingredients: existingProduct.ingredients ?? [],
        tags: existingProduct.tags ?? [],
        isActive: existingProduct.isActive,
        isFeatured: existingProduct.isFeatured,
        // Keep retained image URLs separate from newly selected File objects.
        images: [],
      });
    }
  }, [existingProduct, methods]);

  const createProduct = useMutation({
    mutationFn: (data: ProductFormData) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product saved successfully');
      navigate('/merchant/products');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  const updateProduct = useMutation({
    mutationFn: (data: ProductFormData) => productService.update(productId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Product updated successfully');
      navigate('/merchant/products');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  const saveAsDraft = useMutation({
    mutationFn: (data: ProductFormData) => {
      const draftData = { ...data, isActive: false };
      return productId
        ? productService.update(productId, draftData)
        : productService.create(draftData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product saved as draft');
      navigate('/merchant/products');
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (isEditing) {
      updateProduct.mutate(data);
    } else {
      createProduct.mutate(data);
    }
  };

  return {
    methods,
    isEditing,
    isLoadingProduct,
    isSubmitting: createProduct.isPending || updateProduct.isPending,
    onSubmit,
    saveAsDraft,
  };
}
```

### 3.3 Zod Validation Schema

```typescript
// frontend/src/features/merchant/products/schemas/product.schema.ts
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGES = 10;

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must not exceed 255 characters'),

  shortDescription: z
    .string()
    .min(1, 'Short description is required')
    .max(500, 'Short description must not exceed 500 characters'),

  description: z
    .string()
    .min(1, 'Description is required'),

  categoryId: z
    .string()
    .min(1, 'Category is required'),

  sku: z
    .string()
    .max(100, 'SKU must not exceed 100 characters')
    .optional()
    .or(z.literal('')),

  price: z
    .number()
    .min(0.01, 'Price must be greater than 0'),

  compareAtPrice: z
    .number()
    .min(0, 'Compare price must be 0 or greater')
    .optional(),

  stockQuantity: z
    .number()
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity must be 0 or greater'),

  lowStockThreshold: z
    .number()
    .int('Low stock threshold must be a whole number')
    .min(0, 'Low stock threshold must be 0 or greater')
    .default(10),

  skinTypes: z
    .array(z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal']))
    .optional(),

  ingredients: z
    .array(z.string().max(100, 'Ingredient must not exceed 100 characters'))
    .optional(),

  tags: z
    .array(z.string().max(50, 'Tag must not exceed 50 characters'))
    .optional(),

  isActive: z.boolean().default(true),

  isFeatured: z.boolean().default(false),

  images: z
    .array(z.instanceof(File))
    .min(1, 'At least one image is required')
    .max(MAX_IMAGES, `Maximum ${MAX_IMAGES} images allowed`)
    .refine(
      (files) => files.every((file) => file.size <= MAX_FILE_SIZE),
      'File exceeds maximum size of 5MB'
    )
    .refine(
      (files) => files.every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
      'File type not supported. Only JPG, PNG, and WebP images are accepted.'
    ),
}).refine(
  (data) => {
    if (data.compareAtPrice && data.price) {
      return data.compareAtPrice > data.price;
    }
    return true;
  },
  {
    message: 'Compare price must be greater than selling price',
    path: ['compareAtPrice'],
  }
);

export type ProductFormData = z.infer<typeof productSchema>;

// Edit forms must validate retained URLs plus newly selected files.
// Do not pass existing URL strings into z.instanceof(File).

// Schema for inline stock update
export const stockUpdateSchema = z.object({
  stockQuantity: z
    .number()
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity must be 0 or greater'),
});

export type StockUpdateFormData = z.infer<typeof stockUpdateSchema>;
```

---

## 4. Sub-Components

### 4.1 ProductTable Component

- **File Path:** `frontend/src/features/merchant/products/components/ProductTable.tsx`
- Uses `useProducts` hook
- Renders data table with columns: Select, Thumbnail, Name, SKU, Price, Stock, Status, Featured, Actions
- Supports row selection for bulk actions
- Inline stock editing on double-click

### 4.2 ProductForm Component

- **File Path:** `frontend/src/features/merchant/products/components/ProductForm.tsx`
- Uses `useProductForm` hook
- Renders multi-section form with Basic Information, Pricing & Inventory, Images, Attributes
- Handles form submission and validation

### 4.3 ImageUploadZone Component

- **File Path:** `frontend/src/features/merchant/products/components/ImageUploadZone.tsx`
- Drag & drop zone for image upload
- File type validation (JPG, PNG, WebP)
- File size validation (max 5MB)
- Shows upload progress indicator

### 4.4 ImagePreviewGrid Component

- **File Path:** `frontend/src/features/merchant/products/components/ImagePreviewGrid.tsx`
- Grid layout for uploaded image previews
- Drag handles for reordering
- Delete button on each image
- Primary image indicator (first image)

### 4.5 BulkActionsBar Component

- **File Path:** `frontend/src/features/merchant/products/components/BulkActionsBar.tsx`
- Shows selected count badge
- Dropdown menu with Activate, Deactivate, Delete options
- Confirmation dialogs for destructive actions
- **Hidden** for merchants with `pending` or `rejected` license status

### 4.6 InlineStockEditor Component

- **File Path:** `frontend/src/features/merchant/products/components/InlineStockEditor.tsx`
- Converts stock cell to editable input on double-click
- Enter/Blur saves, Escape cancels
- Shows loading state during update

### 4.7 DeleteConfirmDialog Component

- **File Path:** `frontend/src/features/merchant/products/components/DeleteConfirmDialog.tsx`
- AlertDialog for confirming product deletion
- Shows product name and warning message
- Loading state during deletion

### 4.8 CategorySelect Component

- **File Path:** `frontend/src/features/merchant/products/components/CategorySelect.tsx`
- Tree-structured category selection
- Fetches categories from API
- Nested options with expand/collapse

### 4.9 TagInput Component

- **File Path:** `frontend/src/features/merchant/products/components/TagInput.tsx`
- Tag input with add/remove functionality
- Keyboard support (Enter to add, Backspace to remove)
- Max length validation per tag

---

## 5. Action Buttons & Handlers

### 5.1 Add New Product

- **Button Type:** `button`
- **Location:** Action Bar on Product List
- **Action:**
  1. Navigate to `/merchant/products/new`
  2. Initialize empty product form with default values

### 5.2 Edit Product

- **Button Type:** `button`
- **Location:** Row actions in Product Table
- **Action:**
  1. Navigate to `/merchant/products/:id/edit`
  2. Fetch product data and populate form

### 5.3 Delete Product

- **Button Type:** `button`
- **Location:** Row actions in Product Table
- **Action:**
  1. Open DeleteConfirmDialog
  2. On confirm: `DELETE /api/v1/products/:id`
  3. Handle 409 CONFLICT error (active orders) with toast message
  4. Remove product from list on success
  5. Show success toast

### 5.4 Toggle Active Status

- **Button Type:** `switch`
- **Location:** Row actions in Product Table
- **Action:**
  1. Call `PATCH /api/v1/products/:id` with `{ isActive: newValue }`
  2. Update status badge
  3. Show success toast

### 5.5 Toggle Featured Status

- **Button Type:** `switch`
- **Location:** Row actions in Product Table
- **Action:**
  1. Call `PATCH /api/v1/products/:id` with `{ isFeatured: newValue }`
  2. Show/hide featured badge
  3. Show success toast

### 5.6 Save Product

- **Button Type:** `submit`
- **Location:** Form Actions in Product Form
- **Action:**
  1. Validate form with Zod schema
  2. Call `POST /api/v1/products` (Create) or `PATCH /api/v1/products/:id` (Update)
  3. Upload images via multipart/form-data
  4. Show success toast
  5. Navigate to `/merchant/products`

### 5.7 Save as Draft

- **Button Type:** `button`
- **Location:** Form Actions in Product Form
- **Action:**
  1. Set `isActive = false` internally
  2. Follow same flow as Save Product with `isActive = false`
  3. Show success toast "Product saved as draft"
  4. Navigate to `/merchant/products`

### 5.8 Cancel Form

- **Button Type:** `button`
- **Location:** Form Actions in Product Form
- **Action:**
  1. Navigate to `/merchant/products`
  2. Reset form state

### 5.9 Bulk Activate

- **Button Type:** `button`
- **Location:** Bulk Actions Dropdown
- **Action:**
  1. Call `PATCH /api/v1/products/bulk` with `{ ids: [...], action: 'activate' }`
  2. Update status badges
  3. Clear selection
  4. Show success toast

### 5.10 Bulk Deactivate

- **Button Type:** `button`
- **Location:** Bulk Actions Dropdown
- **Action:**
  1. Show confirmation dialog
  2. On confirm: `PATCH /api/v1/products/bulk` with `{ ids: [...], action: 'deactivate' }`
  3. Update status badges
  4. Clear selection
  5. Show success toast

### 5.11 Bulk Delete

- **Button Type:** `button`
- **Location:** Bulk Actions Dropdown
- **Action:**
  1. Show confirmation dialog with product count
  2. On confirm: `DELETE /api/v1/products/bulk` with `{ ids: [...] }`
  3. Remove products from list
  4. Clear selection
  5. Show success toast

### 5.12 Inline Stock Update

- **Trigger:** Double-click on stock cell
- **Action:**
  1. Convert cell to editable input
  2. On Enter/Blur: `PATCH /api/v1/products/:id/stock` with `{ stockQuantity: newValue }`
  3. Revert to text display
  4. Update stock value and warning states
  5. On Escape: Cancel edit, revert to original value

---

## 6. Lookup Data

The Product Form requires the following lookup data:

### 6.1 Categories (Fetched from API)

| Value | Label (EN) | Label (JA) | Children |
|-------|------------|------------|----------|
| `skincare` | Skincare | スキンケア | Cleansers, Toners, Serums, Moisturizers, Sunscreen |
| `makeup` | メイクアップ | Makeup | Foundation, Lip, Eye, Cheek |
| `haircare` | Haircare | ヘアケア | Shampoo, Conditioner, Treatment |
| `bodycare` | Bodycare | ボディケア | Body Wash, Lotion, Hand Care |

### 6.2 Skin Types (Hardcoded)

| Value | Label (EN) | Label (JA) |
|-------|------------|------------|
| `dry` | Dry | 乾燥肌 |
| `oily` | Oily | 脂性肌 |
| `combination` | Combination | 混合肌 |
| `sensitive` | Sensitive | 敏感肌 |
| `normal` | Normal | 普通肌 |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid input
- Inline error message below the field
- Real-time validation on blur and change
- Error codes: VAL-PROD-001 through VAL-PROD-017

### 7.2 Form-Level Errors

- Alert banner at top of form for API errors
- Toast notification for operation success/failure
- Error codes: PROD_001 through PROD_003, SYS_001, NET_ERR

### 7.3 Loading States

- Skeleton loaders on product list initial load
- Spinner on submit buttons during API calls
- Disable form inputs during submission
- Progress bar on image upload
- Prevent double submission

### 7.4 Empty State

- Message: "No products found" when list is empty
- Call-to-action: "Add your first product" button

### 7.5 Network Error Handling

- Toast notification: "Network error. Please check your connection"
- Retry button on failed requests
- Optimistic updates for toggle operations

### 7.6 License Status Error Handling

**Frontend Route Guard (for `/merchant/products/*` routes):**

The guard allows pending/rejected merchants to view the product list dashboard in restricted mode (read-only) instead of redirecting to home. CRUD operations are hidden in the UI, and direct API calls are blocked by the backend guard.

```typescript
// frontend/src/features/merchant/products/guards/merchantProducts.guard.ts
import { useMemo } from 'react';
import { useMerchantProfile } from '@/features/auth/hooks/useMerchantProfile';

interface MerchantProductsGuardResult {
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  rejectionReason: string | null;
  isLoading: boolean;
  /** Whether to show CRUD buttons (Add, Edit, Delete, Bulk Actions) */
  showCrudActions: boolean;
  /** Whether to show pending approval banner */
  showPendingBanner: boolean;
  /** Whether to show rejection banner */
  showRejectionBanner: boolean;
}

export function useMerchantProductsGuard(): MerchantProductsGuardResult {
  const { data: merchantProfile, isLoading } = useMerchantProfile();

  return useMemo(() => {
    if (isLoading) {
      return {
        isApproved: false,
        isPending: false,
        isRejected: false,
        rejectionReason: null,
        isLoading: true,
        showCrudActions: false,
        showPendingBanner: false,
        showRejectionBanner: false,
      };
    }

    const status = merchantProfile?.licenseStatus;
    const isApproved = status === 'approved';
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';

    return {
      isApproved,
      isPending,
      isRejected,
      rejectionReason: merchantProfile?.rejectionReason ?? null,
      isLoading: false,
      showCrudActions: isApproved, // Only approved merchants can see CRUD buttons
      showPendingBanner: isPending,
      showRejectionBanner: isRejected,
    };
  }, [merchantProfile, isLoading]);
}
```

**Usage in ProductManagement page:**

```tsx
// In ProductManagement.tsx
import { useMerchantProductsGuard } from '@/features/merchant/products/guards/merchantProducts.guard';

export default function ProductManagement() {
  const guard = useMerchantProductsGuard();

  return (
    <div>
      {guard.showPendingBanner && (
        <Alert variant="info">
          <AlertTitle>Pending Approval</AlertTitle>
          <AlertDescription>
            Your merchant account is pending approval. Product management features are restricted until your license is approved.
            {/* JA: 商品登録は承認後に利用できます */}
          </AlertDescription>
        </Alert>
      )}

      {guard.showRejectionBanner && (
        <Alert variant="error">
          <AlertTitle>アカウント拒否</AlertTitle>
          <AlertDescription>
            アカウントが拒否されました。理由: {guard.rejectionReason}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Bar: Add Product button hidden when !guard.showCrudActions */}
      <ActionBar showAddButton={guard.showCrudActions} />

      {/* Product Table: action columns hidden when !guard.showCrudActions */}
      <ProductTable showActions={guard.showCrudActions} />

      {/* Bulk Actions Bar: hidden when !guard.showCrudActions */}
      {guard.showCrudActions && <BulkActionsBar />}
    </div>
  );
}
```

**API Error Handling (403 MERCHANT_NOT_APPROVED / MERCHANT_REJECTED):**

Direct API calls (POST, PATCH, DELETE) are still blocked by the backend guard. The frontend interceptor handles these errors gracefully:

```typescript
// In product service or API client
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const { error: errorCode, message } = error.response.data;
      
      if (errorCode === 'MERCHANT_NOT_APPROVED') {
        toast.error('Your account is pending approval. Product management is not available at this time.');
        // Do NOT redirect - user stays on restricted dashboard
      } else if (errorCode === 'MERCHANT_REJECTED') {
        toast.error(message); // Includes rejection reason
        // Do NOT redirect - user stays on restricted dashboard
      }
    }
    return Promise.reject(error);
  }
);
```

### 7.7 Active Order Error Handling (409 CONFLICT)

When attempting to delete a product with active orders:

```typescript
// In delete product handler
try {
  await productService.softDelete(productId);
  toast.success('Product deleted successfully');
  queryClient.invalidateQueries({ queryKey: ['products'] });
} catch (error) {
  if (error.response?.status === 409) {
    toast.error('Cannot delete product with active orders. All orders must be completed first.');
  } else {
    toast.error('Failed to delete product. Please try again.');
  }
}
```

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_01](./DD_Product_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_04](./DD_Product_Management_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_PROD_05](./DD_Product_Management_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_COMMON_01](../00_common/DD_COMMON_01_UI_COMPONENTS.md) | Shared UI components (Button, Input, Card, Switch) |
| [DD_COMMON_04](../00_common/DD_COMMON_04_SHARED_VALIDATION.md) | Shared validation utilities |
| [機能設計書_Product_Management](../商品管理画面_機能設計書.md) | Full functional specification |
| [画面項目設計書_Product_Management](../画面項目設計書_Product_Management.md) | Screen items specification |
