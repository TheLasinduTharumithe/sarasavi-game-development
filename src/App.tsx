import { lazy, Suspense } from 'react';
import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import GamePage from './pages/GamePage';

const AdminPage = lazy(() => import('./pages/AdminPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm font-bold text-[#1a50a0]">Loading…</div>}>
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
