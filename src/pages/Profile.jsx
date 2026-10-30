import React from "react";
import { ArrowLeft, ShieldCheck, Stethoscope, Building2 } from "lucide-react";

export default function Profile({ doctor, onBack }) {
  if (!doctor) return null;

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", marginBottom: "20px", color: "#37645E", fontWeight: "bold" }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #E1E6DF", overflow: "hidden" }}>
        
        {/* Header Banner */}
        <div style={{ background: "#37645E", padding: "40px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", color: "#37645E" }}>
            {doctor.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "DR"}
          </div>
          <div>
            <h1 style={{ margin: 0, color: "white", fontSize: "24px" }}>{doctor.name}</h1>
            <p style={{ margin: "5px 0 0 0", color: "#D1E0DB", fontSize: "15px" }}>{doctor.specialization}</p>
          </div>
        </div>

        {/* Profile Details */}
        <div style={{ padding: "40px", display: "grid", gap: "25px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px", borderBottom: "1px solid #F1F5F9", paddingBottom: "15px" }}>
            <div style={{ background: "#F0FDF4", padding: "10px", borderRadius: "8px", color: "#37645E" }}><ShieldCheck size={20} /></div>
            <div>
              <span style={{ fontSize: "12px", color: "#718096", textTransform: "uppercase", fontWeight: "bold" }}>Doctor ID / Email</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "16px", fontWeight: "bold", color: "#1A3C34" }}>{doctor.doctorId || doctor.email}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "15px", borderBottom: "1px solid #F1F5F9", paddingBottom: "15px" }}>
            <div style={{ background: "#F0FDF4", padding: "10px", borderRadius: "8px", color: "#37645E" }}><Stethoscope size={20} /></div>
            <div>
              <span style={{ fontSize: "12px", color: "#718096", textTransform: "uppercase", fontWeight: "bold" }}>Specialization</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "16px", fontWeight: "bold", color: "#1A3C34" }}>{doctor.specialization || "Neurology"}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ background: "#F0FDF4", padding: "10px", borderRadius: "8px", color: "#37645E" }}><Building2 size={20} /></div>
            <div>
              <span style={{ fontSize: "12px", color: "#718096", textTransform: "uppercase", fontWeight: "bold" }}>Hospital / Clinic</span>
              <p style={{ margin: "3px 0 0 0", fontSize: "16px", fontWeight: "bold", color: "#1A3C34" }}>{doctor.hospital || "NeuroSense Research Center"}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}