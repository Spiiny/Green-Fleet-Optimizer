import { useState } from "react";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import ControllerDashboard from "./components/controller/ControllerDashboard";
import CaptainDashboard from "./components/captain/CaptainDashboard";

type Role = "controller" | "captain";

interface AuthState {
  role: Role;
  username: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "login">("home");
  const [selectedRole, setSelectedRole] = useState<Role>("controller");
  const [auth, setAuth] = useState<AuthState | null>(null);

  const handleEnterLogin = (preselectedRole: Role = "controller") => {
    setSelectedRole(preselectedRole);
    setCurrentPage("login");
  };

  const handleDirectLogin = (role: Role, username: string) => {
    setAuth({ role, username });
  };

  const handleLogin = (role: Role, username: string) => {
    setAuth({ role, username });
  };

  const handleLogout = () => {
    setAuth(null);
    setCurrentPage("home");
  };

  if (!auth) {
    if (currentPage === "home") {
      return (
        <HomePage
          onEnterLogin={handleEnterLogin}
          onDirectLogin={handleDirectLogin}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onBackToHome={() => setCurrentPage("home")}
        initialRole={selectedRole}
      />
    );
  }

  if (auth.role === "controller") {
    return <ControllerDashboard username={auth.username} onLogout={handleLogout} />;
  }

  return <CaptainDashboard username={auth.username} onLogout={handleLogout} />;
}

