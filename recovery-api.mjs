import {AyaparkApi} from './api.mjs?v=5.9.45';

// Recovery sessions stay in memory. This client never reads apartment or finance data.
export class RecoveryApi extends AyaparkApi {
 constructor(fetcher,options={}){super(fetcher,{...options,persist:false});}
 clear(){super.clear();this.recovery=false;}
 async requestReset(email,redirectTo){
  const target=new URL(redirectTo);
  if(target.protocol!=='https:')throw Error('Invalid recovery URL');
  await this.raw('/auth/v1/recover?redirect_to='+encodeURIComponent(target.href),'POST',{email});
 }
 async begin({accessToken,refreshToken,tokenHash,type}){
  this.clear();const generation=this.generation;
  if(type!=='recovery')throw Error('Invalid recovery link');
  let session;
  if(tokenHash){session=await this.raw('/auth/v1/verify','POST',{token_hash:tokenHash,type:'recovery'});}
  else if(accessToken&&refreshToken){
   const user=await this.raw('/auth/v1/user','GET',undefined,accessToken);
   session={access_token:accessToken,refresh_token:refreshToken,expires_in:3600,user};
  }else throw Error('Invalid recovery link');
  this.accept(session,generation);
  this.recovery=true;
  return session.user;
 }
 async beginWithEmailCode(email,code){
  this.clear();
  const generation=this.generation;
  if(!email||!/^[0-9]{6,10}$/.test(String(code)))throw Error('Invalid recovery verification code');
  const session=await this.raw('/auth/v1/verify','POST',{email,token:String(code),type:'recovery'});
  this.accept(session,generation);this.recovery=true;
  return session.user;
 }
 async savePassword(password){
  if(!this.recovery)throw Error('No verified recovery session');
  const generation=this.generation;
  await this.setPassword(password);
  if(this.generation!==generation)throw Error('Session changed');
  this.recovery=false;
  await this.logout().catch(()=>this.clear());
 }
}

export function takeRecoveryLocation(location,history){
 const hash=new URLSearchParams(location.hash.replace(/^#/,''));
 const query=new URLSearchParams(location.search);
 const payload={accessToken:hash.get('access_token'),refreshToken:hash.get('refresh_token'),tokenHash:hash.get('token_hash')||query.get('token_hash'),type:hash.get('type')||query.get('type')};
 const error=hash.has('error')||query.has('error')||hash.has('error_code')||query.has('error_code');
 const present=error||payload.type==='recovery'||!!(payload.accessToken||payload.refreshToken||payload.tokenHash||query.has('code'));
 // Remove credentials even when the link is invalid, before any network call or render.
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 return {payload,error,present};
}
