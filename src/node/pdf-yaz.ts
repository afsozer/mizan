import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import pdfmake from 'pdfmake';

const require = createRequire(import.meta.url);
const FONT_DIZINI = dirname(require.resolve('pdfmake/fonts/Roboto.js'));

export async function pdfYaz(tanim: Record<string, unknown>, yol: string): Promise<void> {
  pdfmake.setFonts({
    Roboto: {
      normal: `${FONT_DIZINI}/Roboto/Roboto-Regular.ttf`,
      bold: `${FONT_DIZINI}/Roboto/Roboto-Medium.ttf`,
      italics: `${FONT_DIZINI}/Roboto/Roboto-Italic.ttf`,
      bolditalics: `${FONT_DIZINI}/Roboto/Roboto-MediumItalic.ttf`,
    },
  });
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy((p: string) => p.startsWith(FONT_DIZINI));
  await pdfmake.createPdf(tanim).write(yol);
}
