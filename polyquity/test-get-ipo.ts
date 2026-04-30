import 'dotenv/config';
import { db } from './server/db/index';
import { ipos } from './server/db/schema';
import { eq } from 'drizzle-orm';
async function test() {
  const result = await db.query.ipos.findFirst({
    where: eq(ipos.contractAddress, '0x3ca8f9c04c7e3e1624ac2008f92f6f366a869444'.toLowerCase()),
    with: { company: true },
  });
  console.log("Result:", result);
  process.exit(0);
}
test().catch(console.error);
