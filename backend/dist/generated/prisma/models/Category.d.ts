import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type CategoryModel = runtime.Types.Result.DefaultSelection<Prisma.$CategoryPayload>;
export type AggregateCategory = {
    _count: CategoryCountAggregateOutputType | null;
    _avg: CategoryAvgAggregateOutputType | null;
    _sum: CategorySumAggregateOutputType | null;
    _min: CategoryMinAggregateOutputType | null;
    _max: CategoryMaxAggregateOutputType | null;
};
export type CategoryAvgAggregateOutputType = {
    sortOrder: number | null;
};
export type CategorySumAggregateOutputType = {
    sortOrder: number | null;
};
export type CategoryMinAggregateOutputType = {
    id: string | null;
    name: string | null;
    slug: string | null;
    parentId: string | null;
    iconUrl: string | null;
    sortOrder: number | null;
    createdAt: Date | null;
};
export type CategoryMaxAggregateOutputType = {
    id: string | null;
    name: string | null;
    slug: string | null;
    parentId: string | null;
    iconUrl: string | null;
    sortOrder: number | null;
    createdAt: Date | null;
};
export type CategoryCountAggregateOutputType = {
    id: number;
    name: number;
    slug: number;
    parentId: number;
    iconUrl: number;
    sortOrder: number;
    createdAt: number;
    _all: number;
};
export type CategoryAvgAggregateInputType = {
    sortOrder?: true;
};
export type CategorySumAggregateInputType = {
    sortOrder?: true;
};
export type CategoryMinAggregateInputType = {
    id?: true;
    name?: true;
    slug?: true;
    parentId?: true;
    iconUrl?: true;
    sortOrder?: true;
    createdAt?: true;
};
export type CategoryMaxAggregateInputType = {
    id?: true;
    name?: true;
    slug?: true;
    parentId?: true;
    iconUrl?: true;
    sortOrder?: true;
    createdAt?: true;
};
export type CategoryCountAggregateInputType = {
    id?: true;
    name?: true;
    slug?: true;
    parentId?: true;
    iconUrl?: true;
    sortOrder?: true;
    createdAt?: true;
    _all?: true;
};
export type CategoryAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
    cursor?: Prisma.CategoryWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | CategoryCountAggregateInputType;
    _avg?: CategoryAvgAggregateInputType;
    _sum?: CategorySumAggregateInputType;
    _min?: CategoryMinAggregateInputType;
    _max?: CategoryMaxAggregateInputType;
};
export type GetCategoryAggregateType<T extends CategoryAggregateArgs> = {
    [P in keyof T & keyof AggregateCategory]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateCategory[P]> : Prisma.GetScalarType<T[P], AggregateCategory[P]>;
};
export type CategoryGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithAggregationInput | Prisma.CategoryOrderByWithAggregationInput[];
    by: Prisma.CategoryScalarFieldEnum[] | Prisma.CategoryScalarFieldEnum;
    having?: Prisma.CategoryScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: CategoryCountAggregateInputType | true;
    _avg?: CategoryAvgAggregateInputType;
    _sum?: CategorySumAggregateInputType;
    _min?: CategoryMinAggregateInputType;
    _max?: CategoryMaxAggregateInputType;
};
export type CategoryGroupByOutputType = {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    iconUrl: string | null;
    sortOrder: number;
    createdAt: Date;
    _count: CategoryCountAggregateOutputType | null;
    _avg: CategoryAvgAggregateOutputType | null;
    _sum: CategorySumAggregateOutputType | null;
    _min: CategoryMinAggregateOutputType | null;
    _max: CategoryMaxAggregateOutputType | null;
};
export type GetCategoryGroupByPayload<T extends CategoryGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<CategoryGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof CategoryGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], CategoryGroupByOutputType[P]> : Prisma.GetScalarType<T[P], CategoryGroupByOutputType[P]>;
}>>;
export type CategoryWhereInput = {
    AND?: Prisma.CategoryWhereInput | Prisma.CategoryWhereInput[];
    OR?: Prisma.CategoryWhereInput[];
    NOT?: Prisma.CategoryWhereInput | Prisma.CategoryWhereInput[];
    id?: Prisma.StringFilter<"Category"> | string;
    name?: Prisma.StringFilter<"Category"> | string;
    slug?: Prisma.StringFilter<"Category"> | string;
    parentId?: Prisma.StringNullableFilter<"Category"> | string | null;
    iconUrl?: Prisma.StringNullableFilter<"Category"> | string | null;
    sortOrder?: Prisma.IntFilter<"Category"> | number;
    createdAt?: Prisma.DateTimeFilter<"Category"> | Date | string;
    parent?: Prisma.XOR<Prisma.CategoryNullableScalarRelationFilter, Prisma.CategoryWhereInput> | null;
    children?: Prisma.CategoryListRelationFilter;
    products?: Prisma.ProductListRelationFilter;
};
export type CategoryOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    parentId?: Prisma.SortOrderInput | Prisma.SortOrder;
    iconUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    sortOrder?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    parent?: Prisma.CategoryOrderByWithRelationInput;
    children?: Prisma.CategoryOrderByRelationAggregateInput;
    products?: Prisma.ProductOrderByRelationAggregateInput;
};
export type CategoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    slug?: string;
    AND?: Prisma.CategoryWhereInput | Prisma.CategoryWhereInput[];
    OR?: Prisma.CategoryWhereInput[];
    NOT?: Prisma.CategoryWhereInput | Prisma.CategoryWhereInput[];
    name?: Prisma.StringFilter<"Category"> | string;
    parentId?: Prisma.StringNullableFilter<"Category"> | string | null;
    iconUrl?: Prisma.StringNullableFilter<"Category"> | string | null;
    sortOrder?: Prisma.IntFilter<"Category"> | number;
    createdAt?: Prisma.DateTimeFilter<"Category"> | Date | string;
    parent?: Prisma.XOR<Prisma.CategoryNullableScalarRelationFilter, Prisma.CategoryWhereInput> | null;
    children?: Prisma.CategoryListRelationFilter;
    products?: Prisma.ProductListRelationFilter;
}, "id" | "slug">;
export type CategoryOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    parentId?: Prisma.SortOrderInput | Prisma.SortOrder;
    iconUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    sortOrder?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    _count?: Prisma.CategoryCountOrderByAggregateInput;
    _avg?: Prisma.CategoryAvgOrderByAggregateInput;
    _max?: Prisma.CategoryMaxOrderByAggregateInput;
    _min?: Prisma.CategoryMinOrderByAggregateInput;
    _sum?: Prisma.CategorySumOrderByAggregateInput;
};
export type CategoryScalarWhereWithAggregatesInput = {
    AND?: Prisma.CategoryScalarWhereWithAggregatesInput | Prisma.CategoryScalarWhereWithAggregatesInput[];
    OR?: Prisma.CategoryScalarWhereWithAggregatesInput[];
    NOT?: Prisma.CategoryScalarWhereWithAggregatesInput | Prisma.CategoryScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Category"> | string;
    name?: Prisma.StringWithAggregatesFilter<"Category"> | string;
    slug?: Prisma.StringWithAggregatesFilter<"Category"> | string;
    parentId?: Prisma.StringNullableWithAggregatesFilter<"Category"> | string | null;
    iconUrl?: Prisma.StringNullableWithAggregatesFilter<"Category"> | string | null;
    sortOrder?: Prisma.IntWithAggregatesFilter<"Category"> | number;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Category"> | Date | string;
};
export type CategoryCreateInput = {
    id?: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    parent?: Prisma.CategoryCreateNestedOneWithoutChildrenInput;
    children?: Prisma.CategoryCreateNestedManyWithoutParentInput;
    products?: Prisma.ProductCreateNestedManyWithoutCategoryInput;
};
export type CategoryUncheckedCreateInput = {
    id?: string;
    name: string;
    slug: string;
    parentId?: string | null;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    children?: Prisma.CategoryUncheckedCreateNestedManyWithoutParentInput;
    products?: Prisma.ProductUncheckedCreateNestedManyWithoutCategoryInput;
};
export type CategoryUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    parent?: Prisma.CategoryUpdateOneWithoutChildrenNestedInput;
    children?: Prisma.CategoryUpdateManyWithoutParentNestedInput;
    products?: Prisma.ProductUpdateManyWithoutCategoryNestedInput;
};
export type CategoryUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    children?: Prisma.CategoryUncheckedUpdateManyWithoutParentNestedInput;
    products?: Prisma.ProductUncheckedUpdateManyWithoutCategoryNestedInput;
};
export type CategoryCreateManyInput = {
    id?: string;
    name: string;
    slug: string;
    parentId?: string | null;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
};
export type CategoryUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CategoryUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CategoryNullableScalarRelationFilter = {
    is?: Prisma.CategoryWhereInput | null;
    isNot?: Prisma.CategoryWhereInput | null;
};
export type CategoryListRelationFilter = {
    every?: Prisma.CategoryWhereInput;
    some?: Prisma.CategoryWhereInput;
    none?: Prisma.CategoryWhereInput;
};
export type CategoryOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type CategoryCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    parentId?: Prisma.SortOrder;
    iconUrl?: Prisma.SortOrder;
    sortOrder?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type CategoryAvgOrderByAggregateInput = {
    sortOrder?: Prisma.SortOrder;
};
export type CategoryMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    parentId?: Prisma.SortOrder;
    iconUrl?: Prisma.SortOrder;
    sortOrder?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type CategoryMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    parentId?: Prisma.SortOrder;
    iconUrl?: Prisma.SortOrder;
    sortOrder?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type CategorySumOrderByAggregateInput = {
    sortOrder?: Prisma.SortOrder;
};
export type CategoryScalarRelationFilter = {
    is?: Prisma.CategoryWhereInput;
    isNot?: Prisma.CategoryWhereInput;
};
export type CategoryCreateNestedOneWithoutChildrenInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutChildrenInput, Prisma.CategoryUncheckedCreateWithoutChildrenInput>;
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutChildrenInput;
    connect?: Prisma.CategoryWhereUniqueInput;
};
export type CategoryCreateNestedManyWithoutParentInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutParentInput, Prisma.CategoryUncheckedCreateWithoutParentInput> | Prisma.CategoryCreateWithoutParentInput[] | Prisma.CategoryUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutParentInput | Prisma.CategoryCreateOrConnectWithoutParentInput[];
    createMany?: Prisma.CategoryCreateManyParentInputEnvelope;
    connect?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
};
export type CategoryUncheckedCreateNestedManyWithoutParentInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutParentInput, Prisma.CategoryUncheckedCreateWithoutParentInput> | Prisma.CategoryCreateWithoutParentInput[] | Prisma.CategoryUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutParentInput | Prisma.CategoryCreateOrConnectWithoutParentInput[];
    createMany?: Prisma.CategoryCreateManyParentInputEnvelope;
    connect?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
};
export type IntFieldUpdateOperationsInput = {
    set?: number;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
};
export type CategoryUpdateOneWithoutChildrenNestedInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutChildrenInput, Prisma.CategoryUncheckedCreateWithoutChildrenInput>;
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutChildrenInput;
    upsert?: Prisma.CategoryUpsertWithoutChildrenInput;
    disconnect?: Prisma.CategoryWhereInput | boolean;
    delete?: Prisma.CategoryWhereInput | boolean;
    connect?: Prisma.CategoryWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.CategoryUpdateToOneWithWhereWithoutChildrenInput, Prisma.CategoryUpdateWithoutChildrenInput>, Prisma.CategoryUncheckedUpdateWithoutChildrenInput>;
};
export type CategoryUpdateManyWithoutParentNestedInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutParentInput, Prisma.CategoryUncheckedCreateWithoutParentInput> | Prisma.CategoryCreateWithoutParentInput[] | Prisma.CategoryUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutParentInput | Prisma.CategoryCreateOrConnectWithoutParentInput[];
    upsert?: Prisma.CategoryUpsertWithWhereUniqueWithoutParentInput | Prisma.CategoryUpsertWithWhereUniqueWithoutParentInput[];
    createMany?: Prisma.CategoryCreateManyParentInputEnvelope;
    set?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    disconnect?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    delete?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    connect?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    update?: Prisma.CategoryUpdateWithWhereUniqueWithoutParentInput | Prisma.CategoryUpdateWithWhereUniqueWithoutParentInput[];
    updateMany?: Prisma.CategoryUpdateManyWithWhereWithoutParentInput | Prisma.CategoryUpdateManyWithWhereWithoutParentInput[];
    deleteMany?: Prisma.CategoryScalarWhereInput | Prisma.CategoryScalarWhereInput[];
};
export type CategoryUncheckedUpdateManyWithoutParentNestedInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutParentInput, Prisma.CategoryUncheckedCreateWithoutParentInput> | Prisma.CategoryCreateWithoutParentInput[] | Prisma.CategoryUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutParentInput | Prisma.CategoryCreateOrConnectWithoutParentInput[];
    upsert?: Prisma.CategoryUpsertWithWhereUniqueWithoutParentInput | Prisma.CategoryUpsertWithWhereUniqueWithoutParentInput[];
    createMany?: Prisma.CategoryCreateManyParentInputEnvelope;
    set?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    disconnect?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    delete?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    connect?: Prisma.CategoryWhereUniqueInput | Prisma.CategoryWhereUniqueInput[];
    update?: Prisma.CategoryUpdateWithWhereUniqueWithoutParentInput | Prisma.CategoryUpdateWithWhereUniqueWithoutParentInput[];
    updateMany?: Prisma.CategoryUpdateManyWithWhereWithoutParentInput | Prisma.CategoryUpdateManyWithWhereWithoutParentInput[];
    deleteMany?: Prisma.CategoryScalarWhereInput | Prisma.CategoryScalarWhereInput[];
};
export type CategoryCreateNestedOneWithoutProductsInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutProductsInput, Prisma.CategoryUncheckedCreateWithoutProductsInput>;
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutProductsInput;
    connect?: Prisma.CategoryWhereUniqueInput;
};
export type CategoryUpdateOneRequiredWithoutProductsNestedInput = {
    create?: Prisma.XOR<Prisma.CategoryCreateWithoutProductsInput, Prisma.CategoryUncheckedCreateWithoutProductsInput>;
    connectOrCreate?: Prisma.CategoryCreateOrConnectWithoutProductsInput;
    upsert?: Prisma.CategoryUpsertWithoutProductsInput;
    connect?: Prisma.CategoryWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.CategoryUpdateToOneWithWhereWithoutProductsInput, Prisma.CategoryUpdateWithoutProductsInput>, Prisma.CategoryUncheckedUpdateWithoutProductsInput>;
};
export type CategoryCreateWithoutChildrenInput = {
    id?: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    parent?: Prisma.CategoryCreateNestedOneWithoutChildrenInput;
    products?: Prisma.ProductCreateNestedManyWithoutCategoryInput;
};
export type CategoryUncheckedCreateWithoutChildrenInput = {
    id?: string;
    name: string;
    slug: string;
    parentId?: string | null;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    products?: Prisma.ProductUncheckedCreateNestedManyWithoutCategoryInput;
};
export type CategoryCreateOrConnectWithoutChildrenInput = {
    where: Prisma.CategoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.CategoryCreateWithoutChildrenInput, Prisma.CategoryUncheckedCreateWithoutChildrenInput>;
};
export type CategoryCreateWithoutParentInput = {
    id?: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    children?: Prisma.CategoryCreateNestedManyWithoutParentInput;
    products?: Prisma.ProductCreateNestedManyWithoutCategoryInput;
};
export type CategoryUncheckedCreateWithoutParentInput = {
    id?: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    children?: Prisma.CategoryUncheckedCreateNestedManyWithoutParentInput;
    products?: Prisma.ProductUncheckedCreateNestedManyWithoutCategoryInput;
};
export type CategoryCreateOrConnectWithoutParentInput = {
    where: Prisma.CategoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.CategoryCreateWithoutParentInput, Prisma.CategoryUncheckedCreateWithoutParentInput>;
};
export type CategoryCreateManyParentInputEnvelope = {
    data: Prisma.CategoryCreateManyParentInput | Prisma.CategoryCreateManyParentInput[];
    skipDuplicates?: boolean;
};
export type CategoryUpsertWithoutChildrenInput = {
    update: Prisma.XOR<Prisma.CategoryUpdateWithoutChildrenInput, Prisma.CategoryUncheckedUpdateWithoutChildrenInput>;
    create: Prisma.XOR<Prisma.CategoryCreateWithoutChildrenInput, Prisma.CategoryUncheckedCreateWithoutChildrenInput>;
    where?: Prisma.CategoryWhereInput;
};
export type CategoryUpdateToOneWithWhereWithoutChildrenInput = {
    where?: Prisma.CategoryWhereInput;
    data: Prisma.XOR<Prisma.CategoryUpdateWithoutChildrenInput, Prisma.CategoryUncheckedUpdateWithoutChildrenInput>;
};
export type CategoryUpdateWithoutChildrenInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    parent?: Prisma.CategoryUpdateOneWithoutChildrenNestedInput;
    products?: Prisma.ProductUpdateManyWithoutCategoryNestedInput;
};
export type CategoryUncheckedUpdateWithoutChildrenInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    products?: Prisma.ProductUncheckedUpdateManyWithoutCategoryNestedInput;
};
export type CategoryUpsertWithWhereUniqueWithoutParentInput = {
    where: Prisma.CategoryWhereUniqueInput;
    update: Prisma.XOR<Prisma.CategoryUpdateWithoutParentInput, Prisma.CategoryUncheckedUpdateWithoutParentInput>;
    create: Prisma.XOR<Prisma.CategoryCreateWithoutParentInput, Prisma.CategoryUncheckedCreateWithoutParentInput>;
};
export type CategoryUpdateWithWhereUniqueWithoutParentInput = {
    where: Prisma.CategoryWhereUniqueInput;
    data: Prisma.XOR<Prisma.CategoryUpdateWithoutParentInput, Prisma.CategoryUncheckedUpdateWithoutParentInput>;
};
export type CategoryUpdateManyWithWhereWithoutParentInput = {
    where: Prisma.CategoryScalarWhereInput;
    data: Prisma.XOR<Prisma.CategoryUpdateManyMutationInput, Prisma.CategoryUncheckedUpdateManyWithoutParentInput>;
};
export type CategoryScalarWhereInput = {
    AND?: Prisma.CategoryScalarWhereInput | Prisma.CategoryScalarWhereInput[];
    OR?: Prisma.CategoryScalarWhereInput[];
    NOT?: Prisma.CategoryScalarWhereInput | Prisma.CategoryScalarWhereInput[];
    id?: Prisma.StringFilter<"Category"> | string;
    name?: Prisma.StringFilter<"Category"> | string;
    slug?: Prisma.StringFilter<"Category"> | string;
    parentId?: Prisma.StringNullableFilter<"Category"> | string | null;
    iconUrl?: Prisma.StringNullableFilter<"Category"> | string | null;
    sortOrder?: Prisma.IntFilter<"Category"> | number;
    createdAt?: Prisma.DateTimeFilter<"Category"> | Date | string;
};
export type CategoryCreateWithoutProductsInput = {
    id?: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    parent?: Prisma.CategoryCreateNestedOneWithoutChildrenInput;
    children?: Prisma.CategoryCreateNestedManyWithoutParentInput;
};
export type CategoryUncheckedCreateWithoutProductsInput = {
    id?: string;
    name: string;
    slug: string;
    parentId?: string | null;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
    children?: Prisma.CategoryUncheckedCreateNestedManyWithoutParentInput;
};
export type CategoryCreateOrConnectWithoutProductsInput = {
    where: Prisma.CategoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.CategoryCreateWithoutProductsInput, Prisma.CategoryUncheckedCreateWithoutProductsInput>;
};
export type CategoryUpsertWithoutProductsInput = {
    update: Prisma.XOR<Prisma.CategoryUpdateWithoutProductsInput, Prisma.CategoryUncheckedUpdateWithoutProductsInput>;
    create: Prisma.XOR<Prisma.CategoryCreateWithoutProductsInput, Prisma.CategoryUncheckedCreateWithoutProductsInput>;
    where?: Prisma.CategoryWhereInput;
};
export type CategoryUpdateToOneWithWhereWithoutProductsInput = {
    where?: Prisma.CategoryWhereInput;
    data: Prisma.XOR<Prisma.CategoryUpdateWithoutProductsInput, Prisma.CategoryUncheckedUpdateWithoutProductsInput>;
};
export type CategoryUpdateWithoutProductsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    parent?: Prisma.CategoryUpdateOneWithoutChildrenNestedInput;
    children?: Prisma.CategoryUpdateManyWithoutParentNestedInput;
};
export type CategoryUncheckedUpdateWithoutProductsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    children?: Prisma.CategoryUncheckedUpdateManyWithoutParentNestedInput;
};
export type CategoryCreateManyParentInput = {
    id?: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    sortOrder?: number;
    createdAt?: Date | string;
};
export type CategoryUpdateWithoutParentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    children?: Prisma.CategoryUpdateManyWithoutParentNestedInput;
    products?: Prisma.ProductUpdateManyWithoutCategoryNestedInput;
};
export type CategoryUncheckedUpdateWithoutParentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    children?: Prisma.CategoryUncheckedUpdateManyWithoutParentNestedInput;
    products?: Prisma.ProductUncheckedUpdateManyWithoutCategoryNestedInput;
};
export type CategoryUncheckedUpdateManyWithoutParentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    iconUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sortOrder?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CategoryCountOutputType = {
    children: number;
    products: number;
};
export type CategoryCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    children?: boolean | CategoryCountOutputTypeCountChildrenArgs;
    products?: boolean | CategoryCountOutputTypeCountProductsArgs;
};
export type CategoryCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategoryCountOutputTypeSelect<ExtArgs> | null;
};
export type CategoryCountOutputTypeCountChildrenArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CategoryWhereInput;
};
export type CategoryCountOutputTypeCountProductsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProductWhereInput;
};
export type CategorySelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    slug?: boolean;
    parentId?: boolean;
    iconUrl?: boolean;
    sortOrder?: boolean;
    createdAt?: boolean;
    parent?: boolean | Prisma.Category$parentArgs<ExtArgs>;
    children?: boolean | Prisma.Category$childrenArgs<ExtArgs>;
    products?: boolean | Prisma.Category$productsArgs<ExtArgs>;
    _count?: boolean | Prisma.CategoryCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["category"]>;
