"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonNullValueFilter = exports.NullsOrder = exports.QueryMode = exports.JsonNullValueInput = exports.NullableJsonNullValueInput = exports.SortOrder = exports.AdvertisementScalarFieldEnum = exports.PromotionScalarFieldEnum = exports.ShopScalarFieldEnum = exports.OrderItemScalarFieldEnum = exports.OrderScalarFieldEnum = exports.WishlistScalarFieldEnum = exports.ReviewScalarFieldEnum = exports.ProductScalarFieldEnum = exports.CategoryScalarFieldEnum = exports.RefreshTokenScalarFieldEnum = exports.UserScalarFieldEnum = exports.TransactionIsolationLevel = exports.ModelName = exports.AnyNull = exports.JsonNull = exports.DbNull = exports.NullTypes = exports.Decimal = void 0;
const runtime = __importStar(require("@prisma/client/runtime/index-browser"));
exports.Decimal = runtime.Decimal;
exports.NullTypes = {
    DbNull: runtime.NullTypes.DbNull,
    JsonNull: runtime.NullTypes.JsonNull,
    AnyNull: runtime.NullTypes.AnyNull,
};
exports.DbNull = runtime.DbNull;
exports.JsonNull = runtime.JsonNull;
exports.AnyNull = runtime.AnyNull;
exports.ModelName = {
    User: 'User',
    RefreshToken: 'RefreshToken',
    Category: 'Category',
    Product: 'Product',
    Review: 'Review',
    Wishlist: 'Wishlist',
    Order: 'Order',
    OrderItem: 'OrderItem',
    Shop: 'Shop',
    Promotion: 'Promotion',
    Advertisement: 'Advertisement'
};
exports.TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
});
exports.UserScalarFieldEnum = {
    id: 'id',
    email: 'email',
    name: 'name',
    passwordHash: 'passwordHash',
    role: 'role',
    avatarUrl: 'avatarUrl',
    phone: 'phone',
    isActive: 'isActive',
    emailVerified: 'emailVerified',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
exports.RefreshTokenScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    tokenHash: 'tokenHash',
    family: 'family',
    deviceInfo: 'deviceInfo',
    ipAddress: 'ipAddress',
    isRevoked: 'isRevoked',
    absoluteLimitAt: 'absoluteLimitAt',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
};
exports.CategoryScalarFieldEnum = {
    id: 'id',
    name: 'name',
    slug: 'slug',
    parentId: 'parentId',
    iconUrl: 'iconUrl',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt'
};
exports.ProductScalarFieldEnum = {
    id: 'id',
    merchantId: 'merchantId',
    categoryId: 'categoryId',
    name: 'name',
    slug: 'slug',
    description: 'description',
    shortDescription: 'shortDescription',
    price: 'price',
    compareAtPrice: 'compareAtPrice',
    sku: 'sku',
    stockQuantity: 'stockQuantity',
    lowStockThreshold: 'lowStockThreshold',
    images: 'images',
    tags: 'tags',
    skinTypes: 'skinTypes',
    ingredients: 'ingredients',
    isActive: 'isActive',
    isFeatured: 'isFeatured',
    avgRating: 'avgRating',
    reviewCount: 'reviewCount',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
exports.ReviewScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    productId: 'productId',
    rating: 'rating',
    title: 'title',
    body: 'body',
    images: 'images',
    isVerifiedPurchase: 'isVerifiedPurchase',
    isApproved: 'isApproved',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
exports.WishlistScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    productId: 'productId',
    createdAt: 'createdAt'
};
exports.OrderScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    status: 'status',
    subtotal: 'subtotal',
    shippingCost: 'shippingCost',
    tax: 'tax',
    total: 'total',
    shippingAddress: 'shippingAddress',
    paymentMethod: 'paymentMethod',
    paymentStatus: 'paymentStatus',
    notes: 'notes',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
exports.OrderItemScalarFieldEnum = {
    id: 'id',
    orderId: 'orderId',
    productId: 'productId',
    merchantId: 'merchantId',
    quantity: 'quantity',
    unitPrice: 'unitPrice',
    totalPrice: 'totalPrice'
};
exports.ShopScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    name: 'name',
    slug: 'slug',
    description: 'description',
    logoUrl: 'logoUrl',
    bannerUrl: 'bannerUrl',
    address: 'address',
    phone: 'phone',
    email: 'email',
    latitude: 'latitude',
    longitude: 'longitude',
    isApproved: 'isApproved',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
exports.PromotionScalarFieldEnum = {
    id: 'id',
    merchantId: 'merchantId',
    code: 'code',
    description: 'description',
    discountType: 'discountType',
    discountValue: 'discountValue',
    minOrderAmount: 'minOrderAmount',
    maxUses: 'maxUses',
    usedCount: 'usedCount',
    startsAt: 'startsAt',
    expiresAt: 'expiresAt',
    isActive: 'isActive',
    createdAt: 'createdAt'
};
exports.AdvertisementScalarFieldEnum = {
    id: 'id',
    shopId: 'shopId',
    title: 'title',
    content: 'content',
    imageUrl: 'imageUrl',
    linkUrl: 'linkUrl',
    isActive: 'isActive',
    startsAt: 'startsAt',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
};
exports.SortOrder = {
    asc: 'asc',
    desc: 'desc'
};
exports.NullableJsonNullValueInput = {
    DbNull: exports.DbNull,
    JsonNull: exports.JsonNull
};
exports.JsonNullValueInput = {
    JsonNull: exports.JsonNull
};
exports.QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
};
exports.NullsOrder = {
    first: 'first',
    last: 'last'
};
exports.JsonNullValueFilter = {
    DbNull: exports.DbNull,
    JsonNull: exports.JsonNull,
    AnyNull: exports.AnyNull
};
//# sourceMappingURL=prismaNamespaceBrowser.js.map