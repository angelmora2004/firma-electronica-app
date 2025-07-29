import * as pdfjsLib from 'pdfjs-dist';

// Configuración del worker de PDF.js usando archivo local
// El worker está copiado en public/pdf.worker.min.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

console.log('PDF.js configurado con worker local:', pdfjsLib.GlobalWorkerOptions.workerSrc);

export { pdfjsLib }; 