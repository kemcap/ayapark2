"""Extract Yapı Kredi text rows and validate every running balance before import.
Usage: python v2/tools/prepare_bank.py statement.pdf --output .private/bank.json
Never put the generated JSON or source statement in the public repository.
"""
import argparse, hashlib, json, re, subprocess
from datetime import datetime
from decimal import Decimal
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('pdf');p.add_argument('--output',required=True);a=p.parse_args()
source=Path(a.pdf)
text=subprocess.check_output(['pdftotext','-layout',str(source),'-'],text=True)
pattern=re.compile(r'^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(-?[\d,]+\.\d{2})\s+(\d+)\s*$')
to_cents=lambda n:int(Decimal(n.replace(',',''))*100)
balance=0;entries=[]
for line in text.splitlines():
 if not re.match(r'^\d{2}\.\d{2}\.\d{4}',line):continue
 m=pattern.match(line)
 if not m:
  if any(x in line for x in ['GÜNSONU','KAPANIŞ','AÇILIŞ']):continue
  raise ValueError('Unparsed dated row; manual review required.')
 day,value,desc,amount,clock,closing,reference=m.groups()
 amount=to_cents(amount);balance+=amount
 if balance!=to_cents(closing):raise ValueError(f'Running balance mismatch at row {len(entries)+1}.')
 desc=re.sub(r'(?i)tckn\s*:?\s*\d{11}','TCKN [çıkarıldı]',desc)
 desc=re.sub(r'(?i)TR\d{24}','IBAN [çıkarıldı]',desc)
 folded=desc.casefold()
 category='Banka masrafı' if any(k in folded for k in ['ücreti','ücretı','bsmv']) else 'Tahsilat' if amount>0 else 'Havuz' if 'havuz' in folded else 'Elektrik' if 'elektrik' in folded else 'Temizlik' if 'temizlik' in folded else 'Peyzaj' if any(k in folded for k in ['bahçe','peyzaj','bahçıvan']) else 'Diğer'
 entries.append({'date':datetime.strptime(day,'%d.%m.%Y').date().isoformat(),'desc':desc,'cents':amount,'balance_cents':balance,'reference':reference,'category':category})
if not entries:raise ValueError('No transactions found.')
result={'source':source.name,'digest':hashlib.sha256(source.read_bytes()).hexdigest(),'entries':entries}
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False))
print(json.dumps({'rows':len(entries),'opening_cents':0,'closing_cents':balance,'first':entries[0]['date'],'last':entries[-1]['date'],'all_running_balances_valid':True}))
