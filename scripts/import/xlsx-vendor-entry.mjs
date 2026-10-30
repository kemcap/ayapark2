// Reproducible adapter to pinned read-excel-file internals. No nested/blob workers.
import {unzipSync} from 'fflate';
import parseSpreadsheetContents from '../../node_modules/read-excel-file/modules/xlsx/parseSpreadsheetContents.js';
import parseXml from '../../node_modules/read-excel-file/modules/xml/parseXml.js';
export {unzipSync};
export async function readWorkbook(contents){
 return parseSpreadsheetContents(undefined,parseXml,contents,{parseNumber:value=>({xlsxNumber:value})});
}
