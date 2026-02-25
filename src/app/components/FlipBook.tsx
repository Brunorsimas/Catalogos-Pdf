import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { PDFPageImage } from '../hooks/usePDFPages';

interface FlipBookProps {
  totalPages: number;
  renderPage: (pageNumber: number) => Promise<PDFPageImage>;
}

const MAX_PAGE_CACHE = 10;

export function FlipBook({ totalPages, renderPage }: FlipBookProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPageNumber, setLoadingPageNumber] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageCache, setPageCache] = useState<Map<number, PDFPageImage>>(() => new Map());

  const containerRef = useRef<HTMLDivElement>(null);
  const pageCacheRef = useRef(pageCache);
  const inFlightRef = useRef<Map<number, Promise<void>>>(new Map());

  useEffect(() => {
    pageCacheRef.current = pageCache;
  }, [pageCache]);

  const revokeAllCachedUrls = useCallback(() => {
    for (const page of pageCacheRef.current.values()) {
      URL.revokeObjectURL(page.imageUrl);
    }
    pageCacheRef.current.clear();
    inFlightRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeAllCachedUrls();
    };
  }, [revokeAllCachedUrls]);

  useEffect(() => {
    setCurrentPage(0);
    setDirection(0);
    setPageError(null);
    setLoadingPageNumber(null);
    revokeAllCachedUrls();
    setPageCache(new Map());
  }, [totalPages, revokeAllCachedUrls]);

  const pruneCache = useCallback((cache: Map<number, PDFPageImage>, focusPage: number) => {
    if (cache.size <= MAX_PAGE_CACHE) return cache;

    const closestPages = [...cache.keys()]
      .sort((a, b) => Math.abs(a - focusPage) - Math.abs(b - focusPage))
      .slice(0, MAX_PAGE_CACHE);

    const keepSet = new Set(closestPages);
    const next = new Map<number, PDFPageImage>();

    for (const [pageNumber, pageData] of cache.entries()) {
      if (keepSet.has(pageNumber)) {
        next.set(pageNumber, pageData);
      } else {
        URL.revokeObjectURL(pageData.imageUrl);
      }
    }

    return next;
  }, []);

  const ensurePageLoaded = useCallback(
    async (pageNumber: number, priority: boolean) => {
      if (pageNumber < 1 || pageNumber > totalPages) return;
      if (pageCacheRef.current.has(pageNumber)) return;

      const inflight = inFlightRef.current.get(pageNumber);
      if (inflight) {
        await inflight;
        return;
      }

      const task = (async () => {
        if (priority) {
          setLoadingPageNumber(pageNumber);
        }

        try {
          const rendered = await renderPage(pageNumber);

          setPageCache((prev) => {
            if (prev.has(pageNumber)) {
              URL.revokeObjectURL(rendered.imageUrl);
              return prev;
            }
            const next = new Map(prev);
            next.set(pageNumber, rendered);
            return pruneCache(next, pageNumber);
          });

          setPageError(null);
        } catch (err) {
          console.error(`Erro ao renderizar página ${pageNumber}:`, err);
          if (priority) {
            setPageError('Falha ao renderizar esta página. Tente novamente.');
          }
        } finally {
          if (priority) {
            setLoadingPageNumber((current) => (current === pageNumber ? null : current));
          }
        }
      })();

      inFlightRef.current.set(pageNumber, task);
      await task.finally(() => {
        inFlightRef.current.delete(pageNumber);
      });
    },
    [pruneCache, renderPage, totalPages]
  );

  useEffect(() => {
    if (totalPages <= 0) return;

    const pageNumber = currentPage + 1;
    void ensurePageLoaded(pageNumber, true);
    void ensurePageLoaded(pageNumber - 1, false);
    void ensurePageLoaded(pageNumber + 1, false);
  }, [currentPage, ensurePageLoaded, totalPages]);

  const goToNext = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info;

    if (offset.x < -60 || velocity.x < -400) {
      goToNext();
    } else if (offset.x > 60 || velocity.x > 400) {
      goToPrev();
    }
    setIsDragging(false);
  };

  const pageVariants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? 65 : -65,
      opacity: 0,
      scale: 0.95,
      z: -60,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      z: 0,
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -65 : 65,
      opacity: 0,
      scale: 0.95,
      z: -60,
    }),
  };

  const currentPageNumber = currentPage + 1;
  const activePage = pageCache.get(currentPageNumber);
  const isActivePageLoading = loadingPageNumber === currentPageNumber && !activePage;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center bg-neutral-950 overflow-hidden"
      style={{
        perspective: '1800px',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <AnimatePresence mode="wait" custom={direction}>
        {activePage ? (
          <motion.div
            key={currentPageNumber}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              rotateY: {
                type: 'spring',
                stiffness: 260,
                damping: 28,
                mass: 0.6,
              },
              opacity: { duration: 0.15 },
              scale: { duration: 0.18 },
              z: { duration: 0.18 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{
              transformStyle: 'preserve-3d',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="touch-none select-none cursor-grab active:cursor-grabbing"
          >
            <img
              src={activePage.imageUrl}
              alt={`Página ${activePage.pageNumber}`}
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                boxShadow: isDragging
                  ? '0 8px 60px rgba(0,0,0,0.7)'
                  : '0 4px 40px rgba(0,0,0,0.6)',
                filter: isDragging
                  ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))'
                  : 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
                transition: 'box-shadow 0.3s ease, filter 0.3s ease',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`loading-${currentPageNumber}`}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 text-white/80"
          >
            <div className="w-10 h-10 border-2 border-neutral-700 border-t-teal-400 rounded-full animate-spin" />
            <p className="text-sm">Carregando página {currentPageNumber}...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {pageError && (
        <div className="absolute top-20 left-4 right-4 px-4 py-3 bg-red-900/60 border border-red-700 rounded-xl text-red-200 text-sm text-center z-40">
          {pageError}
        </div>
      )}

      <div
        className="absolute px-4 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white/60 pointer-events-none"
        style={{
          bottom: `calc(env(safe-area-inset-bottom) + 20px)`,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          letterSpacing: '0.04em',
        }}
      >
        {Math.min(currentPageNumber, Math.max(totalPages, 1))} / {Math.max(totalPages, 1)}
      </div>

      {currentPage === 0 && totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3.5, duration: 1.2 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between items-center px-6 pointer-events-none"
        >
          <span className="text-white/35 text-sm">← Anterior</span>
          <span className="text-white/35 text-sm">Próxima →</span>
        </motion.div>
      )}

      {currentPage > 0 && (
        <button
          onClick={goToPrev}
          className="absolute left-0 top-0 w-12 h-full opacity-0 z-10"
          aria-label="Página anterior"
        />
      )}
      {currentPage < totalPages - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-0 top-0 w-12 h-full opacity-0 z-10"
          aria-label="Próxima página"
        />
      )}

      {isActivePageLoading && (
        <div className="absolute inset-0 pointer-events-none bg-black/10" />
      )}
    </div>
  );
}
