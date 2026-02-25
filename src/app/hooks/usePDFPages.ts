import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Usa o worker local empacotado pelo Vite (sem depender de CDN externa).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PDFPageImage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

const getRenderScale = () => {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(1.75, Math.max(1.15, dpr * 1.1));
};

export function usePDFPages(pdfUrl: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const generationRef = useRef(0);

  const cleanupCurrentPdf = useCallback(async () => {
    const current = pdfRef.current;
    pdfRef.current = null;
    if (!current) return;
    try {
      await current.destroy();
    } catch {
      // Ignore cleanup failures.
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    const currentGeneration = ++generationRef.current;

    const loadPdfDocument = async () => {
      await cleanupCurrentPdf();

      if (!pdfUrl) {
        setError(null);
        setTotalPages(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setTotalPages(0);

        loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;

        if (!isMounted || generationRef.current !== currentGeneration) {
          await pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        if (!isMounted || generationRef.current !== currentGeneration) return;
        setError('Falha ao abrir o PDF. Verifique se o arquivo está válido.');
        setLoading(false);
      }
    };

    void loadPdfDocument();

    return () => {
      isMounted = false;
      generationRef.current++;
      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [pdfUrl, cleanupCurrentPdf]);

  const renderPage = useCallback(async (pageNumber: number): Promise<PDFPageImage> => {
    const pdf = pdfRef.current;
    if (!pdf) {
      throw new Error('Documento PDF ainda não foi carregado.');
    }
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Página inválida: ${pageNumber}`);
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: getRenderScale() });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      throw new Error('Canvas context não disponível');
    }

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    await page.render({
      canvasContext: context,
      viewport,
      intent: 'display',
    }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Falha ao gerar imagem da página'))),
        'image/jpeg',
        0.86
      );
    });

    const imageUrl = URL.createObjectURL(blob);
    canvas.width = 0;
    canvas.height = 0;

    return {
      pageNumber,
      imageUrl,
      width: viewport.width,
      height: viewport.height,
    };
  }, []);

  return { loading, error, totalPages, renderPage };
}
