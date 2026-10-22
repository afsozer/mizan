// pdfmake 0.3 sunucu tarafı için kullanılan kadarı.
declare module 'pdfmake' {
  interface CiktiBelgesi {
    write(yol: string): Promise<void>;
    getBuffer(): Promise<Buffer>;
  }
  interface PdfMake {
    setFonts(fontlar: Record<string, Record<string, string>>): void;
    setUrlAccessPolicy(izin: (url: string) => boolean): void;
    setLocalAccessPolicy(izin: (yol: string) => boolean): void;
    createPdf(tanim: Record<string, unknown>): CiktiBelgesi;
  }
  const pdfmake: PdfMake;
  export default pdfmake;
}
