import AskPage from '../../components/chat/AskPage.jsx';
import '../site.css';

export const metadata = {
  title: 'Ask Gaurav AI',
  description:
    'Ask questions about Gaurav Suryavanshi’s work in software engineering, API automation, AI agents and LLM testing. Every answer is retrieved from this site and cites the passage it came from.',
  alternates: { canonical: '/ask' },
  openGraph: {
    title: 'Ask Gaurav AI',
    description:
      'An interactive, grounded interface to Gaurav Suryavanshi’s engineering career. Every answer cites the passage it came from.',
    url: '/ask',
    type: 'website',
  },
};

export default function Page() {
  return <AskPage />;
}
