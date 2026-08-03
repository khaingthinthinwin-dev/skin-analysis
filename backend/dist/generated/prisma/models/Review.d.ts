import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type ReviewModel = runtime.Types.Result.DefaultSelection<Prisma.$ReviewPayload>;
export type AggregateReview = {
    _count: ReviewCountAggregateOutputType | null;
    _avg: ReviewAvgAggregateOutputType | null;
    _sum: ReviewSumAggregateOutputType | null;
    _min: ReviewMinAggregateOutputType | null;
    _max: ReviewMaxAggregateOutputType | null;
};
export type ReviewAvgAggregateOutputType = {
    rating: number | null;
};
export type ReviewSumAggregateOutputType = {
    rating: number | null;
};
export type ReviewMinAggregateOutputType = {
    id: string | null;
    userId: string | null;
    productId: string | null;
    rating: number | null;
    title: string | null;
    body: string | null;
    isVerifiedPurchase: boolean | null;
    isApproved: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type ReviewMaxAggregateOutputType = {
    id: string | null;
    userId: string | null;
    productId: string | null;
    rating: number | null;
    title: string | null;
    body: string | null;
    isVerifiedPurchase: boolean | null;
    isApproved: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type ReviewCountAggregateOutputType = {
    id: number;
    userId: number;
    productId: number;
    rating: number;
    title: number;
    body: number;
    images: number;
    isVerifiedPurchase: number;
    isApproved: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type ReviewAvgAggregateInputType = {
    rating?: true;
};
export type ReviewSumAggregateInputType = {
    rating?: true;
};
export type ReviewMinAggregateInputType = {
    id?: true;
    userId?: true;
    productId?: true;
    rating?: true;
    title?: true;
    body?: true;
    isVerifiedPurchase?: true;
    isApproved?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type ReviewMaxAggregateInputType = {
    id?: true;
    userId?: true;
    productId?: true;
    rating?: true;
    title?: true;
    body?: true;
    isVerifiedPurchase?: true;
    isApproved?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type ReviewCountAggregateInputType = {
    id?: true;
    userId?: true;
    productId?: true;
    rating?: true;
    title?: true;
    body?: true;
    images?: true;
    isVerifiedPurchase?: true;
    isApproved?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type ReviewAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[];
    cursor?: Prisma.ReviewWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | ReviewCountAggregateInputType;
    _avg?: ReviewAvgAggregateInputType;
    _sum?: ReviewSumAggregateInputType;
    _min?: ReviewMinAggregateInputType;
    _max?: ReviewMaxAggregateInputType;
};
export type GetReviewAggregateType<T extends ReviewAggregateArgs> = {
    [P in keyof T & keyof AggregateReview]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateReview[P]> : Prisma.GetScalarType<T[P], AggregateReview[P]>;
};
export type ReviewGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithAggregationInput | Prisma.ReviewOrderByWithAggregationInput[];
    by: Prisma.ReviewScalarFieldEnum[] | Prisma.ReviewScalarFieldEnum;
    having?: Prisma.ReviewScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: ReviewCountAggregateInputType | true;
    _avg?: ReviewAvgAggregateInputType;
    _sum?: ReviewSumAggregateInputType;
    _min?: ReviewMinAggregateInputType;
    _max?: ReviewMaxAggregateInputType;
};
export type ReviewGroupByOutputType = {
    id: string;
    userId: string;
    productId: string;
    rating: number;
    title: string | null;
    body: string | null;
    images: string[];
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: ReviewCountAggregateOutputType | null;
    _avg: ReviewAvgAggregateOutputType | null;
    _sum: ReviewSumAggregateOutputType | null;
    _min: ReviewMinAggregateOutputType | null;
    _max: ReviewMaxAggregateOutputType | null;
};
export type GetReviewGroupByPayload<T extends ReviewGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<ReviewGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof ReviewGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], ReviewGroupByOutputType[P]> : Prisma.GetScalarType<T[P], ReviewGroupByOutputType[P]>;
}>>;
export type ReviewWhereInput = {
    AND?: Prisma.ReviewWhereInput | Prisma.ReviewWhereInput[];
    OR?: Prisma.ReviewWhereInput[];
    NOT?: Prisma.ReviewWhereInput | Prisma.ReviewWhereInput[];
    id?: Prisma.StringFilter<"Review"> | string;
    userId?: Prisma.StringFilter<"Review"> | string;
    productId?: Prisma.StringFilter<"Review"> | string;
    rating?: Prisma.IntFilter<"Review"> | number;
    title?: Prisma.StringNullableFilter<"Review"> | string | null;
    body?: Prisma.StringNullableFilter<"Review"> | string | null;
    images?: Prisma.StringNullableListFilter<"Review">;
    isVerifiedPurchase?: Prisma.BoolFilter<"Review"> | boolean;
    isApproved?: Prisma.BoolFilter<"Review"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Review"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Review"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    product?: Prisma.XOR<Prisma.ProductScalarRelationFilter, Prisma.ProductWhereInput>;
};
export type ReviewOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    productId?: Prisma.SortOrder;
    rating?: Prisma.SortOrder;
    title?: Prisma.SortOrderInput | Prisma.SortOrder;
    body?: Prisma.SortOrderInput | Prisma.SortOrder;
    images?: Prisma.SortOrder;
    isVerifiedPurchase?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    product?: Prisma.ProductOrderByWithRelationInput;
};
export type ReviewWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    userId_productId?: Prisma.ReviewUserIdProductIdCompoundUniqueInput;
    AND?: Prisma.ReviewWhereInput | Prisma.ReviewWhereInput[];
    OR?: Prisma.ReviewWhereInput[];
    NOT?: Prisma.ReviewWhereInput | Prisma.ReviewWhereInput[];
    userId?: Prisma.StringFilter<"Review"> | string;
    productId?: Prisma.StringFilter<"Review"> | string;
    rating?: Prisma.IntFilter<"Review"> | number;
    title?: Prisma.StringNullableFilter<"Review"> | string | null;
    body?: Prisma.StringNullableFilter<"Review"> | string | null;
    images?: Prisma.StringNullableListFilter<"Review">;
    isVerifiedPurchase?: Prisma.BoolFilter<"Review"> | boolean;
    isApproved?: Prisma.BoolFilter<"Review"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Review"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Review"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    product?: Prisma.XOR<Prisma.ProductScalarRelationFilter, Prisma.ProductWhereInput>;
}, "id" | "userId_productId">;
export type ReviewOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    productId?: Prisma.SortOrder;
    rating?: Prisma.SortOrder;
    title?: Prisma.SortOrderInput | Prisma.SortOrder;
    body?: Prisma.SortOrderInput | Prisma.SortOrder;
    images?: Prisma.SortOrder;
    isVerifiedPurchase?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.ReviewCountOrderByAggregateInput;
    _avg?: Prisma.ReviewAvgOrderByAggregateInput;
    _max?: Prisma.ReviewMaxOrderByAggregateInput;
    _min?: Prisma.ReviewMinOrderByAggregateInput;
    _sum?: Prisma.ReviewSumOrderByAggregateInput;
};
export type ReviewScalarWhereWithAggregatesInput = {
    AND?: Prisma.ReviewScalarWhereWithAggregatesInput | Prisma.ReviewScalarWhereWithAggregatesInput[];
    OR?: Prisma.ReviewScalarWhereWithAggregatesInput[];
    NOT?: Prisma.ReviewScalarWhereWithAggregatesInput | Prisma.ReviewScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Review"> | string;
    userId?: Prisma.StringWithAggregatesFilter<"Review"> | string;
    productId?: Prisma.StringWithAggregatesFilter<"Review"> | string;
    rating?: Prisma.IntWithAggregatesFilter<"Review"> | number;
    title?: Prisma.StringNullableWithAggregatesFilter<"Review"> | string | null;
    body?: Prisma.StringNullableWithAggregatesFilter<"Review"> | string | null;
    images?: Prisma.StringNullableListFilter<"Review">;
    isVerifiedPurchase?: Prisma.BoolWithAggregatesFilter<"Review"> | boolean;
    isApproved?: Prisma.BoolWithAggregatesFilter<"Review"> | boolean;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Review"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"Review"> | Date | string;
};
export type ReviewCreateInput = {
    id?: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutReviewsInput;
    product: Prisma.ProductCreateNestedOneWithoutReviewsInput;
};
export type ReviewUncheckedCreateInput = {
    id?: string;
    userId: string;
    productId: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ReviewUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutReviewsNestedInput;
    product?: Prisma.ProductUpdateOneRequiredWithoutReviewsNestedInput;
};
export type ReviewUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    productId?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewCreateManyInput = {
    id?: string;
    userId: string;
    productId: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ReviewUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    productId?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewListRelationFilter = {
    every?: Prisma.ReviewWhereInput;
    some?: Prisma.ReviewWhereInput;
    none?: Prisma.ReviewWhereInput;
};
export type ReviewOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type ReviewUserIdProductIdCompoundUniqueInput = {
    userId: string;
    productId: string;
};
export type ReviewCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    productId?: Prisma.SortOrder;
    rating?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    images?: Prisma.SortOrder;
    isVerifiedPurchase?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ReviewAvgOrderByAggregateInput = {
    rating?: Prisma.SortOrder;
};
export type ReviewMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    productId?: Prisma.SortOrder;
    rating?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    isVerifiedPurchase?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ReviewMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    productId?: Prisma.SortOrder;
    rating?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    isVerifiedPurchase?: Prisma.SortOrder;
    isApproved?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ReviewSumOrderByAggregateInput = {
    rating?: Prisma.SortOrder;
};
export type ReviewCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutUserInput, Prisma.ReviewUncheckedCreateWithoutUserInput> | Prisma.ReviewCreateWithoutUserInput[] | Prisma.ReviewUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutUserInput | Prisma.ReviewCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.ReviewCreateManyUserInputEnvelope;
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
};
export type ReviewUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutUserInput, Prisma.ReviewUncheckedCreateWithoutUserInput> | Prisma.ReviewCreateWithoutUserInput[] | Prisma.ReviewUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutUserInput | Prisma.ReviewCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.ReviewCreateManyUserInputEnvelope;
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
};
export type ReviewUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutUserInput, Prisma.ReviewUncheckedCreateWithoutUserInput> | Prisma.ReviewCreateWithoutUserInput[] | Prisma.ReviewUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutUserInput | Prisma.ReviewCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.ReviewUpsertWithWhereUniqueWithoutUserInput | Prisma.ReviewUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.ReviewCreateManyUserInputEnvelope;
    set?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    disconnect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    delete?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    update?: Prisma.ReviewUpdateWithWhereUniqueWithoutUserInput | Prisma.ReviewUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.ReviewUpdateManyWithWhereWithoutUserInput | Prisma.ReviewUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.ReviewScalarWhereInput | Prisma.ReviewScalarWhereInput[];
};
export type ReviewUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutUserInput, Prisma.ReviewUncheckedCreateWithoutUserInput> | Prisma.ReviewCreateWithoutUserInput[] | Prisma.ReviewUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutUserInput | Prisma.ReviewCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.ReviewUpsertWithWhereUniqueWithoutUserInput | Prisma.ReviewUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.ReviewCreateManyUserInputEnvelope;
    set?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    disconnect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    delete?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    update?: Prisma.ReviewUpdateWithWhereUniqueWithoutUserInput | Prisma.ReviewUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.ReviewUpdateManyWithWhereWithoutUserInput | Prisma.ReviewUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.ReviewScalarWhereInput | Prisma.ReviewScalarWhereInput[];
};
export type ReviewCreateNestedManyWithoutProductInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutProductInput, Prisma.ReviewUncheckedCreateWithoutProductInput> | Prisma.ReviewCreateWithoutProductInput[] | Prisma.ReviewUncheckedCreateWithoutProductInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutProductInput | Prisma.ReviewCreateOrConnectWithoutProductInput[];
    createMany?: Prisma.ReviewCreateManyProductInputEnvelope;
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
};
export type ReviewUncheckedCreateNestedManyWithoutProductInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutProductInput, Prisma.ReviewUncheckedCreateWithoutProductInput> | Prisma.ReviewCreateWithoutProductInput[] | Prisma.ReviewUncheckedCreateWithoutProductInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutProductInput | Prisma.ReviewCreateOrConnectWithoutProductInput[];
    createMany?: Prisma.ReviewCreateManyProductInputEnvelope;
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
};
export type ReviewUpdateManyWithoutProductNestedInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutProductInput, Prisma.ReviewUncheckedCreateWithoutProductInput> | Prisma.ReviewCreateWithoutProductInput[] | Prisma.ReviewUncheckedCreateWithoutProductInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutProductInput | Prisma.ReviewCreateOrConnectWithoutProductInput[];
    upsert?: Prisma.ReviewUpsertWithWhereUniqueWithoutProductInput | Prisma.ReviewUpsertWithWhereUniqueWithoutProductInput[];
    createMany?: Prisma.ReviewCreateManyProductInputEnvelope;
    set?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    disconnect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    delete?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    update?: Prisma.ReviewUpdateWithWhereUniqueWithoutProductInput | Prisma.ReviewUpdateWithWhereUniqueWithoutProductInput[];
    updateMany?: Prisma.ReviewUpdateManyWithWhereWithoutProductInput | Prisma.ReviewUpdateManyWithWhereWithoutProductInput[];
    deleteMany?: Prisma.ReviewScalarWhereInput | Prisma.ReviewScalarWhereInput[];
};
export type ReviewUncheckedUpdateManyWithoutProductNestedInput = {
    create?: Prisma.XOR<Prisma.ReviewCreateWithoutProductInput, Prisma.ReviewUncheckedCreateWithoutProductInput> | Prisma.ReviewCreateWithoutProductInput[] | Prisma.ReviewUncheckedCreateWithoutProductInput[];
    connectOrCreate?: Prisma.ReviewCreateOrConnectWithoutProductInput | Prisma.ReviewCreateOrConnectWithoutProductInput[];
    upsert?: Prisma.ReviewUpsertWithWhereUniqueWithoutProductInput | Prisma.ReviewUpsertWithWhereUniqueWithoutProductInput[];
    createMany?: Prisma.ReviewCreateManyProductInputEnvelope;
    set?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    disconnect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    delete?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    connect?: Prisma.ReviewWhereUniqueInput | Prisma.ReviewWhereUniqueInput[];
    update?: Prisma.ReviewUpdateWithWhereUniqueWithoutProductInput | Prisma.ReviewUpdateWithWhereUniqueWithoutProductInput[];
    updateMany?: Prisma.ReviewUpdateManyWithWhereWithoutProductInput | Prisma.ReviewUpdateManyWithWhereWithoutProductInput[];
    deleteMany?: Prisma.ReviewScalarWhereInput | Prisma.ReviewScalarWhereInput[];
};
export type ReviewCreateimagesInput = {
    set: string[];
};
export type ReviewUpdateimagesInput = {
    set?: string[];
    push?: string | string[];
};
export type ReviewCreateWithoutUserInput = {
    id?: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    product: Prisma.ProductCreateNestedOneWithoutReviewsInput;
};
export type ReviewUncheckedCreateWithoutUserInput = {
    id?: string;
    productId: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ReviewCreateOrConnectWithoutUserInput = {
    where: Prisma.ReviewWhereUniqueInput;
    create: Prisma.XOR<Prisma.ReviewCreateWithoutUserInput, Prisma.ReviewUncheckedCreateWithoutUserInput>;
};
export type ReviewCreateManyUserInputEnvelope = {
    data: Prisma.ReviewCreateManyUserInput | Prisma.ReviewCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type ReviewUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.ReviewWhereUniqueInput;
    update: Prisma.XOR<Prisma.ReviewUpdateWithoutUserInput, Prisma.ReviewUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.ReviewCreateWithoutUserInput, Prisma.ReviewUncheckedCreateWithoutUserInput>;
};
export type ReviewUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.ReviewWhereUniqueInput;
    data: Prisma.XOR<Prisma.ReviewUpdateWithoutUserInput, Prisma.ReviewUncheckedUpdateWithoutUserInput>;
};
export type ReviewUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.ReviewScalarWhereInput;
    data: Prisma.XOR<Prisma.ReviewUpdateManyMutationInput, Prisma.ReviewUncheckedUpdateManyWithoutUserInput>;
};
export type ReviewScalarWhereInput = {
    AND?: Prisma.ReviewScalarWhereInput | Prisma.ReviewScalarWhereInput[];
    OR?: Prisma.ReviewScalarWhereInput[];
    NOT?: Prisma.ReviewScalarWhereInput | Prisma.ReviewScalarWhereInput[];
    id?: Prisma.StringFilter<"Review"> | string;
    userId?: Prisma.StringFilter<"Review"> | string;
    productId?: Prisma.StringFilter<"Review"> | string;
    rating?: Prisma.IntFilter<"Review"> | number;
    title?: Prisma.StringNullableFilter<"Review"> | string | null;
    body?: Prisma.StringNullableFilter<"Review"> | string | null;
    images?: Prisma.StringNullableListFilter<"Review">;
    isVerifiedPurchase?: Prisma.BoolFilter<"Review"> | boolean;
    isApproved?: Prisma.BoolFilter<"Review"> | boolean;
    createdAt?: Prisma.DateTimeFilter<"Review"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Review"> | Date | string;
};
export type ReviewCreateWithoutProductInput = {
    id?: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutReviewsInput;
};
export type ReviewUncheckedCreateWithoutProductInput = {
    id?: string;
    userId: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ReviewCreateOrConnectWithoutProductInput = {
    where: Prisma.ReviewWhereUniqueInput;
    create: Prisma.XOR<Prisma.ReviewCreateWithoutProductInput, Prisma.ReviewUncheckedCreateWithoutProductInput>;
};
export type ReviewCreateManyProductInputEnvelope = {
    data: Prisma.ReviewCreateManyProductInput | Prisma.ReviewCreateManyProductInput[];
    skipDuplicates?: boolean;
};
export type ReviewUpsertWithWhereUniqueWithoutProductInput = {
    where: Prisma.ReviewWhereUniqueInput;
    update: Prisma.XOR<Prisma.ReviewUpdateWithoutProductInput, Prisma.ReviewUncheckedUpdateWithoutProductInput>;
    create: Prisma.XOR<Prisma.ReviewCreateWithoutProductInput, Prisma.ReviewUncheckedCreateWithoutProductInput>;
};
export type ReviewUpdateWithWhereUniqueWithoutProductInput = {
    where: Prisma.ReviewWhereUniqueInput;
    data: Prisma.XOR<Prisma.ReviewUpdateWithoutProductInput, Prisma.ReviewUncheckedUpdateWithoutProductInput>;
};
export type ReviewUpdateManyWithWhereWithoutProductInput = {
    where: Prisma.ReviewScalarWhereInput;
    data: Prisma.XOR<Prisma.ReviewUpdateManyMutationInput, Prisma.ReviewUncheckedUpdateManyWithoutProductInput>;
};
export type ReviewCreateManyUserInput = {
    id?: string;
    productId: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ReviewUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    product?: Prisma.ProductUpdateOneRequiredWithoutReviewsNestedInput;
};
export type ReviewUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    productId?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    productId?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewCreateManyProductInput = {
    id?: string;
    userId: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    images?: Prisma.ReviewCreateimagesInput | string[];
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ReviewUpdateWithoutProductInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutReviewsNestedInput;
};
export type ReviewUncheckedUpdateWithoutProductInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewUncheckedUpdateManyWithoutProductInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    rating?: Prisma.IntFieldUpdateOperationsInput | number;
    title?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    body?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    images?: Prisma.ReviewUpdateimagesInput | string[];
    isVerifiedPurchase?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    isApproved?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ReviewSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    productId?: boolean;
    rating?: boolean;
    title?: boolean;
    body?: boolean;
    images?: boolean;
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    product?: boolean | Prisma.ProductDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["review"]>;
export type ReviewSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    productId?: boolean;
    rating?: boolean;
    title?: boolean;
    body?: boolean;
    images?: boolean;
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    product?: boolean | Prisma.ProductDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["review"]>;
export type ReviewSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    productId?: boolean;
    rating?: boolean;
    title?: boolean;
    body?: boolean;
    images?: boolean;
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    product?: boolean | Prisma.ProductDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["review"]>;
export type ReviewSelectScalar = {
    id?: boolean;
    userId?: boolean;
    productId?: boolean;
    rating?: boolean;
    title?: boolean;
    body?: boolean;
    images?: boolean;
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type ReviewOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "productId" | "rating" | "title" | "body" | "images" | "isVerifiedPurchase" | "isApproved" | "createdAt" | "updatedAt", ExtArgs["result"]["review"]>;
export type ReviewInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    product?: boolean | Prisma.ProductDefaultArgs<ExtArgs>;
};
export type ReviewIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    product?: boolean | Prisma.ProductDefaultArgs<ExtArgs>;
};
export type ReviewIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    product?: boolean | Prisma.ProductDefaultArgs<ExtArgs>;
};
export type $ReviewPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Review";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        product: Prisma.$ProductPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        userId: string;
        productId: string;
        rating: number;
        title: string | null;
        body: string | null;
        images: string[];
        isVerifiedPurchase: boolean;
        isApproved: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["review"]>;
    composites: {};
};
export type ReviewGetPayload<S extends boolean | null | undefined | ReviewDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$ReviewPayload, S>;
export type ReviewCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<ReviewFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: ReviewCountAggregateInputType | true;
};
export interface ReviewDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Review'];
        meta: {
            name: 'Review';
        };
    };
    findUnique<T extends ReviewFindUniqueArgs>(args: Prisma.SelectSubset<T, ReviewFindUniqueArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends ReviewFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, ReviewFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends ReviewFindFirstArgs>(args?: Prisma.SelectSubset<T, ReviewFindFirstArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends ReviewFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, ReviewFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends ReviewFindManyArgs>(args?: Prisma.SelectSubset<T, ReviewFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends ReviewCreateArgs>(args: Prisma.SelectSubset<T, ReviewCreateArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends ReviewCreateManyArgs>(args?: Prisma.SelectSubset<T, ReviewCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends ReviewCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, ReviewCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends ReviewDeleteArgs>(args: Prisma.SelectSubset<T, ReviewDeleteArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends ReviewUpdateArgs>(args: Prisma.SelectSubset<T, ReviewUpdateArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends ReviewDeleteManyArgs>(args?: Prisma.SelectSubset<T, ReviewDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends ReviewUpdateManyArgs>(args: Prisma.SelectSubset<T, ReviewUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends ReviewUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, ReviewUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends ReviewUpsertArgs>(args: Prisma.SelectSubset<T, ReviewUpsertArgs<ExtArgs>>): Prisma.Prisma__ReviewClient<runtime.Types.Result.GetResult<Prisma.$ReviewPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends ReviewCountArgs>(args?: Prisma.Subset<T, ReviewCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], ReviewCountAggregateOutputType> : number>;
    aggregate<T extends ReviewAggregateArgs>(args: Prisma.Subset<T, ReviewAggregateArgs>): Prisma.PrismaPromise<GetReviewAggregateType<T>>;
    groupBy<T extends ReviewGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: ReviewGroupByArgs['orderBy'];
    } : {
        orderBy?: ReviewGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, ReviewGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReviewGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: ReviewFieldRefs;
}
export interface Prisma__ReviewClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    product<T extends Prisma.ProductDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.ProductDefaultArgs<ExtArgs>>): Prisma.Prisma__ProductClient<runtime.Types.Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface ReviewFieldRefs {
    readonly id: Prisma.FieldRef<"Review", 'String'>;
    readonly userId: Prisma.FieldRef<"Review", 'String'>;
    readonly productId: Prisma.FieldRef<"Review", 'String'>;
    readonly rating: Prisma.FieldRef<"Review", 'Int'>;
    readonly title: Prisma.FieldRef<"Review", 'String'>;
    readonly body: Prisma.FieldRef<"Review", 'String'>;
    readonly images: Prisma.FieldRef<"Review", 'String[]'>;
    readonly isVerifiedPurchase: Prisma.FieldRef<"Review", 'Boolean'>;
    readonly isApproved: Prisma.FieldRef<"Review", 'Boolean'>;
    readonly createdAt: Prisma.FieldRef<"Review", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"Review", 'DateTime'>;
}
export type ReviewFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where: Prisma.ReviewWhereUniqueInput;
};
export type ReviewFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where: Prisma.ReviewWhereUniqueInput;
};
export type ReviewFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[];
    cursor?: Prisma.ReviewWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ReviewScalarFieldEnum | Prisma.ReviewScalarFieldEnum[];
};
export type ReviewFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[];
    cursor?: Prisma.ReviewWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ReviewScalarFieldEnum | Prisma.ReviewScalarFieldEnum[];
};
export type ReviewFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[];
    cursor?: Prisma.ReviewWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ReviewScalarFieldEnum | Prisma.ReviewScalarFieldEnum[];
};
export type ReviewCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ReviewCreateInput, Prisma.ReviewUncheckedCreateInput>;
};
export type ReviewCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.ReviewCreateManyInput | Prisma.ReviewCreateManyInput[];
    skipDuplicates?: boolean;
};
export type ReviewCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    data: Prisma.ReviewCreateManyInput | Prisma.ReviewCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.ReviewIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type ReviewUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ReviewUpdateInput, Prisma.ReviewUncheckedUpdateInput>;
    where: Prisma.ReviewWhereUniqueInput;
};
export type ReviewUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.ReviewUpdateManyMutationInput, Prisma.ReviewUncheckedUpdateManyInput>;
    where?: Prisma.ReviewWhereInput;
    limit?: number;
};
export type ReviewUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ReviewUpdateManyMutationInput, Prisma.ReviewUncheckedUpdateManyInput>;
    where?: Prisma.ReviewWhereInput;
    limit?: number;
    include?: Prisma.ReviewIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type ReviewUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where: Prisma.ReviewWhereUniqueInput;
    create: Prisma.XOR<Prisma.ReviewCreateInput, Prisma.ReviewUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.ReviewUpdateInput, Prisma.ReviewUncheckedUpdateInput>;
};
export type ReviewDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
    where: Prisma.ReviewWhereUniqueInput;
};
export type ReviewDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ReviewWhereInput;
    limit?: number;
};
export type ReviewDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ReviewSelect<ExtArgs> | null;
    omit?: Prisma.ReviewOmit<ExtArgs> | null;
    include?: Prisma.ReviewInclude<ExtArgs> | null;
};
