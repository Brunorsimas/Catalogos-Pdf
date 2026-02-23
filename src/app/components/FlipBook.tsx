import { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { PDFPageImage } from '../hooks/usePDFPages';

interface FlipBookProps {
  pages: PDFPageImage[];
}

export function FlipBook({ pages }: FlipBookProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = pages.length;

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

  const activePage = pages[currentPage];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center bg-neutral-950 overflow-hidden"
      style={{
        perspective: '1800px',
        // Respeita safe areas do sistema (notch, barra de navegação)
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <AnimatePresence mode="wait" custom={direction}>
        {activePage && (
          <motion.div
            key={currentPage}
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
              // Ocupa todo espaço disponível mantendo proporção
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
                // Preenche ao máximo sem distorção, respeitando os dois eixos
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                boxShadow: isDragging
                  ? '0 8px 60px rgba(0,0,0,0.7)'
                  : '0 4px 40px rgba(0,0,0,0.6)',
                // Sutil borda de sombra nas laterais para profundidade
                filter: isDragging
                  ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))'
                  : 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
                transition: 'box-shadow 0.3s ease, filter 0.3s ease',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de página — discreto, some depois de 4s no primeiro uso */}
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
        {currentPage + 1} / {totalPages}
      </div>

      {/* Dica de swipe — aparece apenas na primeira página e some sozinha */}
      {currentPage === 0 && (
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

      {/* Zonas de toque invisíveis nas bordas (complementam o swipe) */}
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
    </div>
  );
}