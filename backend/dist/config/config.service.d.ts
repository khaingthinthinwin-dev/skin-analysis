declare const _default: (() => {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    corsOrigin: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    corsOrigin: string;
}>;
export default _default;
export declare const databaseConfig: (() => {
    url: string | undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    url: string | undefined;
}>;
export declare const redisConfig: (() => {
    url: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    url: string;
}>;
export declare const jwtConfig: (() => {
    accessSecret: string;
    refreshSecret: string;
    accessExpiration: string;
    refreshExpiration: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    accessSecret: string;
    refreshSecret: string;
    accessExpiration: string;
    refreshExpiration: string;
}>;
