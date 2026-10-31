export const MAX_DOCUMENT_BYTES=10485760;
export async function documentSha256(bytes){if(!(bytes instanceof Uint8Array)||!globalThis.crypto?.subtle)throw Error('Secure document hashing unavailable');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
const types={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
export function archivePath(path){if(typeof path!=='string'||! /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\/source\.(?:pdf|jpe?g|png|webp|txt|docx|xlsx)$/.test(path))throw Error('Invalid archive path');return path;}
export function documentMime(filename){if(typeof filename!=='string'||filename.length<3||filename.length>200||/[\x00-\x1f\x7f/\\]/.test(filename))throw Error('Invalid document filename');const extension=filename.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();if(!types[extension])throw Error('Unsupported document type');return {extension,mime:types[extension]};}
export function documentSignature(bytes,extension){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MAX_DOCUMENT_BYTES)throw Error('Invalid document size');
 const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));let valid=false;
 if(extension==='pdf')valid=ascii(0,Math.min(1024,bytes.length)).includes('%PDF-');
 if(extension==='png')valid=[137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x);
 if(['jpg','jpeg'].includes(extension))valid=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(extension==='webp')valid=ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
 if(['docx','xlsx'].includes(extension))valid=bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
 if(extension==='txt'){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);valid=!bytes.includes(0);}catch{valid=false;}}
 if(!valid)throw Error('Document content does not match filename');return true;
}
export async function inspectDocument(file){const type=documentMime(file?.name);if(!Number.isInteger(file.size)||file.size<1||file.size>MAX_DOCUMENT_BYTES)throw Error('Invalid document size');const bytes=new Uint8Array(await file.arrayBuffer());documentSignature(bytes,type.extension);return {filename:file.name,mime:type.mime,bytes,sha256:await documentSha256(bytes)};}
export async function verifiedDocument(meta,bytes){const type=documentMime(meta.filename);if(!(bytes instanceof Uint8Array)||meta.mime!==type.mime||bytes.byteLength!==meta.bytes||await documentSha256(bytes)!==meta.sha256)throw Error('Document integrity mismatch');documentSignature(bytes,type.extension);return new Blob([bytes],{type:meta.mime});}
export async function downloadOriginal(meta,bytes){const blob=await verifiedDocument(meta,bytes),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=meta.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
