import fs from 'fs/promises';
import path from 'path';

const OUT = path.resolve('output');
await fs.mkdir(OUT, { recursive: true });

export async function writeOutputs({ books, errors, report }) {
  await fs.writeFile(path.join(OUT, 'books.json'), JSON.stringify(books, null, 2), 'utf8');
  await fs.writeFile(path.join(OUT, 'errors.json'), JSON.stringify(errors, null, 2), 'utf8');
  await fs.writeFile(path.join(OUT, 'run-report.json'), JSON.stringify(report, null, 2), 'utf8');
}
