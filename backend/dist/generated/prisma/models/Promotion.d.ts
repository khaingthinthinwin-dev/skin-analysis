import type * as runtime from "@prisma/client/runtime/client";
import type * as $Enums from "../enums.js";
import type * as Prisma from "../internal/prismaNamespace.js";
export type PromotionModel = runtime.Types.Result.DefaultSelection<Prisma.$PromotionPayload>;
export type AggregatePromotion = {
    _count: PromotionCountAggregateOutputType | null;
    _avg: PromotionAvgAggregateOutputType | null;
    _sum: PromotionSumAggregateOutputType | null;
    _min: PromotionMinAggregateOutputType | null;
    _max: PromotionMaxAggregateOutputType | null;
};
export type PromotionAvgAggregateOutputType = {
    discountValue: runtime.Decimal | null;
    minOrderAmount: runtime.Decimal | null;
    maxUses: number | null;
    usedCount: number | null;
};
export type PromotionSumAggregateOutputType = {
    discountValue: runtime.Decimal | null;
    minOrderAmount: runtime.Decimal | null;
    maxUses: number | null;
    usedCount: number | null;
};
export type PromotionMinAggregateOutputType = {
    id: string | null;
    merchantId: string | null;
    code: string | null;
    description: string | null;
    discountType: $Enums.DiscountType | null;
    discountValue: runtime.Decimal | null;
    minOrderAmount: runtime.Decimal | null;
    maxUses: number | null;
    usedCount: number | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean | null;
    createdAt: Date | null;
};
export type PromotionMaxAggregateOutputType = {
    id: string | null;
    merchantId: string | null;
    code: string | null;
    description: string | null;
    discountType: $Enums.DiscountType | null;
    discountValue: runtime.Decimal | null;
    minOrderAmount: runtime.Decimal | null;
    maxUses: number | null;
    usedCount: number | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean | null;
    createdAt: Date | null;
};
export type PromotionCountAggregateOutputType = {
    id: number;
    merchantId: number;
    code: number;
    description: number;
    discountType: number;
    discountValue: number;
    minOrderAmount: number;
    maxUses: number;
    usedCount: number;
    startsAt: number;
    expiresAt: number;
    isActive: number;
    createdAt: number;
    _all: number;
};
export type PromotionAvgAggregateInputType = {
    discountValue?: true;
    minOrderAmount?: true;
    maxUses?: true;
    usedCount?: true;
};
export type PromotionSumAggregateInputType = {
    discountValue?: true;
    minOrderAmount?: true;
    maxUses?: true;
    usedCount?: true;
};
export type PromotionMinAggregateInputType = {
    id?: true;
    merchantId?: true;
    code?: true;
    description?: true;
    discountType?: true;
    discountValue?: true;
    minOrderAmount?: true;
    maxUses?: true;
    usedCount?: true;
    startsAt?: true;
    expiresAt?: true;
    isActive?: true;
    createdAt?: true;
};
export type PromotionMaxAggregateInputType = {
    id?: true;
    merchantId?: true;
    code?: true;
    description?: true;
    discountType?: true;
    discountValue?: true;
    minOrderAmount?: true;
    maxUses?: true;
    usedCount?: true;
    startsAt?: true;
    expiresAt?: true;
    isActive?: true;
    createdAt?: true;
};
export type PromotionCountAggregateInputType = {
    id?: true;
    merchantId?: true;
    code?: true;
    description?: true;
    discountType?: true;
    discountValue?: true;
    minOrderAmount?: true;
    maxUses?: true;
    usedCount?: true;
    startsAt?: true;
    expiresAt?: true;
    isActive?: true;
    createdAt?: true;
    _all?: true;
};
export type PromotionAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithRelationInput | Prisma.PromotionOrderByWithRelationInput[];
    cursor?: Prisma.PromotionWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | PromotionCountAggregateInputType;
    _avg?: PromotionAvgAggregateInputType;
    _sum?: PromotionSumAggregateInputType;
    _min?: PromotionMinAggregateInputType;
    _max?: PromotionMaxAggregateInputType;
};
export type GetPromotionAggregateType<T extends PromotionAggregateArgs> = {
    [P in keyof T & keyof AggregatePromotion]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregatePromotion[P]> : Prisma.GetScalarType<T[P], AggregatePromotion[P]>;
};
export type PromotionGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithAggregationInput | Prisma.PromotionOrderByWithAggregationInput[];
    by: Prisma.PromotionScalarFieldEnum[] | Prisma.PromotionScalarFieldEnum;
    having?: Prisma.PromotionScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: PromotionCountAggregateInputType | true;
    _avg?: PromotionAvgAggregateInputType;
    _sum?: PromotionSumAggregateInputType;
    _min?: PromotionMinAggregateInputType;
    _max?: PromotionMaxAggregateInputType;
};
export type PromotionGroupByOutputType = {
    id: string;
    merchantId: string;
    code: string;
    description: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal;
    minOrderAmount: runtime.Decimal | null;
    maxUses: number | null;
    usedCount: number;
    startsAt: Date;
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
    _count: PromotionCountAggregateOutputType | null;
    _avg: PromotionAvgAggregateOutputType | null;
    _sum: PromotionSumAggregateOutputType | null;
    _min: PromotionMinAggregateOutputType | null;
    _max: PromotionMaxAggregateOutputType | null;
};
export type GetPromotionGroupByPayload<T extends PromotionGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<PromotionGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof PromotionGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], PromotionGroupByOutputType[P]> : Prisma.GetScalarType<T[P], PromotionGroupByOutputType[P]>;
}>>;
export type PromotionWhereInput = {
    AND?: Prisma.PromotionWhereInput | Prisma.PromotionWhereInput[];
    OR?: Prisma.PromotionWhereInput[];
    NOT?: Prisma.PromotionWhereInput | Prisma.PromotionWhereInput[];
    id?: Prisma.StringFilter<"Promotion"> | string;
    merchantId?: Prisma.StringFilter<"Promotion"> | string;
    code?: Prisma.StringFilter<"Promotion"> | string;
    description?: Prisma.StringNullableFilter<"Promotion"> | string | null;
    discountType?: Prisma.EnumDiscountTypeFilter<"Promotion"> | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.DecimalNullableFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.IntNullableFilter<"Promotion"> | number | null;
    usedCount?: Prisma.IntFilter<"Promotion"> | number;
    startsAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    expiresAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    isActive?: Prisma.BoolFilter<"Promotion"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    merchant?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
};
export type PromotionOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    merchantId?: Prisma.SortOrder;
    code?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    discountType?: Prisma.SortOrder;
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrderInput | Prisma.SortOrder;
    maxUses?: Prisma.SortOrderInput | Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
    startsAt?: Prisma.SortOrder;
    expiresAt?: Prisma.SortOrder;
    isActive?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    merchant?: Prisma.UserOrderByWithRelationInput;
};
export type PromotionWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    code?: string;
    AND?: Prisma.PromotionWhereInput | Prisma.PromotionWhereInput[];
    OR?: Prisma.PromotionWhereInput[];
    NOT?: Prisma.PromotionWhereInput | Prisma.PromotionWhereInput[];
    merchantId?: Prisma.StringFilter<"Promotion"> | string;
    description?: Prisma.StringNullableFilter<"Promotion"> | string | null;
    discountType?: Prisma.EnumDiscountTypeFilter<"Promotion"> | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.DecimalNullableFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.IntNullableFilter<"Promotion"> | number | null;
    usedCount?: Prisma.IntFilter<"Promotion"> | number;
    startsAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    expiresAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    isActive?: Prisma.BoolFilter<"Promotion"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    merchant?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
}, "id" | "code">;
export type PromotionOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    merchantId?: Prisma.SortOrder;
    code?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    discountType?: Prisma.SortOrder;
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrderInput | Prisma.SortOrder;
    maxUses?: Prisma.SortOrderInput | Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
    startsAt?: Prisma.SortOrder;
    expiresAt?: Prisma.SortOrder;
    isActive?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    _count?: Prisma.PromotionCountOrderByAggregateInput;
    _avg?: Prisma.PromotionAvgOrderByAggregateInput;
    _max?: Prisma.PromotionMaxOrderByAggregateInput;
    _min?: Prisma.PromotionMinOrderByAggregateInput;
    _sum?: Prisma.PromotionSumOrderByAggregateInput;
};
export type PromotionScalarWhereWithAggregatesInput = {
    AND?: Prisma.PromotionScalarWhereWithAggregatesInput | Prisma.PromotionScalarWhereWithAggregatesInput[];
    OR?: Prisma.PromotionScalarWhereWithAggregatesInput[];
    NOT?: Prisma.PromotionScalarWhereWithAggregatesInput | Prisma.PromotionScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Promotion"> | string;
    merchantId?: Prisma.StringWithAggregatesFilter<"Promotion"> | string;
    code?: Prisma.StringWithAggregatesFilter<"Promotion"> | string;
    description?: Prisma.StringNullableWithAggregatesFilter<"Promotion"> | string | null;
    discountType?: Prisma.EnumDiscountTypeWithAggregatesFilter<"Promotion"> | $Enums.DiscountType;
    discountValue?: Prisma.DecimalWithAggregatesFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.DecimalNullableWithAggregatesFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.IntNullableWithAggregatesFilter<"Promotion"> | number | null;
    usedCount?: Prisma.IntWithAggregatesFilter<"Promotion"> | number;
    startsAt?: Prisma.DateTimeWithAggregatesFilter<"Promotion"> | Date | string;
    expiresAt?: Prisma.DateTimeWithAggregatesFilter<"Promotion"> | Date | string;
    isActive?: Prisma.BoolWithAggregatesFilter<"Promotion"> | boolean;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Promotion"> | Date | string;
};
export type PromotionCreateInput = {
    id?: string;
    code: string;
    description?: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt: Date | string;
    expiresAt: Date | string;
    isActive?: boolean;
    createdAt?: Date | string;
    merchant: Prisma.UserCreateNestedOneWithoutPromotionsInput;
};
export type PromotionUncheckedCreateInput = {
    id?: string;
    merchantId: string;
    code: string;
    description?: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt: Date | string;
    expiresAt: Date | string;
    isActive?: boolean;
    createdAt?: Date | string;
};
export type PromotionUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    merchant?: Prisma.UserUpdateOneRequiredWithoutPromotionsNestedInput;
};
export type PromotionUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    merchantId?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PromotionCreateManyInput = {
    id?: string;
    merchantId: string;
    code: string;
    description?: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt: Date | string;
    expiresAt: Date | string;
    isActive?: boolean;
    createdAt?: Date | string;
};
export type PromotionUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PromotionUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    merchantId?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PromotionListRelationFilter = {
    every?: Prisma.PromotionWhereInput;
    some?: Prisma.PromotionWhereInput;
    none?: Prisma.PromotionWhereInput;
};
export type PromotionOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type PromotionCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    merchantId?: Prisma.SortOrder;
    code?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    discountType?: Prisma.SortOrder;
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrder;
    maxUses?: Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
    startsAt?: Prisma.SortOrder;
    expiresAt?: Prisma.SortOrder;
    isActive?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type PromotionAvgOrderByAggregateInput = {
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrder;
    maxUses?: Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
};
export type PromotionMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    merchantId?: Prisma.SortOrder;
    code?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    discountType?: Prisma.SortOrder;
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrder;
    maxUses?: Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
    startsAt?: Prisma.SortOrder;
    expiresAt?: Prisma.SortOrder;
    isActive?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type PromotionMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    merchantId?: Prisma.SortOrder;
    code?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    discountType?: Prisma.SortOrder;
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrder;
    maxUses?: Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
    startsAt?: Prisma.SortOrder;
    expiresAt?: Prisma.SortOrder;
    isActive?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type PromotionSumOrderByAggregateInput = {
    discountValue?: Prisma.SortOrder;
    minOrderAmount?: Prisma.SortOrder;
    maxUses?: Prisma.SortOrder;
    usedCount?: Prisma.SortOrder;
};
export type PromotionCreateNestedManyWithoutMerchantInput = {
    create?: Prisma.XOR<Prisma.PromotionCreateWithoutMerchantInput, Prisma.PromotionUncheckedCreateWithoutMerchantInput> | Prisma.PromotionCreateWithoutMerchantInput[] | Prisma.PromotionUncheckedCreateWithoutMerchantInput[];
    connectOrCreate?: Prisma.PromotionCreateOrConnectWithoutMerchantInput | Prisma.PromotionCreateOrConnectWithoutMerchantInput[];
    createMany?: Prisma.PromotionCreateManyMerchantInputEnvelope;
    connect?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
};
export type PromotionUncheckedCreateNestedManyWithoutMerchantInput = {
    create?: Prisma.XOR<Prisma.PromotionCreateWithoutMerchantInput, Prisma.PromotionUncheckedCreateWithoutMerchantInput> | Prisma.PromotionCreateWithoutMerchantInput[] | Prisma.PromotionUncheckedCreateWithoutMerchantInput[];
    connectOrCreate?: Prisma.PromotionCreateOrConnectWithoutMerchantInput | Prisma.PromotionCreateOrConnectWithoutMerchantInput[];
    createMany?: Prisma.PromotionCreateManyMerchantInputEnvelope;
    connect?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
};
export type PromotionUpdateManyWithoutMerchantNestedInput = {
    create?: Prisma.XOR<Prisma.PromotionCreateWithoutMerchantInput, Prisma.PromotionUncheckedCreateWithoutMerchantInput> | Prisma.PromotionCreateWithoutMerchantInput[] | Prisma.PromotionUncheckedCreateWithoutMerchantInput[];
    connectOrCreate?: Prisma.PromotionCreateOrConnectWithoutMerchantInput | Prisma.PromotionCreateOrConnectWithoutMerchantInput[];
    upsert?: Prisma.PromotionUpsertWithWhereUniqueWithoutMerchantInput | Prisma.PromotionUpsertWithWhereUniqueWithoutMerchantInput[];
    createMany?: Prisma.PromotionCreateManyMerchantInputEnvelope;
    set?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    disconnect?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    delete?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    connect?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    update?: Prisma.PromotionUpdateWithWhereUniqueWithoutMerchantInput | Prisma.PromotionUpdateWithWhereUniqueWithoutMerchantInput[];
    updateMany?: Prisma.PromotionUpdateManyWithWhereWithoutMerchantInput | Prisma.PromotionUpdateManyWithWhereWithoutMerchantInput[];
    deleteMany?: Prisma.PromotionScalarWhereInput | Prisma.PromotionScalarWhereInput[];
};
export type PromotionUncheckedUpdateManyWithoutMerchantNestedInput = {
    create?: Prisma.XOR<Prisma.PromotionCreateWithoutMerchantInput, Prisma.PromotionUncheckedCreateWithoutMerchantInput> | Prisma.PromotionCreateWithoutMerchantInput[] | Prisma.PromotionUncheckedCreateWithoutMerchantInput[];
    connectOrCreate?: Prisma.PromotionCreateOrConnectWithoutMerchantInput | Prisma.PromotionCreateOrConnectWithoutMerchantInput[];
    upsert?: Prisma.PromotionUpsertWithWhereUniqueWithoutMerchantInput | Prisma.PromotionUpsertWithWhereUniqueWithoutMerchantInput[];
    createMany?: Prisma.PromotionCreateManyMerchantInputEnvelope;
    set?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    disconnect?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    delete?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    connect?: Prisma.PromotionWhereUniqueInput | Prisma.PromotionWhereUniqueInput[];
    update?: Prisma.PromotionUpdateWithWhereUniqueWithoutMerchantInput | Prisma.PromotionUpdateWithWhereUniqueWithoutMerchantInput[];
    updateMany?: Prisma.PromotionUpdateManyWithWhereWithoutMerchantInput | Prisma.PromotionUpdateManyWithWhereWithoutMerchantInput[];
    deleteMany?: Prisma.PromotionScalarWhereInput | Prisma.PromotionScalarWhereInput[];
};
export type EnumDiscountTypeFieldUpdateOperationsInput = {
    set?: $Enums.DiscountType;
};
export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
};
export type PromotionCreateWithoutMerchantInput = {
    id?: string;
    code: string;
    description?: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt: Date | string;
    expiresAt: Date | string;
    isActive?: boolean;
    createdAt?: Date | string;
};
export type PromotionUncheckedCreateWithoutMerchantInput = {
    id?: string;
    code: string;
    description?: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt: Date | string;
    expiresAt: Date | string;
    isActive?: boolean;
    createdAt?: Date | string;
};
export type PromotionCreateOrConnectWithoutMerchantInput = {
    where: Prisma.PromotionWhereUniqueInput;
    create: Prisma.XOR<Prisma.PromotionCreateWithoutMerchantInput, Prisma.PromotionUncheckedCreateWithoutMerchantInput>;
};
export type PromotionCreateManyMerchantInputEnvelope = {
    data: Prisma.PromotionCreateManyMerchantInput | Prisma.PromotionCreateManyMerchantInput[];
    skipDuplicates?: boolean;
};
export type PromotionUpsertWithWhereUniqueWithoutMerchantInput = {
    where: Prisma.PromotionWhereUniqueInput;
    update: Prisma.XOR<Prisma.PromotionUpdateWithoutMerchantInput, Prisma.PromotionUncheckedUpdateWithoutMerchantInput>;
    create: Prisma.XOR<Prisma.PromotionCreateWithoutMerchantInput, Prisma.PromotionUncheckedCreateWithoutMerchantInput>;
};
export type PromotionUpdateWithWhereUniqueWithoutMerchantInput = {
    where: Prisma.PromotionWhereUniqueInput;
    data: Prisma.XOR<Prisma.PromotionUpdateWithoutMerchantInput, Prisma.PromotionUncheckedUpdateWithoutMerchantInput>;
};
export type PromotionUpdateManyWithWhereWithoutMerchantInput = {
    where: Prisma.PromotionScalarWhereInput;
    data: Prisma.XOR<Prisma.PromotionUpdateManyMutationInput, Prisma.PromotionUncheckedUpdateManyWithoutMerchantInput>;
};
export type PromotionScalarWhereInput = {
    AND?: Prisma.PromotionScalarWhereInput | Prisma.PromotionScalarWhereInput[];
    OR?: Prisma.PromotionScalarWhereInput[];
    NOT?: Prisma.PromotionScalarWhereInput | Prisma.PromotionScalarWhereInput[];
    id?: Prisma.StringFilter<"Promotion"> | string;
    merchantId?: Prisma.StringFilter<"Promotion"> | string;
    code?: Prisma.StringFilter<"Promotion"> | string;
    description?: Prisma.StringNullableFilter<"Promotion"> | string | null;
    discountType?: Prisma.EnumDiscountTypeFilter<"Promotion"> | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.DecimalNullableFilter<"Promotion"> | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.IntNullableFilter<"Promotion"> | number | null;
    usedCount?: Prisma.IntFilter<"Promotion"> | number;
    startsAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    expiresAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
    isActive?: Prisma.BoolFilter<"Promotion"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Promotion"> | Date | string;
};
export type PromotionCreateManyMerchantInput = {
    id?: string;
    code: string;
    description?: string | null;
    discountType: $Enums.DiscountType;
    discountValue: runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt: Date | string;
    expiresAt: Date | string;
    isActive?: boolean;
    createdAt?: Date | string;
};
export type PromotionUpdateWithoutMerchantInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PromotionUncheckedUpdateWithoutMerchantInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PromotionUncheckedUpdateManyWithoutMerchantInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    code?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    discountType?: Prisma.EnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType;
    discountValue?: Prisma.DecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string;
    minOrderAmount?: Prisma.NullableDecimalFieldUpdateOperationsInput | runtime.Decimal | runtime.DecimalJsLike | number | string | null;
    maxUses?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    usedCount?: Prisma.IntFieldUpdateOperationsInput | number;
    startsAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    expiresAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    isActive?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PromotionSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    merchantId?: boolean;
    code?: boolean;
    description?: boolean;
    discountType?: boolean;
    discountValue?: boolean;
    minOrderAmount?: boolean;
    maxUses?: boolean;
    usedCount?: boolean;
    startsAt?: boolean;
    expiresAt?: boolean;
    isActive?: boolean;
    createdAt?: boolean;
    merchant?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["promotion"]>;
