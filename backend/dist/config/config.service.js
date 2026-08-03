"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = exports.redisConfig = exports.databaseConfig = void 0;
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('app', () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8080', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
exports.databaseConfig = (0, config_1.registerAs)('database', () => ({
    url: process.env.DATABASE_URL,
}));
exports.redisConfig = (0, config_1.registerAs)('redis', () => ({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
}));
exports.jwtConfig = (0, config_1.registerAs)('jwt', () => ({
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
//# sourceMappingURL=config.service.js.map