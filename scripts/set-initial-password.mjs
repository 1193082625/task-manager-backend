import pg from 'pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const { Client } = pg;

const phone = process.argv[2];
const password = process.env.INITIAL_PASSWORD;

if (!phone) {
  throw new Error('请提供手机号');
}

if (!password || password.length < 8 || password.length > 128) {
  throw new Error('请通过 INITIAL_PASSWORD 提供 8～128 位密码');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const result = await client.query(
    `UPDATE users SET "passwordHash" = $1 WHERE phone = $2 RETURNING id, name, phone`,
    [passwordHash, phone],
  );

  if (result.rowCount !== 1) {
    throw new Error('未找到唯一匹配的用户');
  }

  console.log('初始密码设置成功：', result.rows[0]);
} finally {
  await client.end();
}
