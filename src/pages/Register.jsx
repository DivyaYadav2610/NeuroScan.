import { useState } from "react";
import {
  Activity, UserRound, Mail, Phone, Lock, Building2, Stethoscope, BadgeCheck, Eye, EyeOff, ShieldCheck, ArrowLeft
} from "lucide-react";

function Register({ onBackToLogin, onRegister }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    doctorId: "",
    specialization: "",
    hospital: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.fullName || !form.doctorId || !form.email || !form.password) {
      alert("Please fill in your Name, Doctor ID, Email, and Password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Get existing doctors
    const existingDoctors = JSON.parse(localStorage.getItem("neurosense_all_doctors") || "[]");
    
    // Check for duplicates
    const isDuplicate = existingDoctors.find(
      d => d.doctorId === form.doctorId || d.email === form.email
    );

    if (isDuplicate) {
      alert("An account with this Doctor ID or Email already exists. Please sign in.");
      return;
    }

    // Create new account object
    const newAccount = {
      name: form.fullName, // <--- SAVES THE EXACT NAME YOU TYPE
      doctorId: form.doctorId,
      specialization: form.specialization || "Neurology",
      hospital: form.hospital || "NeuroSense Research Center",
      email: form.email,
      phone: form.phone,
      password: form.password 
    };

    // Save to localStorage
    existingDoctors.push(newAccount);
    localStorage.setItem("neurosense_all_doctors", JSON.stringify(existingDoctors));

    // Pass to App.jsx to log in immediately
    onRegister(newAccount);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <div className="register-brand">
            <div className="brand-icon"><Activity size={25} /></div>
            <div>
              <h1>NeuroSense</h1>
              <p>AI-Assisted EEG Analysis</p>
            </div>
          </div>
          <button type="button" className="back-button" onClick={onBackToLogin}>
            <ArrowLeft size={18} /> Back to Login
          </button>
        </div>

        <div className="registration-title">
          <div className="large-form-icon"><Stethoscope size={25} /></div>
          <div>
            <h2>Doctor Registration</h2>
            <p>Create your professional account to access the EEG analysis platform.</p>
          </div>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="section-title"><BadgeCheck size={19} /> Professional Information</div>
          <div className="form-grid">
            <div className="field">
              <label>Full Name *</label>
              <div className="input-box">
                <UserRound size={18} />
                <input name="fullName" type="text" placeholder="Dr. Full Name" value={form.fullName} onChange={handleChange} required />
              </div>
            </div>
            <div className="field">
              <label>Doctor Registration / ID *</label>
              <div className="input-box">
                <BadgeCheck size={18} />
                <input name="doctorId" type="text" placeholder="Medical registration number" value={form.doctorId} onChange={handleChange} required />
              </div>
            </div>
            <div className="field">
              <label>Specialization</label>
              <div className="input-box">
                <Stethoscope size={18} />
                <input name="specialization" type="text" placeholder="e.g. Neurology" value={form.specialization} onChange={handleChange} />
              </div>
            </div>
            <div className="field">
              <label>Hospital / Institution</label>
              <div className="input-box">
                <Building2 size={18} />
                <input name="hospital" type="text" placeholder="Hospital or institution" value={form.hospital} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="section-title"><Mail size={19} /> Contact Information</div>
          <div className="form-grid">
            <div className="field">
              <label>Professional Email *</label>
              <div className="input-box">
                <Mail size={18} />
                <input name="email" type="email" placeholder="doctor@hospital.com" value={form.email} onChange={handleChange} required />
              </div>
            </div>
            <div className="field">
              <label>Phone Number</label>
              <div className="input-box">
                <Phone size={18} />
                <input name="phone" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="section-title"><Lock size={19} /> Account Security</div>
          <div className="form-grid">
            <div className="field">
              <label>Password *</label>
              <div className="input-box">
                <Lock size={18} />
                <input name="password" type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters" value={form.password} onChange={handleChange} required />
                <button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="field">
              <label>Confirm Password *</label>
              <div className="input-box">
                <Lock size={18} />
                <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} required />
                <button type="button" className="icon-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="verification-box">
            <ShieldCheck size={22} />
            <div>
              <strong>Professional Verification</strong>
              <p>Registration is intended for qualified medical professionals and approved research personnel.</p>
            </div>
          </div>

          <label className="terms">
            <input type="checkbox" required />
            <span>I confirm that the information provided is accurate and that I am authorized to access this EEG analysis system.</span>
          </label>

          <button type="submit" className="main-button registration-button">Create Doctor Account</button>
          
          <p className="existing-account">
            Already have an account?
            <button type="button" onClick={onBackToLogin}>Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;