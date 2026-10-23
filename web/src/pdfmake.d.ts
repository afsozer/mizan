declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    createPdf(definition: Record<string, unknown>): { download(name: string): Promise<void>; getBlob(): Promise<Blob> };
  };
  export default pdfMake;
}
declare module 'pdfmake/build/vfs_fonts.js' {
  const vfs: Record<string, string>;
  export default vfs;
}
