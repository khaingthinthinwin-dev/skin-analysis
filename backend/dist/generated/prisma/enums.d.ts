export declare const UserRole: {
    readonly buyer: "buyer";
    readonly merchant: "merchant";
    readonly admin: "admin";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const OrderStatus: {
    readonly pending: "pending";
    readonly confirmed: "confirmed";
    readonly processing: "processing";
    readonly shipped: "shipped";
    readonly delivered: "delivered";
    readonly cancelled: "cancelled";
    readonly refunded: "refunded";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const DiscountType: {
    readonly percentage: "percentage";
    readonly fixed: "fixed";
};
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];
