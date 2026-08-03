"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountType = exports.OrderStatus = exports.UserRole = void 0;
exports.UserRole = {
    buyer: 'buyer',
    merchant: 'merchant',
    admin: 'admin'
};
exports.OrderStatus = {
    pending: 'pending',
    confirmed: 'confirmed',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
    refunded: 'refunded'
};
exports.DiscountType = {
    percentage: 'percentage',
    fixed: 'fixed'
};
//# sourceMappingURL=enums.js.map