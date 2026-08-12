import PortfolioV2 from '../../components/v2/PortfolioV2';

/* `/` serves the latest version. The same component is mounted at `/v2` so
   the version has a stable, linkable address of its own. */
export default function Home() {
  return <PortfolioV2 />;
}
