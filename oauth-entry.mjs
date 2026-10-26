// OAuth is only offered when Supabase Auth reports an enabled provider.
// Browser redirects never receive service-role credentials.
export const SUPABASE_AUTH_ORIGIN = 'https://eisozwhhinqszfikemot.supabase.co';

export function enabledOAuthProviders(settings) {
 const external=settings?.external||{};
 return Object.freeze({google:external.google===true,apple:external.apple===true});
}

export function oauthAuthorizeUrl(provider,redirectTo,enabled=enabledOAuthProviders({})) {
 if(!['google','apple'].includes(provider)||enabled[provider]!==true)throw Error('OAuth provider is not enabled');
 const redirect=new URL(redirectTo);
 // This project uses the public GitHub Pages client, not a callback on an untrusted origin.
 if(redirect.href!=='https://kemcap.github.io/ayapark2/')throw Error('OAuth callback is not allowlisted');
 const url=new URL('/auth/v1/authorize',SUPABASE_AUTH_ORIGIN);
 url.searchParams.set('provider',provider);
 url.searchParams.set('redirect_to',redirect.href);
 return url.href;
}
