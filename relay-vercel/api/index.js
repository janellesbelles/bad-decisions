const NOMI='https://api.nomi.ai/v1';
const KINDROID='https://api.kindroid.ai/v1';

function cors(res){
  // Safari is picky about preflight + deployment redirects. This relay carries
  // no server-side secret, so allow browser origins and keep requests stateless.
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Cache-Control','no-store');
}

async function readJsonResponse(resp){
  const text=await resp.text();
  let data={};
  try{ data=JSON.parse(text); }catch{ data={raw:text}; }
  if(!resp.ok){
    const msg=data?.error?.type||data?.error||data?.message||text||`Provider HTTP ${resp.status}`;
    throw new Error(String(msg));
  }
  return data;
}

export default async function handler(req,res){
  cors(res);

  if(req.method==='OPTIONS') return res.status(204).end();

  // Tiny health check so we can verify the relay directly in Safari.
  if(req.method==='GET'){
    return res.status(200).json({ok:true,service:'bad-decisions-relay'});
  }

  if(req.method!=='POST') return res.status(405).json({error:'POST only'});

  try{
    const {provider,action,apiKey,companionId,messageText=''}=req.body||{};
    if(!apiKey) return res.status(400).json({error:'Missing API key'});

    if(provider==='nomi'){
      if(action==='list'){
        const r=await fetch(`${NOMI}/nomis`,{headers:{Authorization:apiKey,'Cache-Control':'no-store'}});
        return res.status(200).json(await readJsonResponse(r));
      }
      if(action==='send'){
        if(!companionId) return res.status(400).json({error:'Missing Nomi UUID'});
        const r=await fetch(`${NOMI}/nomis/${encodeURIComponent(companionId)}/chat`,{
          method:'POST',
          headers:{Authorization:apiKey,'Content-Type':'application/json','Cache-Control':'no-store'},
          body:JSON.stringify({messageText})
        });
        return res.status(200).json(await readJsonResponse(r));
      }
    }

    if(provider==='kindroid'){
      if(!companionId) return res.status(400).json({error:'Missing Kindroid AI ID'});
      if(action==='validate'){
        const r=await fetch(`${KINDROID}/get-chat-messages?ai_id=${encodeURIComponent(companionId)}&limit=1`,{
          headers:{Authorization:`Bearer ${apiKey}`,'Cache-Control':'no-store'}
        });
        return res.status(200).json(await readJsonResponse(r));
      }
      if(action==='send'){
        const r=await fetch(`${KINDROID}/send-message`,{
          method:'POST',
          headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Cache-Control':'no-store'},
          body:JSON.stringify({ai_id:companionId,message:messageText,stream:false})
        });
        const text=await r.text();
        if(!r.ok) throw new Error(text||`Kindroid HTTP ${r.status}`);
        let data;
        try{ data=JSON.parse(text); }catch{ data={reply:text,raw:text}; }
        if(typeof data==='string') data={reply:data};
        if(!data.reply) data.reply=data.response||data.message||data.text||data.raw||'';
        return res.status(200).json(data);
      }
    }

    return res.status(400).json({error:'Unsupported provider/action'});
  }catch(err){
    return res.status(502).json({error:err?.message||String(err)});
  }
}
