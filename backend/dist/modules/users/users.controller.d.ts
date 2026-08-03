import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): Promise<{
        email: string;
        name: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        avatarUrl: string | null;
        phone: string | null;
        id: string;
        isActive: boolean;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(user: any, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        avatarUrl: string | null;
        phone: string | null;
        id: string;
        isActive: boolean;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        avatarUrl: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        name: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        avatarUrl: string | null;
        phone: string | null;
        id: string;
        isActive: boolean;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        email: string;
        name: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        avatarUrl: string | null;
        phone: string | null;
        id: string;
        isActive: boolean;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
