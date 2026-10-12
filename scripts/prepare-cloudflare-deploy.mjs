import fs from 'node:fs';
import {createHash} from 'node:crypto';
const required=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','WORKER_NAME','D1_DATABASE_ID','D1_DATABASE_NAME','R2_BUCKET_NAME','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','VERIFIED_SCHEMA_SHA256'];
for(const key of required)if(!process.env[key])throw Error('Missing release configuration: '+key);
const e=process.env;
if(!/^[a-f0-9-]{36}$/i.test(e.D1_DATABASE_ID)||e.D1_DATABASE_ID.startsWith('00000000'))throw Error('An existing production D1 database ID is required.');
if(!e.SUPABASE_URL.startsWith('https://'))throw Error('HTTPS authentication endpoint required.');
const hash=createHash('sha256');
for(const name of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){hash.update(name);hash.update(fs.readFileSync('drizzle/'+name));}
const schema=hash.digest('hex');
if(schema!==e.VERIFIED_SCHEMA_SHA256)throw Error('Schema changed or not verified. Verify backup/restore and apply additive migrations separately before approving this schema fingerprint: '+schema);
const file='dist/server/wrangler.json',config=JSON.parse(fs.readFileSync(file,'utf8'));
Object.assign(config,{name:e.WORKER_NAME,account_id:e.CLOUDFLARE_ACCOUNT_ID,workers_dev:true,d1_databases:[{binding:'DB',database_name:e.D1_DATABASE_NAME,database_id:e.D1_DATABASE_ID}],r2_buckets:[{binding:'BUCKET',bucket_name:e.R2_BUCKET_NAME}],vars:{AUTH_MODE:'supabase',SUPABASE_URL:e.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:e.SUPABASE_PUBLISHABLE_KEY,PRIVATE_CATALOG_UPDATER:'disabled'}});
fs.writeFileSync(file,JSON.stringify(config,null,2));
console.log('Prepared code-only release against existing persistent storage. No database migrations, seeds or resets run.');
