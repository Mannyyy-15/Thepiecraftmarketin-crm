import { db } from './lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Connecting and updating locations table...');
  await db.execute(sql`UPDATE locations SET wifi_public_ip = '203.194.97.74'`);
  console.log('Updated IP to 203.194.97.74');
  process.exit(0);
}

main();
