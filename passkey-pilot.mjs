import {ENABLE_PASSKEY_LOGIN} from './auth-features.mjs?v=5.8.1';
// Isolated pilot adapter, deliberately not wired into the production login.
// Supply the pinned official SDK factory from the isolated test host only.
export function createPasskeyPilot({enabled=ENABLE_PASSKEY_LOGIN,stage,origin,allowedOrigins=new Set(),platform=globalThis,createClient,url,key,api,approvedUser}){
 let client=null,busy=false;
 const available=()=>enabled&&stage==='isolated'&&typeof origin==='string'&&origin.startsWith('https://')&&origin!=='https://kemcap.github.io'&&allowedOrigins.has(origin)&&Boolean(platform.PublicKeyCredential&&platform.navigator?.credentials);
 const check=()=>{if(!available())throw Error('passkey_unavailable');if(busy)throw Error('passkey_busy');};
 function sdk(){
  if(!client){
   if(typeof createClient!=='function'||!url||!key)throw Error('passkey_unconfigured');
   client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,experimental:{passkey:true}}});
  }return client;
 }
 return {available,
  async register(){check();const user=approvedUser();if(!user?.id||api.session?.user?.id!==user.id)throw Error('approved_account_required');
   const generation=api.generation;busy=true;
   try{const s=sdk();const token=await api.token();if(api.generation!==generation)throw Error('session_changed');const synced=await s.auth.setSession({access_token:token,refresh_token:api.session.refresh_token});if(synced.error)throw synced.error;
    if(synced.data?.user?.id!==user.id||synced.data?.session?.user?.id!==user.id||api.generation!==generation)throw Error('session_changed');
    api.accept(synced.data.session,generation); // keep any refresh-token rotation in the sole session owner
    const {data,error}=await s.auth.registerPasskey();if(error)throw error;
    if(api.generation!==generation||approvedUser()?.id!==user.id)throw Error('session_changed');return data;
   }finally{busy=false;client=null;}
  },
  async login(){check();const generation=api.generation;busy=true;
   try{const {data,error}=await sdk().auth.signInWithPasskey();if(error)throw error;
    if(!data?.session?.access_token||!data?.session?.refresh_token||!data.user?.id||data.session.user?.id!==data.user.id)throw Error('invalid_session');
    // Verify with Auth before handing off; existing API remains the sole session owner.
    const verified=await api.raw('/auth/v1/user','GET',undefined,data.session.access_token);if(verified?.id!==data.user.id)throw Error('invalid_session');
    api.accept(data.session,generation);return verified;
   }finally{busy=false;client=null;}
  }
 };
}
