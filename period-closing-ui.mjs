import {uiText} from './language-text.mjs?v=5.10.0';
import {escapeHtml as e,money,randomId} from './core.mjs?v=5.10.0';

// Each RPC still checks the actual account server-side. No simulated finalization.
export function periodClosings({rpc,allowed,site,language,onSaved=async()=>{}}){
 let dialog,workspace,snapshot,request,busy=false,generation=0;
 const t=(de,tr)=>(language()==='tr'?(tr):(uiText(de,language())));
 const errorText=error=>{
  const messages=[['preview changed','Daten haben sich geändert. Vorschau erneut laden.','Veriler değişti. Önizlemeyi yeniden yükleyin.'],['bank difference','Der Banksaldo stimmt nicht mit dem Buchsaldo überein.','Banka ve kayıt bakiyesi eşleşmiyor.'],['annual unresolved','Für den Jahresabschluss müssen offene Zuordnungen und ungeprüfte Übernahmen erledigt sein.','Yıl kapanışı için eşleşmeler ve devir kontrolleri tamamlanmalıdır.'],['annual months','Zuerst alle zwölf Monate abschließen.','Önce on iki ayı kapatın.'],['period not complete','Der Zeitraum ist noch nicht beendet.','Dönem henüz tamamlanmadı.'],['year first','Zuerst den zugehörigen Jahresabschluss wieder öffnen.','Önce ilgili yıl kapanışını yeniden açın.'],['later first','Zuerst spätere Abschlüsse wieder öffnen.','Önce sonraki dönem kapanışlarını yeniden açın.'],['already closed','Dieser Zeitraum ist bereits abgeschlossen.','Bu dönem zaten kapatılmış.'],['opening required','Für diesen Zeitraum fehlt ein bestätigter Anfangsbestand.','Bu dönem için onaylı açılış bakiyesi gerekli.']];
  const found=messages.find(([key])=>String(error.message).includes(key));return found?t(found[1],found[2]):t('Vorgang fehlgeschlagen. Zugriff und Eingaben prüfen; bei unklarem Ergebnis dieselbe Anfrage erneut senden.','İşlem tamamlanamadı. Yetki ve alanları kontrol edin; sonuç belirsizse aynı isteği yeniden gönderin.');
 };
 const clear=()=>{generation++;snapshot=null;request=null;workspace=null;if(dialog)dialog.textContent='';};
 const close=()=>{if(dialog?.open)dialog.close();clear();};
 const ensure=()=>{if(!allowed())throw Error('Closing access denied');};
 const message=value=>{dialog.querySelector('[role=status]').textContent=value;};
 const scope=()=>({site:site(),generation});
 const valid=token=>dialog?.open&&allowed()&&site()===token.site&&generation===token.generation;
 async function call(name,args,token){ensure();const result=await rpc(name,{p_site:token.site,...args});if(!valid(token))throw Error('Session changed');return result;}
 function history(){return '<h3>'+t('Abschlusshistorie','Kapanış geçmişi')+'</h3>'+((workspace?.rows||[]).map(row=>'<article class="card"><strong>'+e(row.period)+' · '+t(row.kind==='year'?'Jahr':'Monat',row.kind==='year'?'Yıl':'Ay')+'</strong><p>'+e(t(row.status==='closed'?'Abgeschlossen':'Wieder geöffnet',row.status==='closed'?'Kapalı':'Yeniden açıldı'))+' · '+e(money(row.snapshot.closing_cents))+'</p><p>'+e(row.source_reference)+'</p><p>'+e(row.review_note)+'</p>'+(row.reopen_reason?'<p>'+e(row.reopen_reason)+'</p>':'')+(row.status==='closed'?'<form data-closing="reopen"><input type="hidden" name="id" value="'+e(row.id)+'"><label>'+t('Begründung der Wiederöffnung (mindestens 10 Zeichen)','Yeniden açma gerekçesi (en az 10 karakter)')+'<textarea name="reason" required minlength="10" maxlength="500"></textarea></label><button type="submit">'+t('Begründet wieder öffnen','Gerekçeyle yeniden aç')+'</button></form>':'')+'</article>').join('')||'<p>'+t('Noch keine Abschlüsse.','Henüz kapanış yok.')+'</p>');}
 function render(){
  dialog.innerHTML='<div class="dialog-header"><h2>'+t('Monats- und Jahresabschlüsse','Ay ve yıl kapanışları')+'</h2><button type="button" data-close>'+t('Schließen','Kapat')+'</button></div><p>'+t('Nur nach Prüfung des vollständigen Bankauszugs abschließen. Der Abschluss sperrt rückwirkende Buchungen. Eine begründete Wiederöffnung erhält das ursprüngliche Protokoll.','Yalnızca tam banka ekstresi kontrolünden sonra kapatın. Kapanış geçmişe dönük kayıtları kilitler. Gerekçeli yeniden açma ilk tutanağı korur.')+'</p><p>'+t('Ein Jahresabschluss setzt zwölf abgeschlossene Monate, keine offenen Zahlungszuordnungen und keine ungeprüften Übernahmen voraus.','Yıl kapanışı için on iki kapalı ay, tamamlanmış ödeme eşleştirmeleri ve devir kontrolleri gereklidir.')+'</p><form data-closing="preview"><label>'+t('Zeitraum','Dönem')+'<select name="kind"><option value="month">'+t('Monat','Ay')+'</option><option value="year">'+t('Jahr','Yıl')+'</option></select></label><label>'+t('Monat wählen (für Jahr: Januar)','Ay seçin (yıl için: Ocak)')+'<input name="period" type="month" required></label><button type="submit">'+t('Vorschau laden','Önizlemeyi yükle')+'</button></form><div data-preview></div><p role="status" aria-live="polite"></p><div data-history>'+history()+'</div>';
 }
 function previewMarkup(s){return '<h3>'+e(s.period)+' – '+e(s.ends_on)+'</h3><dl class="detail-grid">'+[['Anfangsbestand','Açılış bakiyesi',s.opening_cents],['Einnahmen','Gelir',s.income_cents],['Ausgaben','Gider',s.expense_cents],['Sonstige Bankbewegungen / Gegenbuchungen','Diğer banka hareketleri / ters kayıtlar',s.cash_adjustment_cents],['Buchsaldo zum Periodenende','Dönem sonu kayıt bakiyesi',s.closing_cents]].map(([de,tr,v])=>'<div><dt>'+t(de,tr)+'</dt><dd>'+e(money(v))+'</dd></div>').join('')+'</dl><p>'+t('Offene Zahlungszuordnungen','Açık ödeme eşleştirmeleri')+': '+e(s.unresolved_count)+' · '+t('Ungeprüfte Übernahmen','Kontrol bekleyen devirler')+': '+e(s.unreviewed_staged_count)+'</p><form data-closing="finalize"><label>'+t('Banksaldo am Periodenende (TL, z. B. 1234,56)','Dönem sonu banka bakiyesi (TL, ör. 1234,56)')+'<input name="balance" inputmode="decimal" required pattern="-?[0-9]+([,.][0-9]{1,2})?" maxlength="16"></label><label>'+t('Bankauszug / Quellenreferenz','Banka ekstresi / kaynak referansı')+'<input name="source" required minlength="3" maxlength="200"></label><label>'+t('Prüfvermerk; offene Monatszuordnungen begründen','Kontrol notu; açık aylık eşleştirmeleri açıklayın')+'<textarea name="note" maxlength="500" '+(s.kind==='month'&&s.unresolved_count?'required minlength="10"':'')+'></textarea></label><label><input name="complete" type="checkbox" required> '+t('Ich habe den vollständigen Bankauszug für diesen Zeitraum geprüft.','Bu dönemin tam banka ekstresini kontrol ettim.')+'</label><label><input name="verified" type="checkbox" required> '+t('Ich bestätige den Abgleich von Bank- und Buchsaldo.','Banka ve kayıt bakiyesinin mutabakatını onaylıyorum.')+'</label><button type="submit" '+(!s.period_complete?'disabled':'')+'>'+t('Geprüften Zeitraum abschließen und sperren','Kontrol edilen dönemi kapat ve kilitle')+'</button></form>';}
 async function submit(event){
  const form=event.target.closest('form[data-closing]');if(!form)return;event.preventDefault();if(busy||!form.reportValidity())return;
  busy=true;const token=scope(),data=new FormData(form),mode=form.dataset.closing;dialog.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true);message('');
  try{
   ensure();
   if(mode==='preview'){
    snapshot=null;request=null;dialog.querySelector('[data-preview]').textContent='';
    const result=await call('ay3_closing_preview',{p_kind:data.get('kind'),p_period:data.get('period')+'-01'},token);snapshot=result;request=randomId();dialog.querySelector('[data-preview]').innerHTML=previewMarkup(result);
   }else if(mode==='finalize'){
    if(!snapshot||!request)throw Error('Missing preview');
    const value=String(data.get('balance')).replace(',','.');if(!/^-?\d+(?:\.\d{1,2})?$/.test(value))throw Error('Invalid balance');
    const [whole,fraction='']=value.replace('-','').split('.');const cents=Number(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')))*(value.startsWith('-')?-1:1);if(!Number.isSafeInteger(cents)||Math.abs(cents)>900000000000)throw Error('Invalid balance');
    await call('ay3_finalize_period',{p_kind:snapshot.kind,p_period:snapshot.period,p_request:request,p_fingerprint:snapshot.fingerprint,p_statement_cents:cents,p_source_reference:data.get('source'),p_source_complete:data.get('complete')==='on',p_bank_verified:data.get('verified')==='on',p_note:data.get('note')},token);
    snapshot=null;request=null;dialog.querySelector('[data-preview]').textContent='';await refresh(token);message(t('Abschluss gespeichert. Originalbuchungen bleiben erhalten.','Kapanış kaydedildi. İlk kayıtlar korunur.'));await onSaved();
   }else if(mode==='reopen'){
    await call('ay3_reopen_period',{p_id:data.get('id'),p_reason:data.get('reason')},token);snapshot=null;request=null;dialog.querySelector('[data-preview]').textContent='';await refresh(token);message(t('Wiederöffnung protokolliert.','Yeniden açma kaydedildi.'));await onSaved();
   }
  }catch(error){if(valid(token))message(errorText(error));}
  finally{busy=false;if(valid(token))dialog.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=b.closest('[data-closing=finalize]')&&!snapshot?.period_complete);}
 }
 async function refresh(token){workspace=await call('ay3_closing_workspace',{},token);dialog.querySelector('[data-history]').innerHTML=history();}
 return {
  async open(){
   ensure();if(busy)return;
   if(!dialog){dialog=document.createElement('dialog');dialog.className='detail-dialog';dialog.style.cssText='width:min(94vw,760px);max-height:90vh;overflow:auto';document.body.append(dialog);dialog.addEventListener('submit',submit);dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]'))close();});dialog.addEventListener('close',()=>{if(!dialog.open)clear();});}
   workspace=null;snapshot=null;request=null;generation++;render();if(!dialog.open)dialog.showModal();const token=scope();try{await refresh(token);}catch(error){if(valid(token))message(errorText(error));}
  },
  close
 };
}
