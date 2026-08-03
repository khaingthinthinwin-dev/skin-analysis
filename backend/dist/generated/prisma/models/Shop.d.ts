import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type ShopModel = runtime.Types.Result.DefaultSelection<Prisma.$ShopPayload>;
export type AggregateShop = {
    _count: ShopCountAggregateOutputType | null;
    _avg: ShopAvgAggregateOutputType | null;
    _sum: ShopSumAggregateOutputType | null;
    _min: ShopMinAggregateOutputType | null;
    _max: ShopMaxAggregateOutputType | null;
};
export type ShopAvgAggregateOutputType = {
    latitude: runtime.Decimal | null;
    longitude: runtime.Decimal | null;
};
export type ShopSumAggregateOutputType = {
    latitude: runtime.Decimal | null;
    longitude: runtime.Decimal | null;
};
export type ShopMinAggregateOutputType = {
    id: string | null;
    userId: string | null;
    name: string | null;
    slug: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    latitude: runtime.Decimal | null;
    longitude: runtime.Decimal | null;
    isApproved: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type ShopMaxAggregateOutputType = {
    id: string | null;
    userId: string | null;
    name: string | null;
    slug: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    latitude: runtime.Decimal | null;
    longitude: runtime.Decimal | null;
    isApproved: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type ShopCountAggregateOutputType = {
    id: number;
    userId: number;
    name: number;
    slug: number;
    description: number;
    logoUrl: number;
    bannerUrl: number;
    address: number;
    phone: number;
    email: number;
    latitude: number;
    longitude: number;
    isApproved: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type ShopAvgAggregateInputType = {
    latitude?: true;
    longitude?: true;
};
export type ShopSumAggregateInputType = {
    latitude?: true;
    longitude?: true;
};
export type ShopMinAggregateInputType = {
    id?: true;
    userId?: true;
    name?: true;
    slug?: true;
    description?: true;
    logoUrl?: true;
    bannerUrl?: true;
    address?: true;
    phone?: true;
    email?: true;
    latitude?: true;
    longitude?: true;
    isApproved?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type ShopMaxAggregateInputType = {
    id?: true;
    userId?: true;
    name?: true;
    slug?: true;
    description?: true;
    logoUrl?: true;
    bannerUrl?: true;
    address?: true;
    phone?: true;
    email?: true;
    latitude?: true;
    longitude?: true;
    isApproved?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type ShopCountAggregateInputType = {
    id?: true;
    userId?: true;
    name?: true;
    slug?: true;
    description?: true;
    logoUrl?: true;
    bannerUrl?: true;
    address?: true;
    phone?: true;
    email?: true;
    latitude?: true;
    longitude?: true;
    isApproved?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type ShopAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ShopWhereInput;
    orderBy?: Prisma.ShopOrderByWithRelationInput | Prisma.ShopOrderByWithRelationInput[];
    cursor?: Prisma.ShopWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | ShopCountAggregateInputType;
    _avg?: ShopAvgAggregateInputType;
    _sum?: ShopSumAggregateInputType;
    _min?: ShopMinAggregateInputType;
    _max?: ShopMaxAggregateInputType;
};
export type GetShopAggregateType<T extends ShopAggregateArgs> = {
    [P in keyof T & keyof AggregateShop]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateShop[P]> : Prisma.GetScalarType<T[P], AggregateShop[P]>;
};
export type ShopGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ShopWhereInput;
    orderBy?: Prisma.ShopOrderByWithAggregationInput | Prisma.ShopOrderByWithAggregationInput[];
    by: Prisma.ShopScalarFieldEnum[] | Prisma.ShopScalarFieldEnum;
    having?: Prisma.ShopScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: ShopCountAggregateInputType | true;
    _avg?: ShopAvgAggregateInputType;
    _sum?: ShopSumAggregateInputType;
    _min?: ShopMinAggregateInputType;
    _max?: ShopMaxAggregateInputType;
};
export type ShopGroupByOutputType = {
    id: string;
    userId: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    latitude: runtime.Decimal | null;
    longitude: runtime.Decimal | null;
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: ShopCountAggregateOutputType | null;
    _avg: ShopAvgAggregateOutputType | null;
    _sum: ShopSumAggregateOutputType | null;
    _min: ShopMinAggregateOutputType | null;
    _max: ShopMaxAggregateOutputType | null;
};
export type GetShopGroupByPayload<T extends ShopGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<ShopGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof ShopGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], ShopGroupByOutputType[P]> : Prisma.GetScalarType<T[P], ShopGroupByOutputType[P]>;
}>>;
export type ShopWhereInput = {
    AND?: Prisma.ShopWhereInput | Prisma.ShopWhereInput[];
    OR?: Prisma.ShopWhereInput[];
    NOT?: Prisma.ShopWhereInput | Prisma.ShopWhereInput[];
    id?: Prisma.StringFilter<"Shop"> | string;
    userId?: Prisma.StringFilter<"Shop"> | string;
    name?: Prisma.StringFilter<"Shop"> | string;
    slug?: Prisma.StringFilter<"Shop"> | string;
    description?: Prisma.StringNullableFilter<"Shop"> | string | null;
    logoUrl?: Prisma.StringNullableFilter<"Shop"> | string | null;
    bannerUrl?: Prisma.StringNullableFilter<"Shop"> | string | null;
    address?: Prisma.StringNullableFilter<"Shop"> | string | null;
    phone?: Prisma.StringNullableFilter<"Shop"> | string | null;
    email?: Prisma.StringNullableFilter<"Shop"> | string | null;
    latitude?: Prisma.DecimalNullableFilter<"Shop"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.DecimalNullableFilter<"Shop"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFilter<"Shop"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Shop"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Shop"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    advertisements?: Prisma.AdvertisementListRelationFilter;
};
export type ShopOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    logoUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    bannerUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    address?: Prisma.SortOrderInput | Prisma.SortOrder;
    phone?: Prisma.SortOrderInput | Prisma.SortOrder;
    email?: Prisma.SortOrderInput | Prisma.SortOrder;
    latitude?: Prisma.SortOrderInput | Prisma.SortOrder;
    longitude?: Prisma.SortOrderInput | Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    advertisements?: Prisma.AdvertisementOrderByRelationAggregateInput;
};
export type ShopWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    userId?: string;
    slug?: string;
    AND?: Prisma.ShopWhereInput | Prisma.ShopWhereInput[];
    OR?: Prisma.ShopWhereInput[];
    NOT?: Prisma.ShopWhereInput | Prisma.ShopWhereInput[];
    name?: Prisma.StringFilter<"Shop"> | string;
    description?: Prisma.StringNullableFilter<"Shop"> | string | null;
    logoUrl?: Prisma.StringNullableFilter<"Shop"> | string | null;
    bannerUrl?: Prisma.StringNullableFilter<"Shop"> | string | null;
    address?: Prisma.StringNullableFilter<"Shop"> | string | null;
    phone?: Prisma.StringNullableFilter<"Shop"> | string | null;
    email?: Prisma.StringNullableFilter<"Shop"> | string | null;
    latitude?: Prisma.DecimalNullableFilter<"Shop"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.DecimalNullableFilter<"Shop"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFilter<"Shop"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Shop"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Shop"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    advertisements?: Prisma.AdvertisementListRelationFilter;
}, "id" | "userId" | "slug">;
export type ShopOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    logoUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    bannerUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    address?: Prisma.SortOrderInput | Prisma.SortOrder;
    phone?: Prisma.SortOrderInput | Prisma.SortOrder;
    email?: Prisma.SortOrderInput | Prisma.SortOrder;
    latitude?: Prisma.SortOrderInput | Prisma.SortOrder;
    longitude?: Prisma.SortOrderInput | Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.ShopCountOrderByAggregateInput;
    _avg?: Prisma.ShopAvgOrderByAggregateInput;
    _max?: Prisma.ShopMaxOrderByAggregateInput;
    _min?: Prisma.ShopMinOrderByAggregateInput;
    _sum?: Prisma.ShopSumOrderByAggregateInput;
};
export type ShopScalarWhereWithAggregatesInput = {
    AND?: Prisma.ShopScalarWhereWithAggregatesInput | Prisma.ShopScalarWhereWithAggregatesInput[];
    OR?: Prisma.ShopScalarWhereWithAggregatesInput[];
    NOT?: Prisma.ShopScalarWhereWithAggregatesInput | Prisma.ShopScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Shop"> | string;
    userId?: Prisma.StringWithAggregatesFilter<"Shop"> | string;
    name?: Prisma.StringWithAggregatesFilter<"Shop"> | string;
    slug?: Prisma.StringWithAggregatesFilter<"Shop"> | string;
    description?: Prisma.StringNullableWithAggregatesFilter<"Shop"> | string | null;
    logoUrl?: Prisma.StringNullableWithAggregatesFilter<"Shop"> | string | null;
    bannerUrl?: Prisma.StringNullableWithAggregatesFilter<"Shop"> | string | null;
    address?: Prisma.StringNullableWithAggregatesFilter<"Shop"> | string | null;
    phone?: Prisma.StringNullableWithAggregatesFilter<"Shop"> | string | null;
    email?: Prisma.StringNullableWithAggregatesFilter<"Shop"> | string | null;
    latitude?: Prisma.DecimalNullableWithAggregatesFilter<"Shop"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.DecimalNullableWithAggregatesFilter<"Shop"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolWithAggregatesFilter<"Shop"> | boolean;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Shop"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"Shop"> | Date | string;
};
export type ShopCreateInput = {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutShopInput;
    advertisements?: Prisma.AdvertisementCreateNestedManyWithoutShopInput;
};
export type ShopUncheckedCreateInput = {
    id?: string;
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    advertisements?: Prisma.AdvertisementUncheckedCreateNestedManyWithoutShopInput;
};
export type ShopUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutShopNestedInput;
    advertisements?: Prisma.AdvertisementUpdateManyWithoutShopNestedInput;
};
export type ShopUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    advertisements?: Prisma.AdvertisementUncheckedUpdateManyWithoutShopNestedInput;
};
export type ShopCreateManyInput = {
    id?: string;
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ShopUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ShopUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ShopNullableScalarRelationFilter = {
    is?: Prisma.ShopWhereInput | null;
    isNot?: Prisma.ShopWhereInput | null;
};
export type ShopCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    logoUrl?: Prisma.SortOrder;
    bannerUrl?: Prisma.SortOrder;
    address?: Prisma.SortOrder;
    phone?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    latitude?: Prisma.SortOrder;
    longitude?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ShopAvgOrderByAggregateInput = {
    latitude?: Prisma.SortOrder;
    longitude?: Prisma.SortOrder;
};
export type ShopMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    logoUrl?: Prisma.SortOrder;
    bannerUrl?: Prisma.SortOrder;
    address?: Prisma.SortOrder;
    phone?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    latitude?: Prisma.SortOrder;
    longitude?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ShopMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    slug?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    logoUrl?: Prisma.SortOrder;
    bannerUrl?: Prisma.SortOrder;
    address?: Prisma.SortOrder;
    phone?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    latitude?: Prisma.SortOrder;
    longitude?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ShopSumOrderByAggregateInput = {
    latitude?: Prisma.SortOrder;
    longitude?: Prisma.SortOrder;
};
export type ShopScalarRelationFilter = {
    is?: Prisma.ShopWhereInput;
    isNot?: Prisma.ShopWhereInput;
};
export type ShopCreateNestedOneWithoutUserInput = {
    create?: Prisma.XOR<Prisma.ShopCreateWithoutUserInput, Prisma.ShopUncheckedCreateWithoutUserInput>;
    connectOrCreate?: Prisma.ShopCreateOrConnectWithoutUserInput;
    connect?: Prisma.ShopWhereUniqueInput;
};
export type ShopUncheckedCreateNestedOneWithoutUserInput = {
    create?: Prisma.XOR<Prisma.ShopCreateWithoutUserInput, Prisma.ShopUncheckedCreateWithoutUserInput>;
    connectOrCreate?: Prisma.ShopCreateOrConnectWithoutUserInput;
    connect?: Prisma.ShopWhereUniqueInput;
};
export type ShopUpdateOneWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.ShopCreateWithoutUserInput, Prisma.ShopUncheckedCreateWithoutUserInput>;
    connectOrCreate?: Prisma.ShopCreateOrConnectWithoutUserInput;
    upsert?: Prisma.ShopUpsertWithoutUserInput;
    disconnect?: Prisma.ShopWhereInput | boolean;
    delete?: Prisma.ShopWhereInput | boolean;
    connect?: Prisma.ShopWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.ShopUpdateToOneWithWhereWithoutUserInput, Prisma.ShopUpdateWithoutUserInput>, Prisma.ShopUncheckedUpdateWithoutUserInput>;
};
export type ShopUncheckedUpdateOneWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.ShopCreateWithoutUserInput, Prisma.ShopUncheckedCreateWithoutUserInput>;
    connectOrCreate?: Prisma.ShopCreateOrConnectWithoutUserInput;
    upsert?: Prisma.ShopUpsertWithoutUserInput;
    disconnect?: Prisma.ShopWhereInput | boolean;
    delete?: Prisma.ShopWhereInput | boolean;
    connect?: Prisma.ShopWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.ShopUpdateToOneWithWhereWithoutUserInput, Prisma.ShopUpdateWithoutUserInput>, Prisma.ShopUncheckedUpdateWithoutUserInput>;
};
export type ShopCreateNestedOneWithoutAdvertisementsInput = {
    create?: Prisma.XOR<Prisma.ShopCreateWithoutAdvertisementsInput, Prisma.ShopUncheckedCreateWithoutAdvertisementsInput>;
    connectOrCreate?: Prisma.ShopCreateOrConnectWithoutAdvertisementsInput;
    connect?: Prisma.ShopWhereUniqueInput;
};
export type ShopUpdateOneRequiredWithoutAdvertisementsNestedInput = {
    create?: Prisma.XOR<Prisma.ShopCreateWithoutAdvertisementsInput, Prisma.ShopUncheckedCreateWithoutAdvertisementsInput>;
    connectOrCreate?: Prisma.ShopCreateOrConnectWithoutAdvertisementsInput;
    upsert?: Prisma.ShopUpsertWithoutAdvertisementsInput;
    connect?: Prisma.ShopWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.ShopUpdateToOneWithWhereWithoutAdvertisementsInput, Prisma.ShopUpdateWithoutAdvertisementsInput>, Prisma.ShopUncheckedUpdateWithoutAdvertisementsInput>;
};
export type ShopCreateWithoutUserInput = {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    advertisements?: Prisma.AdvertisementCreateNestedManyWithoutShopInput;
};
export type ShopUncheckedCreateWithoutUserInput = {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    advertisements?: Prisma.AdvertisementUncheckedCreateNestedManyWithoutShopInput;
};
export type ShopCreateOrConnectWithoutUserInput = {
    where: Prisma.ShopWhereUniqueInput;
    create: Prisma.XOR<Prisma.ShopCreateWithoutUserInput, Prisma.ShopUncheckedCreateWithoutUserInput>;
};
export type ShopUpsertWithoutUserInput = {
    update: Prisma.XOR<Prisma.ShopUpdateWithoutUserInput, Prisma.ShopUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.ShopCreateWithoutUserInput, Prisma.ShopUncheckedCreateWithoutUserInput>;
    where?: Prisma.ShopWhereInput;
};
export type ShopUpdateToOneWithWhereWithoutUserInput = {
    where?: Prisma.ShopWhereInput;
    data: Prisma.XOR<Prisma.ShopUpdateWithoutUserInput, Prisma.ShopUncheckedUpdateWithoutUserInput>;
};
export type ShopUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    advertisements?: Prisma.AdvertisementUpdateManyWithoutShopNestedInput;
};
export type ShopUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    advertisements?: Prisma.AdvertisementUncheckedUpdateManyWithoutShopNestedInput;
};
export type ShopCreateWithoutAdvertisementsInput = {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutShopInput;
};
export type ShopUncheckedCreateWithoutAdvertisementsInput = {
    id?: string;
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ShopCreateOrConnectWithoutAdvertisementsInput = {
    where: Prisma.ShopWhereUniqueInput;
    create: Prisma.XOR<Prisma.ShopCreateWithoutAdvertisementsInput, Prisma.ShopUncheckedCreateWithoutAdvertisementsInput>;
};
export type ShopUpsertWithoutAdvertisementsInput = {
    update: Prisma.XOR<Prisma.ShopUpdateWithoutAdvertisementsInput, Prisma.ShopUncheckedUpdateWithoutAdvertisementsInput>;
    create: Prisma.XOR<Prisma.ShopCreateWithoutAdvertisementsInput, Prisma.ShopUncheckedCreateWithoutAdvertisementsInput>;
    where?: Prisma.ShopWhereInput;
};
export type ShopUpdateToOneWithWhereWithoutAdvertisementsInput = {
    where?: Prisma.ShopWhereInput;
    data: Prisma.XOR<Prisma.ShopUpdateWithoutAdvertisementsInput, Prisma.ShopUncheckedUpdateWithoutAdvertisementsInput>;
};
export type ShopUpdateWithoutAdvertisementsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutShopNestedInput;
};
export type ShopUncheckedUpdateWithoutAdvertisementsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    slug?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    logoUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    bannerUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    address?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    phone?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    email?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    latitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    longitude?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ShopCountOutputType = {
    advertisements: number;
};
export type ShopCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    advertisements?: boolean | ShopCountOutputTypeCountAdvertisementsArgs;
};
export type ShopCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopCountOutputTypeSelect<ExtArgs> | null;
};
export type ShopCountOutputTypeCountAdvertisementsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.AdvertisementWhereInput;
};
export type ShopSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    name?: boolean;
    slug?: boolean;
    description?: boolean;
    logoUrl?: boolean;
    bannerUrl?: boolean;
    address?: boolean;
    phone?: boolean;
    email?: boolean;
    latitude?: boolean;
    longitude?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    advertisements?: boolean | Prisma.Shop$advertisementsArgs<ExtArgs>;
    _count?: boolean | Prisma.ShopCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["shop"]>;
