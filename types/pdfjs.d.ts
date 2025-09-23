declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: any };
  export function getDocument(data: any): any;
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  const worker: any;
  export = worker;
}

