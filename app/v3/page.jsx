import './v3.css';
import PortfolioV3 from '../../components/v3/PortfolioV3';

export const metadata = {
  title: 'V3 · Notebook',
  description:
    'The current version of Gaurav Suryavanshi’s portfolio — a text-forward personal homepage: one narrow column, a bio written as prose, and hoverable inline facts.',
};

export default function V3Page() {
  return <PortfolioV3 />;
}