export type ShopSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    name?: boolean;
    slug?: boolean;
    description?: boolean;
    logoUrl?: boolean;
    bannerUrl?: boolean;
    address?: boolean;
    phone?: boolean;
    email?: boolean;
    latitude?: boolean;
    longitude?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["shop"]>;
export type ShopSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    name?: boolean;
    slug?: boolean;
    description?: boolean;
    logoUrl?: boolean;
    bannerUrl?: boolean;
    address?: boolean;
    phone?: boolean;
    email?: boolean;
    latitude?: boolean;
    longitude?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["shop"]>;
export type ShopSelectScalar = {
    id?: boolean;
    userId?: boolean;
    name?: boolean;
    slug?: boolean;
    description?: boolean;
    logoUrl?: boolean;
    bannerUrl?: boolean;
    address?: boolean;
    phone?: boolean;
    email?: boolean;
    latitude?: boolean;
    longitude?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type ShopOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "name" | "slug" | "description" | "logoUrl" | "bannerUrl" | "address" | "phone" | "email" | "latitude" | "longitude" | "isApproved" | "createdAt" | "updatedAt", ExtArgs["result"]["shop"]>;
export type ShopInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    advertisements?: boolean | Prisma.Shop$advertisementsArgs<ExtArgs>;
    _count?: boolean | Prisma.ShopCountOutputTypeDefaultArgs<ExtArgs>;
};
export type ShopIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type ShopIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $ShopPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Shop";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        advertisements: Prisma.$AdvertisementPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        userId: string;
        name: string;
        slug: string;
        description: string | null;
        logoUrl: string | null;
        bannerUrl: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        latitude: runtime.Decimal | null;
        longitude: runtime.Decimal | null;
        isApproved: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["shop"]>;
    composites: {};
};
export type ShopGetPayload<S extends boolean | null | undefined | ShopDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$ShopPayload, S>;
export type ShopCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<ShopFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: ShopCountAggregateInputType | true;
};
export interface ShopDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Shop'];
        meta: {
            name: 'Shop';
        };
    };
    findUnique<T extends ShopFindUniqueArgs>(args: Prisma.SelectSubset<T, ShopFindUniqueArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends ShopFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, ShopFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends ShopFindFirstArgs>(args?: Prisma.SelectSubset<T, ShopFindFirstArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends ShopFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, ShopFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends ShopFindManyArgs>(args?: Prisma.SelectSubset<T, ShopFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends ShopCreateArgs>(args: Prisma.SelectSubset<T, ShopCreateArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends ShopCreateManyArgs>(args?: Prisma.SelectSubset<T, ShopCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends ShopCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, ShopCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends ShopDeleteArgs>(args: Prisma.SelectSubset<T, ShopDeleteArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends ShopUpdateArgs>(args: Prisma.SelectSubset<T, ShopUpdateArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends ShopDeleteManyArgs>(args?: Prisma.SelectSubset<T, ShopDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends ShopUpdateManyArgs>(args: Prisma.SelectSubset<T, ShopUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends ShopUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, ShopUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends ShopUpsertArgs>(args: Prisma.SelectSubset<T, ShopUpsertArgs<ExtArgs>>): Prisma.Prisma__ShopClient<runtime.Types.Result.GetResult<Prisma.$ShopPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends ShopCountArgs>(args?: Prisma.Subset<T, ShopCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], ShopCountAggregateOutputType> : number>;
    aggregate<T extends ShopAggregateArgs>(args: Prisma.Subset<T, ShopAggregateArgs>): Prisma.PrismaPromise<GetShopAggregateType<T>>;
    groupBy<T extends ShopGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: ShopGroupByArgs['orderBy'];
    } : {
        orderBy?: ShopGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, ShopGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShopGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: ShopFieldRefs;
}
export interface Prisma__ShopClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    advertisements<T extends Prisma.Shop$advertisementsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Shop$advertisementsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AdvertisementPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface ShopFieldRefs {
    readonly id: Prisma.FieldRef<"Shop", 'String'>;
    readonly userId: Prisma.FieldRef<"Shop", 'String'>;
    readonly name: Prisma.FieldRef<"Shop", 'String'>;
    readonly slug: Prisma.FieldRef<"Shop", 'String'>;
    readonly description: Prisma.FieldRef<"Shop", 'String'>;
    readonly logoUrl: Prisma.FieldRef<"Shop", 'String'>;
    readonly bannerUrl: Prisma.FieldRef<"Shop", 'String'>;
    readonly address: Prisma.FieldRef<"Shop", 'String'>;
    readonly phone: Prisma.FieldRef<"Shop", 'String'>;
    readonly email: Prisma.FieldRef<"Shop", 'String'>;
    readonly latitude: Prisma.FieldRef<"Shop", 'Decimal'>;
    readonly longitude: Prisma.FieldRef<"Shop", 'Decimal'>;
    readonly isApproved: Prisma.FieldRef<"Shop", 'Boolean'>;
    readonly createdAt: Prisma.FieldRef<"Shop", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"Shop", 'DateTime'>;
}
export type ShopFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where: Prisma.ShopWhereUniqueInput;
};
export type ShopFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where: Prisma.ShopWhereUniqueInput;
};
export type ShopFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where?: Prisma.ShopWhereInput;
    orderBy?: Prisma.ShopOrderByWithRelationInput | Prisma.ShopOrderByWithRelationInput[];
    cursor?: Prisma.ShopWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ShopScalarFieldEnum | Prisma.ShopScalarFieldEnum[];
};
export type ShopFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where?: Prisma.ShopWhereInput;
    orderBy?: Prisma.ShopOrderByWithRelationInput | Prisma.ShopOrderByWithRelationInput[];
    cursor?: Prisma.ShopWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ShopScalarFieldEnum | Prisma.ShopScalarFieldEnum[];
};
export type ShopFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where?: Prisma.ShopWhereInput;
    orderBy?: Prisma.ShopOrderByWithRelationInput | Prisma.ShopOrderByWithRelationInput[];
    cursor?: Prisma.ShopWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ShopScalarFieldEnum | Prisma.ShopScalarFieldEnum[];
};
export type ShopCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ShopCreateInput, Prisma.ShopUncheckedCreateInput>;
};
export type ShopCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.ShopCreateManyInput | Prisma.ShopCreateManyInput[];
    skipDuplicates?: boolean;
};
export type ShopCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    data: Prisma.ShopCreateManyInput | Prisma.ShopCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.ShopIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type ShopUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ShopUpdateInput, Prisma.ShopUncheckedUpdateInput>;
    where: Prisma.ShopWhereUniqueInput;
};
export type ShopUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.ShopUpdateManyMutationInput, Prisma.ShopUncheckedUpdateManyInput>;
    where?: Prisma.ShopWhereInput;
    limit?: number;
};
export type ShopUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ShopUpdateManyMutationInput, Prisma.ShopUncheckedUpdateManyInput>;
    where?: Prisma.ShopWhereInput;
    limit?: number;
    include?: Prisma.ShopIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type ShopUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where: Prisma.ShopWhereUniqueInput;
    create: Prisma.XOR<Prisma.ShopCreateInput, Prisma.ShopUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.ShopUpdateInput, Prisma.ShopUncheckedUpdateInput>;
};
export type ShopDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
    where: Prisma.ShopWhereUniqueInput;
};
export type ShopDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ShopWhereInput;
    limit?: number;
};
export type Shop$advertisementsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AdvertisementSelect<ExtArgs> | null;
    omit?: Prisma.AdvertisementOmit<ExtArgs> | null;
    include?: Prisma.AdvertisementInclude<ExtArgs> | null;
    where?: Prisma.AdvertisementWhereInput;
    orderBy?: Prisma.AdvertisementOrderByWithRelationInput | Prisma.AdvertisementOrderByWithRelationInput[];
    cursor?: Prisma.AdvertisementWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.AdvertisementScalarFieldEnum | Prisma.AdvertisementScalarFieldEnum[];
};
export type ShopDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ShopSelect<ExtArgs> | null;
    omit?: Prisma.ShopOmit<ExtArgs> | null;
    include?: Prisma.ShopInclude<ExtArgs> | null;
};
