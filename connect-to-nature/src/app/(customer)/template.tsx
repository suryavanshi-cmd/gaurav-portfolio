import { PageTransition } from '@/components/ui/PageTransition';

export default function CustomerTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