export type PromotionSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    merchantId?: boolean;
    code?: boolean;
    description?: boolean;
    discountType?: boolean;
    discountValue?: boolean;
    minOrderAmount?: boolean;
    maxUses?: boolean;
    usedCount?: boolean;
    startsAt?: boolean;
    expiresAt?: boolean;
    isActive?: boolean;
    createdAt?: boolean;
    merchant?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["promotion"]>;
export type PromotionSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    merchantId?: boolean;
    code?: boolean;
    description?: boolean;
    discountType?: boolean;
    discountValue?: boolean;
    minOrderAmount?: boolean;
    maxUses?: boolean;
    usedCount?: boolean;
    startsAt?: boolean;
    expiresAt?: boolean;
    isActive?: boolean;
    createdAt?: boolean;
    merchant?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["promotion"]>;
export type PromotionSelectScalar = {
    id?: boolean;
    merchantId?: boolean;
    code?: boolean;
    description?: boolean;
    discountType?: boolean;
    discountValue?: boolean;
    minOrderAmount?: boolean;
    maxUses?: boolean;
    usedCount?: boolean;
    startsAt?: boolean;
    expiresAt?: boolean;
    isActive?: boolean;
    createdAt?: boolean;
};
export type PromotionOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "merchantId" | "code" | "description" | "discountType" | "discountValue" | "minOrderAmount" | "maxUses" | "usedCount" | "startsAt" | "expiresAt" | "isActive" | "createdAt", ExtArgs["result"]["promotion"]>;
export type PromotionInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    merchant?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type PromotionIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    merchant?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type PromotionIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    merchant?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $PromotionPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Promotion";
    objects: {
        merchant: Prisma.$UserPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        merchantId: string;
        code: string;
        description: string | null;
        discountType: $Enums.DiscountType;
        discountValue: runtime.Decimal;
        minOrderAmount: runtime.Decimal | null;
        maxUses: number | null;
        usedCount: number;
        startsAt: Date;
        expiresAt: Date;
        isActive: boolean;
        createdAt: Date;
    }, ExtArgs["result"]["promotion"]>;
    composites: {};
};
export type PromotionGetPayload<S extends boolean | null | undefined | PromotionDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$PromotionPayload, S>;
export type PromotionCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<PromotionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: PromotionCountAggregateInputType | true;
};
export interface PromotionDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Promotion'];
        meta: {
            name: 'Promotion';
        };
    };
    findUnique<T extends PromotionFindUniqueArgs>(args: Prisma.SelectSubset<T, PromotionFindUniqueArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends PromotionFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, PromotionFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends PromotionFindFirstArgs>(args?: Prisma.SelectSubset<T, PromotionFindFirstArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends PromotionFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, PromotionFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends PromotionFindManyArgs>(args?: Prisma.SelectSubset<T, PromotionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends PromotionCreateArgs>(args: Prisma.SelectSubset<T, PromotionCreateArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends PromotionCreateManyArgs>(args?: Prisma.SelectSubset<T, PromotionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends PromotionCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, PromotionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends PromotionDeleteArgs>(args: Prisma.SelectSubset<T, PromotionDeleteArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends PromotionUpdateArgs>(args: Prisma.SelectSubset<T, PromotionUpdateArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends PromotionDeleteManyArgs>(args?: Prisma.SelectSubset<T, PromotionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends PromotionUpdateManyArgs>(args: Prisma.SelectSubset<T, PromotionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends PromotionUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, PromotionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends PromotionUpsertArgs>(args: Prisma.SelectSubset<T, PromotionUpsertArgs<ExtArgs>>): Prisma.Prisma__PromotionClient<runtime.Types.Result.GetResult<Prisma.$PromotionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends PromotionCountArgs>(args?: Prisma.Subset<T, PromotionCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], PromotionCountAggregateOutputType> : number>;
    aggregate<T extends PromotionAggregateArgs>(args: Prisma.Subset<T, PromotionAggregateArgs>): Prisma.PrismaPromise<GetPromotionAggregateType<T>>;
    groupBy<T extends PromotionGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: PromotionGroupByArgs['orderBy'];
    } : {
        orderBy?: PromotionGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, PromotionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPromotionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: PromotionFieldRefs;
}
export interface Prisma__PromotionClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    merchant<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface PromotionFieldRefs {
    readonly id: Prisma.FieldRef<"Promotion", 'String'>;
    readonly merchantId: Prisma.FieldRef<"Promotion", 'String'>;
    readonly code: Prisma.FieldRef<"Promotion", 'String'>;
    readonly description: Prisma.FieldRef<"Promotion", 'String'>;
    readonly discountType: Prisma.FieldRef<"Promotion", 'DiscountType'>;
    readonly discountValue: Prisma.FieldRef<"Promotion", 'Decimal'>;
    readonly minOrderAmount: Prisma.FieldRef<"Promotion", 'Decimal'>;
    readonly maxUses: Prisma.FieldRef<"Promotion", 'Int'>;
    readonly usedCount: Prisma.FieldRef<"Promotion", 'Int'>;
    readonly startsAt: Prisma.FieldRef<"Promotion", 'DateTime'>;
    readonly expiresAt: Prisma.FieldRef<"Promotion", 'DateTime'>;
    readonly isActive: Prisma.FieldRef<"Promotion", 'Boolean'>;
    readonly createdAt: Prisma.FieldRef<"Promotion", 'DateTime'>;
}
export type PromotionFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where: Prisma.PromotionWhereUniqueInput;
};
export type PromotionFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where: Prisma.PromotionWhereUniqueInput;
};
export type PromotionFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithRelationInput | Prisma.PromotionOrderByWithRelationInput[];
    cursor?: Prisma.PromotionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PromotionScalarFieldEnum | Prisma.PromotionScalarFieldEnum[];
};
export type PromotionFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithRelationInput | Prisma.PromotionOrderByWithRelationInput[];
    cursor?: Prisma.PromotionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PromotionScalarFieldEnum | Prisma.PromotionScalarFieldEnum[];
};
export type PromotionFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithRelationInput | Prisma.PromotionOrderByWithRelationInput[];
    cursor?: Prisma.PromotionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PromotionScalarFieldEnum | Prisma.PromotionScalarFieldEnum[];
};
export type PromotionCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PromotionCreateInput, Prisma.PromotionUncheckedCreateInput>;
};
export type PromotionCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.PromotionCreateManyInput | Prisma.PromotionCreateManyInput[];
    skipDuplicates?: boolean;
};
export type PromotionCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    data: Prisma.PromotionCreateManyInput | Prisma.PromotionCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.PromotionIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type PromotionUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PromotionUpdateInput, Prisma.PromotionUncheckedUpdateInput>;
    where: Prisma.PromotionWhereUniqueInput;
};
export type PromotionUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.PromotionUpdateManyMutationInput, Prisma.PromotionUncheckedUpdateManyInput>;
    where?: Prisma.PromotionWhereInput;
    limit?: number;
};
export type PromotionUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PromotionUpdateManyMutationInput, Prisma.PromotionUncheckedUpdateManyInput>;
    where?: Prisma.PromotionWhereInput;
    limit?: number;
    include?: Prisma.PromotionIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type PromotionUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where: Prisma.PromotionWhereUniqueInput;
    create: Prisma.XOR<Prisma.PromotionCreateInput, Prisma.PromotionUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.PromotionUpdateInput, Prisma.PromotionUncheckedUpdateInput>;
};
export type PromotionDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
    where: Prisma.PromotionWhereUniqueInput;
};
export type PromotionDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PromotionWhereInput;
    limit?: number;
};
export type PromotionDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PromotionSelect<ExtArgs> | null;
    omit?: Prisma.PromotionOmit<ExtArgs> | null;
    include?: Prisma.PromotionInclude<ExtArgs> | null;
};
