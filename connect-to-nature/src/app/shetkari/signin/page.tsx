import { AuthForm } from '@/components/AuthForm';

export default function HostSignInPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <AuthForm role="host" />
    </div>
  );
}
