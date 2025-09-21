/*
  Seed an admin user.
  Usage examples:
    - With env vars: AUTH_NAME, AUTH_EMAIL, AUTH_PASSWORD
        npm run seed:admin
    - With CLI args:
        npm run seed:admin -- --name "Jane Admin" --email admin@example.com --password secret123
*/
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type Args = {
  name?: string;
  email?: string;
  password?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const res: Args = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--name') res.name = args[++i];
    if (a === '--email') res.email = args[++i];
    if (a === '--password') res.password = args[++i];
  }
  return res;
}

async function main() {
  const cli = parseArgs();
  const name = cli.name || process.env.AUTH_NAME || 'Administrator';
  const email = (cli.email || process.env.AUTH_EMAIL || '').toLowerCase();
  const password = cli.password || process.env.AUTH_PASSWORD || '';

  if (!email || !password) {
    console.error('Missing credentials. Provide --email and --password or set AUTH_EMAIL and AUTH_PASSWORD.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: 'ADMIN',
        grants: [],
      },
    });
    console.log(`Updated existing user to ADMIN: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'ADMIN',
        grants: [],
        department: 'Administration',
      },
    });
    console.log(`Created admin user: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

