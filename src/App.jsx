import { Activity, Mail, Lock, Eye, EyeOff, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";

import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EEGAnalysis from "./pages/EEGAnalysis";
import Reports from "./pages/Reports";
import History from "./pages/History";
import Patients from "./pages/Patients";
import Profile from "./pages/Profile"; 
import Settings from "./pages/Settings";

function App() {
  const [page, setPage] = useState("login");
  const [doctor, setDoctor] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");

  /* ================= LOGIN ================= */
  const handleLogin = (e) => {
    e.preventDefault();
    if (!doctorId || !password) {
      alert("Please enter your Doctor ID/Email and password.");
      return;
    }

    const existingDoctors = JSON.parse(localStorage.getItem("neurosense_all_doctors") || "[]");
    
    const foundDoctor = existingDoctors.find(
      d => d.doctorId === doctorId || d.email === doctorId
    );

    // Strict check: If they don't exist, tell them to register. No fake "Dr. Demo".
    if (!foundDoctor) {
      alert("Account not found. Please create an account first.");
      return;
    }

    setDoctor(foundDoctor);
    setPage("dashboard");
  };

  /* ================= REGISTRATION ================= */
  const handleRegister = (doctorData) => {
    setDoctor(doctorData);
    setPage("dashboard"); 
  };

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    setDoctor(null);
    setPage("login");
    setDoctorId("");
    setPassword("");
  };

  /* ================= ROUTING ================= */
  if (page === "analysis") return <EEGAnalysis onBack={() => setPage("dashboard")} />;
  if (page === "reports") return <Reports onBack={() => setPage("dashboard")} />;
  if (page === "history") return <History onBack={() => setPage("dashboard")} />;
  if (page === "patients") return <Patients onBack={() => setPage("dashboard")} />;
  if (page === "profile") return <Profile doctor={doctor} onBack={() => setPage("dashboard")} />;
  if (page === "settings") return <Settings onBack={() => setPage("dashboard")} />;
  
  if (page === "dashboard") {
    return (
      <Dashboard
        doctor={doctor}
        onLogout={handleLogout}
        onNewAnalysis={() => setPage("analysis")}
        setPage={setPage}
      />
    );
  }

  if (page === "register") {
    return <Register onBackToLogin={() => setPage("login")} onRegister={handleRegister} />;
  }

  /* ================= LOGIN PAGE ================= */
  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-icon"><Activity size={26} /></div>
          <div>
            <h1>NeuroSense</h1>
            <p>AI-Assisted EEG Analysis</p>
          </div>
        </div>

        <div className="hero-content">
          <div className="doctor-badge"><Stethoscope size={16} /> Doctor Portal</div>
          <h2>Intelligent EEG<br />Analysis & Screening</h2>
          <p className="hero-description">A secure platform designed to help medical professionals review and analyze EEG recordings with AI-assisted tools.</p>
        </div>

        <div className="hero-footer"><ShieldCheck size={16} /> Secure clinical research environment</div>
      </section>

      <section className="login-section">
        <div className="login-card">
          <div className="mobile-brand">
            <div className="brand-icon"><Activity size={23} /></div>
            <div>
              <h2>NeuroSense</h2>
              <p>EEG Analysis</p>
            </div>
          </div>

          <div className="form-heading">
            <div className="form-icon"><Stethoscope size={22} /></div>
            <h2>Doctor Sign In</h2>
            <p>Access your EEG analysis workspace</p>
          </div>

          <form onSubmit={handleLogin}>
            <label>Doctor ID / Professional Email</label>
            <div className="input-box">
              <Mail size={18} />
              <input type="text" placeholder="Enter Doctor ID or email" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
            </div>

            <label>Password</label>
            <div className="input-box">
              <Lock size={18} />
              <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="eye-button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="form-options">
              <label className="remember"><input type="checkbox" /> Remember me</label>
              <button type="button" className="forgot">Forgot password?</button>
            </div>

            <button type="submit" className="sign-in-button">Sign In</button>
          </form>

          <div className="register-area">
            <span>New doctor?</span>
            <button type="button" onClick={() => setPage("register")}>Create an account</button>
          </div>

          <div className="security-box">
            <ShieldCheck size={17} />
            <span>This portal is intended for authorized medical professionals and approved research users.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;