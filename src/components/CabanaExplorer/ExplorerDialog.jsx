import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import styles from './CabanaExplorer.module.css';

export default function ExplorerDialog({ title, titleId, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className={styles.dialogSurface}>
        <div className={styles.dialogHeader}>
          <h3 id={titleId}>{title}</h3>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar vista ampliada">
            <FiX aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
