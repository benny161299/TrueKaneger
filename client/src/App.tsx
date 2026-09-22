import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AppContainer, MainContent } from "./styles/shared";

export function App() {
  return (
    <AppContainer>
      <Header />
      <MainContent>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

export default App;
