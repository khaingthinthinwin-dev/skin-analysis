export declare enum UserRole {
    buyer = "buyer",
    merchant = "merchant",
    admin = "admin"
}
export declare class CreateUserDto {
    email: string;
    name: string;
    passwordHash: string;
    role?: UserRole;
}
