import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js para usar o arquivo local do pacote
// O Vite automaticamente incluirá este arquivo no bundle
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

export function usePDFPages(pdfUrl: string) {
  const [pages, setPages] = useState<PDFPageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadPDF = async () => {
      // Não carregar se URL estiver vazia
      if (!pdfUrl) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Carregar o documento PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        const numPages = pdf.numPages;
        setTotalPages(numPages);

        // Renderizar todas as páginas como imagens
        const pagePromises: Promise<PDFPageImage>[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          pagePromises.push(
            (async () => {
              const page = await pdf.getPage(pageNum);
              
              // Escala para alta resolução (ajuste conforme necessário)
              // Scale 2 = 2x resolução para telas retina
              const scale = 2.5;
              const viewport = page.getViewport({ scale });

              // Criar canvas para renderizar a página
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              
              if (!context) {
                throw new Error('Canvas context não disponível');
              }

              canvas.width = viewport.width;
              canvas.height = viewport.height;

              // Renderizar página no canvas
              await page.render({
                canvasContext: context,
                viewport: viewport,
              }).promise;

              // Converter canvas para imagem
              const imageUrl = canvas.toDataURL('image/jpeg', 0.95);

              return {
                pageNumber: pageNum,
                imageUrl,
                width: viewport.width,
                height: viewport.height,
              };
            })()
          );
        }

        const renderedPages = await Promise.all(pagePromises);

        if (isMounted) {
          setPages(renderedPages);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        if (isMounted) {
          setError('Falha ao carregar o catálogo. Verifique se o arquivo turq.pdf está disponível.');
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl]);

  return { pages, loading, error, totalPages };
}