import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ConfigPage } from './components/ConfigPage';
import { Dashboard } from './components/Dashboard';
import { useApiConfig } from './hooks/useApiConfig';
import './App.css';

function App() {
  const { config } = useApiConfig();

  return (
    <Router>
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800 shadow-lg border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-8">
                <h1 className="text-3xl font-bold text-slate-100">
                  代理服务器统计
                </h1>
                <nav className="flex space-x-4">
                  <Link
                    to="/"
                    className="text-slate-300 hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    仪表板
                  </Link>
                  <Link
                    to="/config"
                    className="text-slate-300 hover:text-slate-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    配置
                  </Link>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-400">
                  服务器: {config.baseUrl}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
