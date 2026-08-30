import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { Navbar } from './components/layout/Navbar.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-root">
          <Navbar />
          <main className="main-content app-container">
            <AppRoutes />
          </main>
          <footer className="footer">
            <div className="footer-container">
              <p>
                <strong>Mini Marketplace MVP</strong> — Full-Stack Evaluation Project
              </p>
              <p className="footer-sub">
                Roles: Buyer • Seller • Admin | PostgreSQL + Prisma + Express + React
              </p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
