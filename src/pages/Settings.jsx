import React, { useState, useEffect } from "react";
import { ArrowLeft, Bell, Shield, Monitor, Save, CheckCircle2 } from "lucide-react";

export default function Settings({ onBack }) {
  const [saved, setSaved] = useState(false);

  // Default settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    theme: "light",
    autoSaveReports: true,
    highContrast: false,
    dataRetention: "1-year",
  });

  // Load settings on mount
  useEffect(() => {
    const stored = localStorage.getItem("neurosense_settings");
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("neurosense_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000); // Hide success message after 3 seconds
  };

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      
      {/* HEADER */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", marginBottom: "20px", color: "#37645E", fontWeight: "bold" }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>
      
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: "28px", margin: "0 0 10px 0", color: "#1A3C34" }}>Platform Settings</h2>
          <p style={{ margin: 0, color: "#666" }}>Manage your clinical workspace preferences and security.</p>
        </div>
        <button 
          onClick={handleSave} 
          style={{ background: "#37645E", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.3s" }}
        >
          {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> Save Changes</>}
        </button>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        
        {/* NOTIFICATIONS CARD */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E1E6DF", overflow: "hidden" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px", background: "#F8FAFC" }}>
            <Bell size={20} color="#37645E" />
            <h3 style={{ margin: 0, color: "#1A3C34", fontSize: "16px" }}>Notifications</h3>
          </div>
          
          <div style={{ padding: "20px", display: "grid", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>Email Notifications</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>Receive alerts when a seizure is detected.</span>
              </div>
              <ToggleSwitch checked={settings.emailNotifications} onChange={() => handleToggle("emailNotifications")} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>Push Notifications</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>Browser alerts for completed analysis.</span>
              </div>
              <ToggleSwitch checked={settings.pushNotifications} onChange={() => handleToggle("pushNotifications")} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>Weekly Digest</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>Summary of all patient analyses every Friday.</span>
              </div>
              <ToggleSwitch checked={settings.weeklyDigest} onChange={() => handleToggle("weeklyDigest")} />
            </div>
          </div>
        </div>

        {/* DISPLAY CARD */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E1E6DF", overflow: "hidden" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px", background: "#F8FAFC" }}>
            <Monitor size={20} color="#37645E" />
            <h3 style={{ margin: 0, color: "#1A3C34", fontSize: "16px" }}>Display Preferences</h3>
          </div>
          
          <div style={{ padding: "20px", display: "grid", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>High Contrast Mode</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>Enhance visual contrast for EEG charts.</span>
              </div>
              <ToggleSwitch checked={settings.highContrast} onChange={() => handleToggle("highContrast")} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>Theme</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>Select the workspace appearance.</span>
              </div>
              <select 
                value={settings.theme} 
                onChange={(e) => handleChange("theme", e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #E1E6DF", color: "#1A3C34", outline: "none" }}
              >
                <option value="light">Light Mode (Default)</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRIVACY & SECURITY CARD */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E1E6DF", overflow: "hidden" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px", background: "#F8FAFC" }}>
            <Shield size={20} color="#37645E" />
            <h3 style={{ margin: 0, color: "#1A3C34", fontSize: "16px" }}>Data & Privacy</h3>
          </div>
          
          <div style={{ padding: "20px", display: "grid", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>Auto-Save Reports</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>Automatically generate and save PDF reports.</span>
              </div>
              <ToggleSwitch checked={settings.autoSaveReports} onChange={() => handleToggle("autoSaveReports")} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1A3C34", fontSize: "14px", display: "block" }}>Data Retention Policy</strong>
                <span style={{ color: "#718096", fontSize: "13px" }}>How long patient EEG data is stored.</span>
              </div>
              <select 
                value={settings.dataRetention} 
                onChange={(e) => handleChange("dataRetention", e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #E1E6DF", color: "#1A3C34", outline: "none" }}
              >
                <option value="30-days">30 Days</option>
                <option value="6-months">6 Months</option>
                <option value="1-year">1 Year</option>
                <option value="indefinite">Indefinitely</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- CUSTOM TOGGLE SWITCH COMPONENT ---
function ToggleSwitch({ checked, onChange }) {
  return (
    <div 
      onClick={onChange}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: checked ? "#37645E" : "#CBD5E1",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.3s"
      }}
    >
      <div style={{
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        background: "white",
        position: "absolute",
        top: "3px",
        left: checked ? "23px" : "3px",
        transition: "left 0.3s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </div>
  );
}