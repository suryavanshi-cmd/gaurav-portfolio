import { versions } from '../app/versions';
import styles from './VersionSwitcher.module.css';

/*
  Sits in the header of every version. Plain <a> elements, never next/link:
  each version owns a global stylesheet, so switching has to be a full document
  load or the two designs stack on top of each other.
*/
export default function VersionSwitcher({ current }) {
  return (
    <div className={styles.switcher} role="group" aria-label="Portfolio version">
      <span className={styles.label} aria-hidden="true">Version</span>
      {versions.map((version) => {
        const isCurrent = version.key === current;
        return (
          <a
            key={version.key}
            href={version.href}
            className={`${styles.option} ${isCurrent ? styles.current : ''}`}
            aria-current={isCurrent ? 'page' : undefined}
            title={`${version.label} — ${version.name}: ${version.tagline}`}
          >
            {version.label}
          </a>
        );
      })}
    </div>
  );
}
