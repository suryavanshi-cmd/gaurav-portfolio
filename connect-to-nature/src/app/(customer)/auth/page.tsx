import { AuthForm } from '@/components/AuthForm';

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <AuthForm role="traveler" />
    </div>
  );
}
