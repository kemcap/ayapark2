import {remaining,paid} from './ledger.mjs?v=20261105-owner-transfer';

/**
 * Derived financial indicators for the already-authorized list of charges.
 * Historical/former-resident records must be separated by the caller.
 * Amounts remain integer cents; voided records are never counted.
 */
export function duesOverview(data, charges) {
 const totals={outstanding:0,open:0,partial:0,settled:0,recorded:0};
 for(const charge of charges){
  if(charge.void_reason)continue;
  totals.recorded++;
  const due=Math.max(0,remaining(data,charge));
  const received=Math.max(0,paid(data,charge.id));
  if(due>0){
   totals.outstanding+=due;
   totals.open++;
   if(received>0)totals.partial++;
  }else totals.settled++;
 }
 return totals;
}
