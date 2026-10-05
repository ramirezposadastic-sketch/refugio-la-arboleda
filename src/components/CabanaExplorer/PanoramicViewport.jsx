import { useEffect, useId, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiNavigation, FiRefreshCw } from 'react-icons/fi';
import styles from './CabanaExplorer.module.css';

export default function PanoramicViewport({ scene, onSceneChange, focusOnMount = false }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const previousWidth = useRef(null);
  const descriptionId = useId();
  const [size, setSize] = useState({ width: scene.width, height: scene.height });
  const [status, setStatus] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [edges, setEdges] = useState({ left: true, right: false });

  useEffect(() => {
    const viewport = viewportRef.current;
    const update = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (!width || !height) return;
      const oldWidth = previousWidth.current;
      const center = oldWidth ? (viewport.scrollLeft + width / 2) / oldWidth : scene.center;
      // Keep the original ratio and never enlarge beyond source resolution.
      const scale = Math.min(1, Math.max(width * 1.28 / scene.width, height / scene.height));
      const nextWidth = Math.round(scene.width * scale);
      setSize({ width: nextWidth, height: Math.round(scene.height * scale) });
      previousWidth.current = nextWidth;
      requestAnimationFrame(() => {
        viewport.scrollLeft = Math.max(0, center * nextWidth - width / 2);
        setEdges({ left: viewport.scrollLeft <= 2, right: viewport.scrollLeft + width >= nextWidth - 2 });
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (focusOnMount) viewport.focus({ preventScroll: true });
    return () => observer.disconnect();
  }, [scene, focusOnMount]);

  function move(direction) {
    const viewport = viewportRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollBy({ left: direction * viewport.clientWidth * 0.45, behavior: reducedMotion ? 'instant' : 'smooth' });
  }

  function startDrag(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return;
    const viewport = event.currentTarget;
    dragRef.current = { id: event.pointerId, x: event.clientX, left: viewport.scrollLeft };
    viewport.setPointerCapture(event.pointerId);
    viewport.focus({ preventScroll: true });
  }

  function stopDrag(event) {
    if (!dragRef.current || dragRef.current.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  }

  function handleKey(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      event.currentTarget.scrollLeft = event.key === 'Home' ? 0 : event.currentTarget.scrollWidth;
    }
  }

  return (
    <div className={styles.viewportGroup}>
      <p id={descriptionId} className={styles.srOnly}>
        Arrastra horizontalmente o usa las flechas izquierda y derecha del teclado para mirar alrededor.
        Pulsa los marcadores para cambiar de espacio. También puedes elegir un espacio en el selector.
      </p>
      <div className={styles.viewportShell}>
        <div
          ref={viewportRef}
          className={`${styles.viewport} ${dragging ? styles.dragging : ''}`}
          role="region"
          aria-label={`Vista panorámica: ${scene.label}`}
          aria-describedby={descriptionId}
          tabIndex={0}
          onKeyDown={handleKey}
          onPointerDown={startDrag}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.id !== event.pointerId) return;
            if (Math.abs(event.clientX - drag.x) > 3) setDragging(true);
            event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
          }}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={() => { dragRef.current = null; setDragging(false); }}
          onScroll={(event) => {
            const viewport = event.currentTarget;
            setEdges({ left: viewport.scrollLeft <= 2, right: viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2 });
          }}
        >
          <div className={styles.panorama} style={{ width: size.width, height: size.height }}>
            <img
              key={retry}
              className={status === 'ready' ? styles.panoramaReady : styles.panoramaLoading}
              src={retry ? `${scene.src}?retry=${retry}` : scene.src}
              alt={scene.description}
              width={scene.width}
              height={scene.height}
              draggable="false"
              decoding="async"
              onLoad={() => setStatus('ready')}
              onError={() => setStatus('error')}
            />
            {status === 'ready' && scene.hotspots.map((hotspot) => (
              <button
                key={hotspot.target}
                type="button"
                className={`${styles.hotspot} ${hotspot.x > 0.7 ? styles.hotspotLeft : ''}`}
                style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
                aria-label={hotspot.label}
                onClick={() => onSceneChange(hotspot.target)}
              >
                <FiNavigation aria-hidden="true" />
                <span className={styles.hotspotLabel}>{hotspot.label}</span>
              </button>
            ))}
          </div>
        </div>
        {status !== 'ready' && (
          <div className={styles.imageStatus} role="status">
            <p>{status === 'loading' ? 'Cargando este espacio…' : 'No pudimos cargar esta fotografía.'}</p>
            {status === 'error' && <button type="button" className={styles.lightButton} onClick={() => { setStatus('loading'); setRetry((value) => value + 1); }}><FiRefreshCw aria-hidden="true" /> Reintentar</button>}
          </div>
        )}
      </div>
      <div className={styles.panControls}>
        <span>Arrastra para mirar alrededor</span>
        <div>
          <button type="button" className={styles.iconButton} disabled={edges.left || status !== 'ready'} onClick={() => move(-1)} aria-label="Mover vista a la izquierda"><FiArrowLeft aria-hidden="true" /></button>
          <button type="button" className={styles.iconButton} disabled={edges.right || status !== 'ready'} onClick={() => move(1)} aria-label="Mover vista a la derecha"><FiArrowRight aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}
