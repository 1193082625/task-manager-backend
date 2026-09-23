// Prisma CLI 加载的 prisma.config.ts 不会自动成为 NestJS 的运行时配置
import "dotenv/config"
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from '@prisma/adapter-pg'


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const connectionString = process.env.DATABASE_URL

        if (!connectionString) {
            throw new Error('缺少 DATABASE_URL 环境变量')
        }

        const adapter = new PrismaPg({ connectionString })

        super({ adapter })
    }

    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }
}