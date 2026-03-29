import { db } from './server/db'
import { ipos } from './server/db/schema'

async function verifyIndexer() {
  const allIpos = await db.select().from(ipos)
  console.log(allIpos)
  process.exit()
}
verifyIndexer()
