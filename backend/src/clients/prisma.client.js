import { PrismaClient } from "@prisma/client";

/**
 * Singleton: toàn bộ ứng dụng dùng chung một kết nối.
 */
export const prisma = new PrismaClient();
