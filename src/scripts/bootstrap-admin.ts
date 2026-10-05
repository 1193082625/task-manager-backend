import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, SystemRole } from '../generated/prisma/client.js';
import * as argon2 from 'argon2';
import 'dotenv/config';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少${name}环境变量`);
  }

  return value;
}

const name = requiredEnv('BOOTSTRAP_ADMIN_NAME');
const phone = requiredEnv('BOOTSTRAP_ADMIN_PHONE');
const password = requiredEnv('BOOTSTRAP_ADMIN_PASSWORD');
const connectionString = requiredEnv('DATABASE_URL');

if (!/^1[3-9]\d{9}$/.test(phone)) {
  throw new Error('BOOTSTRAP_ADMIN_PHONE 必须是11位中国大陆手机号');
}

if (password.length < 8 || password.length > 128 || !/\S/.test(password)) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD 必须是 8 到 128 位非空白密码');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const adminCount = await prisma.user.count({
    where: { systemRole: SystemRole.ADMIN },
  });

  if (adminCount > 0) {
    throw new Error('数据库已存在管理员，拒绝重复初始化');
  }

  await prisma.user.create({
    data: {
      name,
      phone,
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
      }),
      role: 'developer',
      systemRole: SystemRole.ADMIN,
      isActive: true,
    },
  });

  console.log('初始管理员创建成功');
} finally {
  await prisma.$disconnect();
}
