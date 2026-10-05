import { Component, lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { FiArrowUpRight, FiCamera, FiChevronLeft, FiChevronRight, FiCompass, FiMaximize2 } from 'react-icons/fi';
import { photos } from './cabanaMedia';
import ExplorerDialog from './ExplorerDialog';
import styles from './CabanaExplorer.module.css';

const PanoramicTour = lazy(() => import('./PanoramicTour'));

class ExplorerBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div className={styles.fallback} role="status">
        <p>No pudimos abrir el recorrido. Puedes seguir viendo las fotografías o recargar la página para volver a intentarlo.</p>
        <button type="button" className={styles.outlineButton} onClick={() => window.location.reload()}>Recargar página</button>
      </div>
    );
    return this.props.children;
  }
}

function FullPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className={styles.photoError} role="status">No pudimos cargar esta fotografía. Elige otra con los controles.</p> : (
    <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} className={styles.fullPhoto} onError={() => setFailed(true)} />
  );
}

function PhotoGallery() {
  const [selected, setSelected] = useState(null);
  const titleId = useId();
  const changePhoto = (direction) => setSelected((value) => (value + direction + photos.length) % photos.length);
  return (
    <>
      <div className={styles.photoGrid}>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className={`${styles.photoCard} ${index === 0 ? styles.featuredPhoto : ''}`}
            onClick={() => setSelected(index)}
            aria-label={`Ampliar fotografía: ${photo.title}`}
          >
            <span className={styles.photoFrame}>
              <img
                src={photo.preview}
                srcSet={`${photo.preview} 480w, ${photo.src} ${photo.width}w`}
                sizes={index === 0 ? '(max-width: 600px) calc(100vw - 36px), (max-width: 1280px) 90vw, 1180px' : '(max-width: 600px) calc((100vw - 52px) / 2), (max-width: 980px) 28vw, 220px'}
                alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async"
              />
              <span className={styles.photoExpand}><FiMaximize2 aria-hidden="true" /></span>
            </span>
            <span className={styles.photoCaption}>{photo.title}<FiArrowUpRight aria-hidden="true" /></span>
          </button>
        ))}
      </div>
      {selected !== null && (
        <ExplorerDialog title={photos[selected].title} titleId={titleId} onClose={() => setSelected(null)}>
          <div className={styles.photoViewer} onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault(); changePhoto(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}>
            <FullPhoto key={photos[selected].id} photo={photos[selected]} />
            <div className={styles.photoNavigation}>
              <button type="button" className={styles.outlineButton} onClick={() => changePhoto(-1)} aria-label="Fotografía anterior"><FiChevronLeft aria-hidden="true" /> Anterior</button>
              <span role="status">{selected + 1} de {photos.length}</span>
              <button type="button" className={styles.outlineButton} onClick={() => changePhoto(1)} aria-label="Fotografía siguiente">Siguiente <FiChevronRight aria-hidden="true" /></button>
            </div>
          </div>
        </ExplorerDialog>
      )}
    </>
  );
}

export default function CabanaExplorer() {
  const [mode, setMode] = useState('tour');
  const [nearby, setNearby] = useState(false);
  const sectionRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearby(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);
  const headingId = useId();
  return (
    <section ref={sectionRef} id="explora-cabana" className={styles.explorer} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <span className={styles.kicker}>Conoce cada rincón</span>
            <h2 id={headingId}>Explora la cabaña</h2>
            <p>Entra a la cabaña y descubre cada espacio a tu ritmo.</p>
          </div>
          <div className={styles.modeSwitch} role="group" aria-label="Elige cómo explorar la cabaña">
            <button type="button" aria-pressed={mode === 'tour'} onClick={() => setMode('tour')}><FiCompass aria-hidden="true" /> Recorrido</button>
            <button type="button" aria-pressed={mode === 'photos'} onClick={() => setMode('photos')}><FiCamera aria-hidden="true" /> Fotografías</button>
          </div>
        </div>
        <div hidden={mode !== 'tour'}>
          {nearby ? (
            <ExplorerBoundary>
              <Suspense fallback={<div className={styles.fallback} role="status">Preparando el recorrido…</div>}>
                <PanoramicTour />
              </Suspense>
            </ExplorerBoundary>
          ) : <div className={styles.fallback} role="status">Preparando el recorrido…</div>}
        </div>
        {mode === 'photos' && <PhotoGallery />}
        <p className={styles.footnote}>Fotografías reales de la cabaña y su entorno.</p>
      </div>
    </section>
  );
}
