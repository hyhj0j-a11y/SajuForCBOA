import { SajuApp } from './components/saju-app';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md pt-[max(2.5rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(3rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))]">
      <SajuApp />
    </main>
  );
}
