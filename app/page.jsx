import './v3/v3.css';
import PortfolioV3 from '../components/v3/PortfolioV3';

/* `/` serves the latest version. Deliberately at the app root rather than
   inside the (v2) route group, so it picks up V3's stylesheet and not V2's. */
export default function Home() {
  return <PortfolioV3 />;
}
