import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Tasks from './pages/Tasks/Tasks';

/**
 * Ana uygulama bileşeni
 * Routing ve genel uygulama yapısını içerir
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/team" element={<div>Ekip Sayfası (Yapım aşamasında)</div>} />
            <Route path="/analytics" element={<div>Raporlar Sayfası (Yapım aşamasında)</div>} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
