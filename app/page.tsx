import { SajuApp } from './components/saju-app';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-10 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <SajuApp />
    </main>
  );
}
