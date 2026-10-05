import { useId, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiMaximize2 } from 'react-icons/fi';
import { initialSceneId, scenes } from './cabanaMedia';
import ExplorerDialog from './ExplorerDialog';
import PanoramicViewport from './PanoramicViewport';
import styles from './CabanaExplorer.module.css';

function TourContent({ sceneId, onSceneChange, onExpand, expanded = false }) {
  const headingId = useId();
  const [focusViewport, setFocusViewport] = useState(false);
  const current = scenes.findIndex((item) => item.id === sceneId);
  const scene = scenes[current];
  function selectScene(id, fromHotspot = false) {
    setFocusViewport(fromHotspot);
    onSceneChange(id);
  }
  function advance(direction) {
    selectScene(scenes[(current + direction + scenes.length) % scenes.length].id);
  }

  return (
    <div className={`${styles.tour} ${expanded ? styles.expandedTour : ''}`}>
      <div className={styles.sceneHeading}>
        <div aria-live="polite" aria-atomic="true">
          <span className={styles.sceneCount}>{String(current + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
          <h3 id={headingId}>{scene.label}</h3>
        </div>
        {!expanded && <button type="button" className={styles.outlineButton} onClick={onExpand}><FiMaximize2 aria-hidden="true" /> Ampliar recorrido</button>}
      </div>
      <div className={styles.tourLayout}>
        <PanoramicViewport key={scene.id} scene={scene} onSceneChange={(id) => selectScene(id, true)} focusOnMount={focusViewport} />
        <div className={styles.sceneSidebar}>
          <p className={styles.selectorTitle}>Elige un espacio</p>
          <div className={styles.sceneList} role="group" aria-label="Espacios del recorrido">
            {scenes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.sceneButton} ${item.id === sceneId ? styles.sceneSelected : ''}`}
                aria-pressed={item.id === sceneId}
                onClick={() => selectScene(item.id)}
              >
                <img src={item.thumb} alt="" width="64" height="44" loading="lazy" decoding="async" />
                <span>{item.label}</span>
                <FiChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className={styles.sceneNavigation}>
            <button type="button" className={styles.outlineButton} onClick={() => advance(-1)} aria-label="Escena anterior"><FiChevronLeft aria-hidden="true" /> Anterior</button>
            <button type="button" className={styles.outlineButton} onClick={() => advance(1)} aria-label="Escena siguiente">Siguiente <FiChevronRight aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      <p className={styles.sceneDescription}>{scene.description} {scene.hotspots.length > 0 ? 'Toca una flecha para cambiar de espacio.' : 'Continúa explorando desde el selector de espacios.'}</p>
    </div>
  );
}

export default function PanoramicTour() {
  const [sceneId, setSceneId] = useState(initialSceneId);
  const [expanded, setExpanded] = useState(false);
  const dialogTitle = useId();
  return (
    <>
      <TourContent sceneId={sceneId} onSceneChange={setSceneId} onExpand={() => setExpanded(true)} />
      {expanded && (
        <ExplorerDialog title="Explora la cabaña" titleId={dialogTitle} onClose={() => setExpanded(false)}>
          <TourContent sceneId={sceneId} onSceneChange={setSceneId} expanded />
        </ExplorerDialog>
      )}
    </>
  );
}
