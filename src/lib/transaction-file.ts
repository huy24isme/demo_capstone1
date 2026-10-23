export async function readTransactionFile(file: Pick<File, 'name' | 'size' | 'text' | 'arrayBuffer'>) {
  if (file.size > 5 * 1024 * 1024) throw Error('File vượt quá 5 MB.');
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    if (!/\.(csv|json)$/i.test(file.name)) throw Error('Chọn file CSV, JSON hoặc Excel (.xlsx).');
    return { text: await file.text(), name: file.name, displayName: file.name };
  }
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheets = workbook.worksheets.filter(sheet => sheet.actualRowCount > 0);
  if (sheets.length !== 1) throw Error('File Excel cần một trang tính có dữ liệu. Tách trang cần nhập thành một file riêng.');
  const sheet = sheets[0];
  if (sheet.rowCount > 1001 || sheet.columnCount > 100) throw Error('Tối đa 1.000 giao dịch và 100 cột.');
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, cell => {
    if (typeof cell.value !== 'string' || !cell.value.trim()) throw Error('Dòng đầu phải chứa tên cột, không để trống.');
    headers.push(cell.value.trim());
  });
  if (!headers.length || new Set(headers).size !== headers.length || headers.length !== sheet.columnCount) throw Error('Tên cột bị thiếu hoặc trùng.');
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const result: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      const value = row.getCell(i + 1).value;
      if (value == null) return;
      if (value instanceof Date) result[header] = value.toISOString();
      else if (['string', 'number', 'boolean'].includes(typeof value)) result[header] = value;
      else throw Error('Ô ' + row.getCell(i + 1).address + ': chỉ dùng giá trị, không dùng công thức hoặc đối tượng.');
    });
    if (Object.keys(result).length) rows.push(result);
  });
  if (!rows.length) throw Error('File không có giao dịch.');
  return { text: JSON.stringify(rows), name: file.name + '.json', displayName: file.name };
}
