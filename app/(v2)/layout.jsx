import '../globals.css';
import '../modern-responsive.css';
import '../hyperdrive.css';
import '../performance.css';
import HyperFX from '../../components/HyperFX';
import LearningsLauncher from '../../components/LearningsLauncher';

/* Route group: adds no URL segment, so this layout wraps both `/` and `/v2`
   with the V2 design system and its motion layer. */
export default function V2Layout({ children }) {
  return (
    <>
      <HyperFX />
      {children}
      <LearningsLauncher />
    </>
  );
}
