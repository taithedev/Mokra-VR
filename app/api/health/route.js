import { query, json } from '@/lib/server';
export const runtime='nodejs';
export async function GET(){try{await query('SELECT 1');return json({status:'ok',database:'connected'});}catch{return json({status:'configuration_required',database:'unavailable'},503)}}
