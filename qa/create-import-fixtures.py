from pathlib import Path
import sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from openpyxl import Workbook
from datetime import date
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('QADejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
c=canvas.Canvas(str(out/'synthetic-bank.pdf'),pagesize=(650,840))
for day,description,amount,balance in [('02/10/2026','Synthetic receipt','100,00','100,00'),('01/10/2026','Synthetic fee','-2,50','0,00')]:
 c.setFont('QADejaVu',8)
 for x,text in [(28,'Tarih'),(100,'Saat'),(276,'Açıklama'),(451,'İşlem Tutarı'),(542,'Bakiye')]:c.drawString(x,780,text)
 for x,text in [(28,day),(100,'10:00:00'),(142,'Diğer'),(276,description),(438,amount+' TL'),(530,balance+' TL')]:c.drawString(x,740,text)
 c.showPage()
c.save()
c=canvas.Canvas(str(out/'image-only.pdf'));c.rect(20,20,100,100);c.save()
header=['date','reference','counterparty','description','income','expense','unit','iban','balance']
for name,multi,formula in [('synthetic-bank.xlsx',False,False),('multiple-sheets.xlsx',True,False),('formula.xlsx',False,True)]:
 w=Workbook();s=w.active;s.title='First';s.append(header);s.append([date(2026,10,1),'QA-1','','Synthetic receipt',100,None,'A-1','',1100]);s.append([date(2026,10,2),'QA-2','','Synthetic fee',None,2.50,'','',1097.50])
 if formula:s['E2']='=100+1'
 if multi:t=w.create_sheet('Second');t.append(header);t.append([date(2026,10,3),'QA-3','','Second sheet',50,None,'A-1','',50])
 w.save(out/name)
print('Created synthetic PDF/XLSX fixtures')
