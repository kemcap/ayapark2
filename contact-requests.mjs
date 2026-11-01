import {uiText} from './language-text.mjs?v=5.10.0';
import {escapeHtml as e,randomId} from './core.mjs?v=perf1';
import {getLanguage} from './i18n.mjs?v=5.10.0';
const text=(de,tr)=>(getLanguage()==='tr'?(tr):(uiText(de,getLanguage())));
export function contactPanel(s){
 if(s.mode!=='connected'||!s.data.contactWorkspace)return '';
 const w=s.data.contactWorkspace,persons=w.persons||[],requests=w.requests||[],admin=s.data.capabilities?.admin===true;
 const status={pending:text('Prüfung ausstehend','İnceleme bekliyor'),approved:text('Genehmigt','Onaylandı'),rejected:text('Abgelehnt','Reddedildi'),withdrawn:text('Zurückgezogen','Geri çekildi')};
 return `<section class="card"><h2>${text('Kontaktdaten und Änderungsanträge','İletişim bilgileri ve değişiklik talepleri')}</h2><p>${text('Änderungen am Personenverzeichnis werden vor der Übernahme geprüft. Ihre Anmeldung und Ihr Passwort bleiben unverändert.','Kişi rehberindeki değişiklikler uygulanmadan önce incelenir. Giriş bilgileriniz ve şifreniz değişmez.')}</p>${persons.map(p=>{const pending=requests.some(r=>r.person_id===p.id&&r.status==='pending');return `<article><h3>${e(p.full_name)}</h3><p>${e(p.email||'—')} · ${e(p.phone||'—')}</p>${pending?'':`<form data-contact-request><input type="hidden" name="person_id" value="${e(p.id)}"><input type="hidden" name="request_id" value="${e(randomId())}"><label class="field">${text('Gewünschte E-Mail','İstenen e-posta')}<input type="email" name="email" maxlength="254" value="${e(p.email||'')}"></label><label class="field">${text('Gewünschte Telefonnummer','İstenen telefon')}<input type="tel" name="phone" maxlength="32" value="${e(p.phone||'')}"></label><label class="check-field"><input type="checkbox" name="confirmed" required>${text('Diese Kontaktdaten sollen nach Prüfung übernommen werden. Leere Felder löschen den bisherigen Wert.','Bu iletişim bilgileri incelemeden sonra uygulansın. Boş alanlar eski değeri siler.')}</label><button type="submit" class="button">${text('Änderung beantragen','Değişiklik talep et')}</button><p role="status" data-contact-status></p></form>`}</article>`;}).join('')}${requests.map(r=>`<article class="card"><h3>${e(r.full_name||'')}</h3><p>${e(status[r.status]||r.status)}</p><dl><dt>${text('Bisher','Önceki')}</dt><dd>${e(r.previous_email||'—')} · ${e(r.previous_phone||'—')}</dd><dt>${text('Beantragt','Talep edilen')}</dt><dd>${e(r.new_email||'—')} · ${e(r.new_phone||'—')}</dd></dl>${r.decision_reason?`<p>${e(r.decision_reason)}</p>`:''}${r.status==='pending'?(admin?`<form data-contact-review data-id="${e(r.id)}"><label class="field">${text('Prüfvermerk oder Ablehnungsgrund','İnceleme notu veya ret gerekçesi')}<textarea name="reason" required minlength="10" maxlength="300"></textarea></label><label class="check-field"><input type="checkbox" name="verified">${text('Identität und gewünschte Kontaktdaten unabhängig geprüft','Kimlik ve istenen iletişim bilgileri bağımsız olarak doğrulandı')}</label><button type="submit" name="decision" value="approve" class="button">${text('Genehmigen und übernehmen','Onayla ve uygula')}</button><button type="submit" name="decision" value="reject" class="button">${text('Ablehnen','Reddet')}</button><p role="status" data-contact-status></p></form>`:r.requested_by===s.data.userId?`<button type="button" class="button" data-contact-withdraw="${e(r.id)}">${text('Antrag zurückziehen','Talebi geri çek')}</button>`:''):''}</article>`).join('')}</section>`;
}

export function contactError(message){
 const labels={
 'Request unavailable':['Der Antrag ist nicht mehr verfügbar. Bitte aktualisieren Sie die Ansicht.','Talep artık kullanılamıyor. Lütfen görünümü yenileyin.'],
 'Decision conflict':['Der Antrag wurde bereits anders entschieden.','Talep hakkında daha önce farklı bir karar verildi.'],
 'Request conflict':['Diese Anfrage wurde bereits mit anderen Angaben gespeichert.','Bu talep daha önce farklı bilgilerle kaydedildi.'],
 'Invalid contact data':['Bitte prüfen Sie E-Mail und Telefonnummer.','Lütfen e-posta ve telefon numarasını kontrol edin.'],
 'No contact change':['Die Kontaktdaten sind unverändert.','İletişim bilgileri değişmedi.'],
 'A contact change is already pending':['Für diese Person wartet bereits ein Antrag auf Prüfung.','Bu kişi için inceleme bekleyen bir talep var.'],
 'Contact changed: submit a new request':['Die bisherigen Kontaktdaten haben sich geändert. Bitte lehnen Sie den alten Antrag ab und lassen Sie einen neuen einreichen.','Önceki iletişim bilgileri değişti. Eski talebi reddedin ve yeni bir talep oluşturulmasını sağlayın.'],
 'Verification and reason required':['Bitte bestätigen und begründen Sie die Prüfung.','Lütfen doğrulamayı onaylayın ve gerekçe yazın.'],
 'Access denied':['Für diese Aktion fehlt die Berechtigung.','Bu işlem için yetkiniz yok.'],
 'Contact changes require Superadmin approval':['Kontaktänderungen benötigen eine Superadmin-Freigabe.','İletişim değişiklikleri Süper Admin onayı gerektirir.']
 };
 const found=Object.entries(labels).find(([key])=>String(message).includes(key));return found?getLanguage()==='tr'?found[1][1]:uiText(found[1][0],getLanguage()):String(message);
}
