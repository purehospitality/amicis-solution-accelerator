import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import StoreSelectionPage from './pages/StoreSelectionPage';
import HomePage from './pages/HomePage';
import './App.css';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/stores" /> : <LoginPage />}
        />
        <Route
          path="/stores"
          element={isAuthenticated ? <StoreSelectionPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/home"
          element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/stores" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
