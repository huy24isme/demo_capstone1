export interface DataField { name: string; type: 'string' | 'number' | 'boolean'; required: boolean }
export function validateDataSchema(schema: DataField[]) {
  const names = new Set<string>();
  for (const field of schema) {
    if (!/^[a-zA-Z_][\w.]*$/.test(field.name) || names.has(field.name) || !['string', 'number', 'boolean'].includes(field.type) || typeof field.required !== 'boolean') throw Error('Tên trường phải hợp lệ, không trùng và có kiểu dữ liệu.');
    names.add(field.name);
  }
}
export function normalizeFields(fields: Record<string, unknown>, schema: DataField[], coerce = false) {
  validateDataSchema(schema);
  const normalized = { ...fields };
  for (const field of schema) {
    let value = normalized[field.name];
    if (value === undefined || value === null || value === '') {
      if (field.required) throw Error('Thiếu trường bắt buộc: ' + field.name);
      delete normalized[field.name]; continue;
    }
    if (coerce && typeof value === 'string') {
      const text = value.trim();
      if (field.type === 'number' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) value = Number(text);
      if (field.type === 'boolean' && ['true', 'false'].includes(text)) value = text === 'true';
    }
    if (typeof value !== field.type || typeof value === 'number' && !Number.isFinite(value)) throw Error('Sai kiểu dữ liệu: ' + field.name + ' (' + field.type + ')');
    normalized[field.name] = value;
  }
  return normalized;
}

export function parseIngestionRows(text: string, filename: string): Record<string, unknown>[] {
  let rows: Record<string, unknown>[];
  if (filename.toLowerCase().endsWith('.json')) rows = JSON.parse(text);
  else if (filename.toLowerCase().endsWith('.csv')) {
    const records: string[][] = []; let row: string[] = [], cell = '', quoted = false;
    const input = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (!quoted && c === ',') { row.push(cell); cell = ''; }
      else if (!quoted && (c === '\n' || c === '\r')) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(cell); if (row.some(v => v.trim())) records.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (quoted) throw new Error('Unclosed CSV quote');
    row.push(cell); if (row.some(v => v.trim())) records.push(row);
    const header = records.shift()?.map(v => v.trim());
    if (!header || new Set(header).size !== header.length) throw new Error('Missing or duplicate CSV headers');
    rows = records.map(values => { if (values.length !== header.length) throw new Error('CSV column count mismatch'); return Object.fromEntries(header.map((key, i) => [key, values[i]])); });
  } else throw new Error('CSV/JSON only. Export Excel to CSV first.');
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw new Error('Expected 1–10000 transaction rows');
  return rows;
}

export function validateIngestion(text: string, filename: string): number {
  const rows = parseIngestionRows(text, filename);
  rows.forEach((row, index) => {
    if (!row || ['timestamp', 'amount', 'currency', 'transaction_type', 'user_hash'].some(key => row[key] == null || String(row[key]).trim() === '')) throw new Error('Missing required field at row ' + (index + 1));
    if (!Number.isFinite(Date.parse(String(row.timestamp))) || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0 || typeof row.amount === 'boolean') throw new Error('Invalid timestamp or amount at row ' + (index + 1));
    if (!/^[A-Z]{3}$/.test(String(row.currency))) throw new Error('Invalid currency at row ' + (index + 1));
  });
  return rows.length;
}