export type CategorySelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    slug?: boolean;
    parentId?: boolean;
    iconUrl?: boolean;
    sortOrder?: boolean;
    createdAt?: boolean;
    parent?: boolean | Prisma.Category$parentArgs<ExtArgs>;
}, ExtArgs["result"]["category"]>;
export type CategorySelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    slug?: boolean;
    parentId?: boolean;
    iconUrl?: boolean;
    sortOrder?: boolean;
    createdAt?: boolean;
    parent?: boolean | Prisma.Category$parentArgs<ExtArgs>;
}, ExtArgs["result"]["category"]>;
export type CategorySelectScalar = {
    id?: boolean;
    name?: boolean;
    slug?: boolean;
    parentId?: boolean;
    iconUrl?: boolean;
    sortOrder?: boolean;
    createdAt?: boolean;
};
export type CategoryOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "slug" | "parentId" | "iconUrl" | "sortOrder" | "createdAt", ExtArgs["result"]["category"]>;
export type CategoryInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    parent?: boolean | Prisma.Category$parentArgs<ExtArgs>;
    children?: boolean | Prisma.Category$childrenArgs<ExtArgs>;
    products?: boolean | Prisma.Category$productsArgs<ExtArgs>;
    _count?: boolean | Prisma.CategoryCountOutputTypeDefaultArgs<ExtArgs>;
};
export type CategoryIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    parent?: boolean | Prisma.Category$parentArgs<ExtArgs>;
};
export type CategoryIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    parent?: boolean | Prisma.Category$parentArgs<ExtArgs>;
};
export type $CategoryPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Category";
    objects: {
        parent: Prisma.$CategoryPayload<ExtArgs> | null;
        children: Prisma.$CategoryPayload<ExtArgs>[];
        products: Prisma.$ProductPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        name: string;
        slug: string;
        parentId: string | null;
        iconUrl: string | null;
        sortOrder: number;
        createdAt: Date;
    }, ExtArgs["result"]["category"]>;
    composites: {};
};
export type CategoryGetPayload<S extends boolean | null | undefined | CategoryDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$CategoryPayload, S>;
export type CategoryCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<CategoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: CategoryCountAggregateInputType | true;
};
export interface CategoryDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Category'];
        meta: {
            name: 'Category';
        };
    };
    findUnique<T extends CategoryFindUniqueArgs>(args: Prisma.SelectSubset<T, CategoryFindUniqueArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends CategoryFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, CategoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends CategoryFindFirstArgs>(args?: Prisma.SelectSubset<T, CategoryFindFirstArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends CategoryFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, CategoryFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends CategoryFindManyArgs>(args?: Prisma.SelectSubset<T, CategoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends CategoryCreateArgs>(args: Prisma.SelectSubset<T, CategoryCreateArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends CategoryCreateManyArgs>(args?: Prisma.SelectSubset<T, CategoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends CategoryCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, CategoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends CategoryDeleteArgs>(args: Prisma.SelectSubset<T, CategoryDeleteArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends CategoryUpdateArgs>(args: Prisma.SelectSubset<T, CategoryUpdateArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends CategoryDeleteManyArgs>(args?: Prisma.SelectSubset<T, CategoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends CategoryUpdateManyArgs>(args: Prisma.SelectSubset<T, CategoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends CategoryUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, CategoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends CategoryUpsertArgs>(args: Prisma.SelectSubset<T, CategoryUpsertArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends CategoryCountArgs>(args?: Prisma.Subset<T, CategoryCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], CategoryCountAggregateOutputType> : number>;
    aggregate<T extends CategoryAggregateArgs>(args: Prisma.Subset<T, CategoryAggregateArgs>): Prisma.PrismaPromise<GetCategoryAggregateType<T>>;
    groupBy<T extends CategoryGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: CategoryGroupByArgs['orderBy'];
    } : {
        orderBy?: CategoryGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, CategoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCategoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: CategoryFieldRefs;
}
export interface Prisma__CategoryClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    parent<T extends Prisma.Category$parentArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Category$parentArgs<ExtArgs>>): Prisma.Prisma__CategoryClient<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    children<T extends Prisma.Category$childrenArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Category$childrenArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    products<T extends Prisma.Category$productsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Category$productsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface CategoryFieldRefs {
    readonly id: Prisma.FieldRef<"Category", 'String'>;
    readonly name: Prisma.FieldRef<"Category", 'String'>;
    readonly slug: Prisma.FieldRef<"Category", 'String'>;
    readonly parentId: Prisma.FieldRef<"Category", 'String'>;
    readonly iconUrl: Prisma.FieldRef<"Category", 'String'>;
    readonly sortOrder: Prisma.FieldRef<"Category", 'Int'>;
    readonly createdAt: Prisma.FieldRef<"Category", 'DateTime'>;
}
export type CategoryFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where: Prisma.CategoryWhereUniqueInput;
};
export type CategoryFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where: Prisma.CategoryWhereUniqueInput;
};
export type CategoryFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
    cursor?: Prisma.CategoryWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.CategoryScalarFieldEnum | Prisma.CategoryScalarFieldEnum[];
};
export type CategoryFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
    cursor?: Prisma.CategoryWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.CategoryScalarFieldEnum | Prisma.CategoryScalarFieldEnum[];
};
export type CategoryFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
    cursor?: Prisma.CategoryWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.CategoryScalarFieldEnum | Prisma.CategoryScalarFieldEnum[];
};
export type CategoryCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.CategoryCreateInput, Prisma.CategoryUncheckedCreateInput>;
};
export type CategoryCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.CategoryCreateManyInput | Prisma.CategoryCreateManyInput[];
    skipDuplicates?: boolean;
};
export type CategoryCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    data: Prisma.CategoryCreateManyInput | Prisma.CategoryCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.CategoryIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type CategoryUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.CategoryUpdateInput, Prisma.CategoryUncheckedUpdateInput>;
    where: Prisma.CategoryWhereUniqueInput;
};
export type CategoryUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.CategoryUpdateManyMutationInput, Prisma.CategoryUncheckedUpdateManyInput>;
    where?: Prisma.CategoryWhereInput;
    limit?: number;
};
export type CategoryUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.CategoryUpdateManyMutationInput, Prisma.CategoryUncheckedUpdateManyInput>;
    where?: Prisma.CategoryWhereInput;
    limit?: number;
    include?: Prisma.CategoryIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type CategoryUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where: Prisma.CategoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.CategoryCreateInput, Prisma.CategoryUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.CategoryUpdateInput, Prisma.CategoryUncheckedUpdateInput>;
};
export type CategoryDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where: Prisma.CategoryWhereUniqueInput;
};
export type CategoryDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CategoryWhereInput;
    limit?: number;
};
export type Category$parentArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where?: Prisma.CategoryWhereInput;
};
export type Category$childrenArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[];
    cursor?: Prisma.CategoryWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.CategoryScalarFieldEnum | Prisma.CategoryScalarFieldEnum[];
};
export type Category$productsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProductSelect<ExtArgs> | null;
    omit?: Prisma.ProductOmit<ExtArgs> | null;
    include?: Prisma.ProductInclude<ExtArgs> | null;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
    cursor?: Prisma.ProductWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProductScalarFieldEnum | Prisma.ProductScalarFieldEnum[];
};
export type CategoryDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CategorySelect<ExtArgs> | null;
    omit?: Prisma.CategoryOmit<ExtArgs> | null;
    include?: Prisma.CategoryInclude<ExtArgs> | null;
};
