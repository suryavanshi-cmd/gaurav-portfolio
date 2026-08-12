import './v1-globals.css';
import './v1-responsive.css';
import './v1-hyperdrive.css';
import HyperFXV1 from '../../components/v1/HyperFXV1';
import LearningsLauncher from '../../components/LearningsLauncher';

/* V1 is an archived snapshot: its three stylesheets and its motion layer are
   frozen copies taken from the last commit before the monochrome redesign, so
   this route keeps rendering the original site even as V2 moves on. */

export const metadata = {
  title: 'V1 · Terminal',
  description:
    'The first version of Gaurav Suryavanshi’s portfolio — a dark engineering-console design with neon accents, four weather themes, and a hidden overdrive mode.',
};

export const viewport = {
  themeColor: '#070a0f',
};

export default function V1Layout({ children }) {
  return (
    <>
      <HyperFXV1 />
      {children}
      <LearningsLauncher />
    </>
  );
}
