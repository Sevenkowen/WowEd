import pg from 'pg'

const c = new pg.Client({
  host: process.env.PGHOST || '45.236.130.10',
  port: 5432,
  user: process.env.PGUSER || 'ajenjo',
  password: process.env.PGPASSWORD || '',
  database: 'postgres',
})
await c.connect()
const { rows: tables } = await c.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`,
)
for (const { table_name } of tables) {
  const { rows: cols } = await c.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1
     ORDER BY ordinal_position`,
    [table_name],
  )
  console.log('\n-- ' + table_name)
  for (const col of cols) console.log('  ' + col.column_name + ': ' + col.data_type)
}
await c.end()
