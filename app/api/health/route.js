import {query,json} from '@/lib/server';
export const runtime='nodejs';
export async function GET() {
 try{
  const tables=await query("SELECT to_regclass('public.mokra_accounts') IS NOT NULL AS accounts, to_regclass('public.mokra_web_sessions') IS NOT NULL AS sessions");
  if(!tables[0]?.accounts||!tables[0]?.sessions)return json({status:'setup_required',database:'migration_required'},503);
  return json({status:'ok',database:'connected',auth:'ready'});
 }catch(e){console.error('Mokra health:',e.message);return json({status:'setup_required',database:'unavailable'},503);}
}
