import { json,rateLimit,verifyOrigin } from '@/lib/server';
import { MOKRA_GAME_FACTS } from '@/lib/mokraKnowledge';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const MAX_HISTORY=10;
const MAX_INPUT=900;

export async function GET() {
  return json({name:'Mokra AI',ready:Boolean(process.env.GROQ_API_KEY),speech:'browser'});
}

export async function POST(request) {
  try {
    if(!verifyOrigin(request))return json({error:'This request is not from the Mokra website.'},403);
    if(!(await rateLimit('mokra-ai',12,60)))return json({error:'Too many questions. Please try again in a minute.'},429);
    if(!process.env.GROQ_API_KEY)return json({error:'Mokra AI is not connected yet. The site owner needs to configure GROQ_API_KEY on the server.'},503);
    const length=Number(request.headers.get('content-length')||0);
    if(length>16000)return json({error:'Message history is too long.'},413);
    let body;
    try{body=await request.json()}catch{return json({error:'Invalid message.'},400)}
    if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>MAX_HISTORY)
      return json({error:'Please send a shorter conversation.'},400);
    const history=[];
    for(const input of body.messages) {
      if(!input||!['user','assistant'].includes(input.role)||typeof input.content!=='string')
        return json({error:'Invalid chat message.'},400);
      const content=input.content.trim();
      if(!content||content.length>MAX_INPUT)return json({error:'Please keep each message under 900 characters.'},400);
      history.push({role:input.role,content});
    }
    if(history[history.length-1].role!=='user')return json({error:'Send a question first.'},400);

    const systemMessage=`You are Mokra AI, a clear, friendly virtual guide for a VR game website. Explain accurately, in a relaxed style, generally under 130 words. Respond to relevant general questions too, but prioritize Mokra questions.
MOKRA FACTS (authoritative; do not invent any other game-specific details):
${MOKRA_GAME_FACTS}
Keep responses appropriate for a broad age range including teens. Never request passwords, email, headset tokens, location, or other personal data. Never claim to be a real employee, a human, or to see private account information. You are an AI assistant. If you don't know an unreleased game feature, say it isn't announced. Don't suggest unsafe stunts or harmful acts. Avoid markdown tables, links to unknown websites, and huge responses.`;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),18000);
    let response;
    try {
      response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Authorization':`Bearer ${process.env.GROQ_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:process.env.GROQ_MODEL||'llama-3.3-70b-versatile',
          messages:[{role:'system',content:systemMessage},...history],
          temperature:.55,
          max_completion_tokens:420,
          stream:false
        }),
        cache:'no-store',
        signal:controller.signal
      });
    } finally {clearTimeout(timer)}
    if(!response.ok){
      console.error('Mokra AI provider error status:',response.status);
      return json({error:response.status===429?'Mokra AI is busy. Try again soon.':'Mokra AI could not respond right now. Please try again.'},response.status===429?429:502);
    }
    const result=await response.json();
    const answer=result.choices?.[0]?.message?.content;
    if(typeof answer!=='string'||!answer.trim())return json({error:'Mokra AI returned an empty response. Try another question.'},502);
    return json({reply:answer.trim().slice(0,3500)});
  }catch(err){
    if(err?.name==='AbortError')return json({error:'Mokra AI took too long. Please retry.'},504);
    console.error('Mokra AI request failed:',err?.message||'unknown');
    return json({error:'Mokra AI is temporarily unavailable.'},503);
  }
}
