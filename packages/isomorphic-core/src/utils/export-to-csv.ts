export function exportToCSV(data: any[], header: string, fileName: string) {
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    `${header}\n` +
    data
      .map((row) => {
        if (typeof row === 'object' && row !== null) {
          return flattenObject(row).map(sanitizeCsvValue).join(',');
        }
        return ''; // Return an empty string if row is not an object
      })
      .join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName + '.csv');
  document.body.appendChild(link);
  link.click();
}

/**
 * Escapes a single CSV cell:
 * - Neutralizes spreadsheet formula injection: values starting with =, +, -, @,
 *   tab, or CR are prefixed with a single quote so Excel/Sheets treat them as
 *   text rather than executing them (values here can be user-controlled).
 * - Quotes values containing a comma, double-quote, or newline (RFC 4180),
 *   escaping embedded quotes by doubling them.
 */
export function sanitizeCsvValue(value: unknown): string {
  let str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
  return str;
}

function flattenObject(obj: any): string[] {
  const values: string[] = [];

  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const childValues = flattenObject(obj[key]);
      if (childValues.length > 0) {
        values.push(childValues.join(' '));
      }
    } else {
      values.push(obj[key]);
    }
  }

  return values;
}
