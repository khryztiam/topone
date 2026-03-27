/**
 * POST /api/admin/import-employees
 * Recibe un archivo .xlsx con columnas: SAPID, NOMBRE, LINEA, COD_LINEA, GRUPO
 * Realiza upsert por SAPID. Opción: desactivar empleados que no aparecen en el archivo.
 *
 * multipart/form-data:
 *   file          → .xlsx file
 *   deactivate_missing → 'true' | 'false'
 */
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import supabaseAdmin from '@/lib/supabaseAdmin';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const STORAGE_BUCKET = 'avatares';
const STORAGE_FOLDER = 'santa_ana';

function buildPhotoUrl(sapid) {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${STORAGE_FOLDER}/${sapid}.jpeg`;
}

// Sanitize a string cell value
function cellStr(cell) {
  if (cell === null || cell === undefined) return '';
  const v = cell?.result ?? cell?.value ?? cell;
  return String(v).trim();
}

function cellInt(cell) {
  const v = cell?.result ?? cell?.value ?? cell;
  return parseInt(String(v).trim(), 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Parse multipart form
  const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 }); // 10 MB max
  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (e) {
    return res.status(400).json({ error: 'Error al parsear el archivo: ' + e.message });
  }

  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!uploadedFile) return res.status(400).json({ error: 'No se recibió archivo.' });

  const ext = path.extname(uploadedFile.originalFilename || '').toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls') {
    fs.unlinkSync(uploadedFile.filepath);
    return res.status(400).json({ error: 'Solo se aceptan archivos .xlsx o .xls' });
  }

  const deactivateMissing =
    (Array.isArray(fields.deactivate_missing)
      ? fields.deactivate_missing[0]
      : fields.deactivate_missing) === 'true';

  // Read workbook
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(uploadedFile.filepath);
  } catch (e) {
    fs.unlinkSync(uploadedFile.filepath);
    return res.status(400).json({ error: 'No se pudo leer el archivo Excel: ' + e.message });
  }
  fs.unlinkSync(uploadedFile.filepath);

  // Use first sheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return res.status(400).json({ error: 'El archivo no tiene hojas de trabajo.' });
  }

  // Detect header row — look for a row containing "SAPID" or "sapid"
  let headerRowIdx = null;
  let colMap = {}; // { sapid, nombre, linea, cod_linea, grupo } → 1-based column index

  worksheet.eachRow({ includeEmpty: false }, (row, rowIdx) => {
    if (headerRowIdx !== null) return; // already found
    const vals = [];
    row.eachCell({ includeEmpty: true }, (cell) => vals.push(cellStr(cell).toLowerCase()));

    const sapidCol = vals.findIndex((v) => v === 'sapid' || v === 'sap id' || v === 'id sap');
    if (sapidCol >= 0) {
      headerRowIdx = rowIdx;
      colMap.sapid = sapidCol + 1;
      vals.forEach((v, i) => {
        if (v.includes('nombre') || v === 'name') colMap.nombre = i + 1;
        else if (v.includes('cod') && v.includes('linea')) colMap.cod_linea = i + 1;
        else if (v.includes('linea') || v.includes('línea')) colMap.linea = i + 1;
        else if (v === 'grupo' || v === 'group') colMap.grupo = i + 1;
      });
    }
  });

  if (headerRowIdx === null || !colMap.sapid) {
    return res.status(400).json({
      error: 'No se encontró columna SAPID en el archivo. Verifique que la hoja tenga los encabezados correctos (SAPID, NOMBRE, LINEA, COD_LINEA, GRUPO).',
    });
  }

  const records = [];
  const errors = [];
  const seenSapids = new Set();

  worksheet.eachRow({ includeEmpty: false }, (row, rowIdx) => {
    if (rowIdx <= headerRowIdx) return;

    const sapid = cellStr(row.getCell(colMap.sapid));
    if (!sapid) return; // skip empty rows

    const nombre = colMap.nombre ? cellStr(row.getCell(colMap.nombre)) : '';
    const linea = colMap.linea ? cellStr(row.getCell(colMap.linea)) : '';
    const cod_linea = colMap.cod_linea ? cellInt(row.getCell(colMap.cod_linea)) : NaN;
    const grupo = colMap.grupo ? cellInt(row.getCell(colMap.grupo)) : 1;

    if (!nombre) { errors.push(`Fila ${rowIdx}: SAPID ${sapid} sin nombre, omitida.`); return; }
    if (isNaN(cod_linea)) { errors.push(`Fila ${rowIdx}: SAPID ${sapid} sin COD_LINEA válido, omitida.`); return; }
    if (seenSapids.has(sapid)) { errors.push(`Fila ${rowIdx}: SAPID ${sapid} duplicado, omitida.`); return; }

    seenSapids.add(sapid);
    records.push({
      sapid,
      nombre: nombre.toUpperCase(),
      linea: linea.toUpperCase() || `LINEA ${cod_linea}`,
      cod_linea,
      grupo: isNaN(grupo) ? 1 : grupo,
      photo_url: buildPhotoUrl(sapid),
      active: true,
    });
  });

  if (records.length === 0) {
    return res.status(400).json({
      error: 'No se encontraron registros válidos en el archivo.',
      warnings: errors,
    });
  }

  // Upsert employees
  const { error: upsertErr } = await supabaseAdmin
    .from('employees_master')
    .upsert(records, { onConflict: 'sapid' });

  if (upsertErr) return res.status(500).json({ error: upsertErr.message });

  // Optionally deactivate employees missing from the file
  let deactivated = 0;
  if (deactivateMissing) {
    const { data: existing } = await supabaseAdmin
      .from('employees_master')
      .select('sapid')
      .eq('active', true);

    const toDeactivate = (existing || [])
      .map((e) => e.sapid)
      .filter((s) => !seenSapids.has(s));

    if (toDeactivate.length > 0) {
      await supabaseAdmin
        .from('employees_master')
        .update({ active: false })
        .in('sapid', toDeactivate);
      deactivated = toDeactivate.length;
    }
  }

  return res.status(200).json({
    success: true,
    imported: records.length,
    deactivated,
    warnings: errors,
  });
}
