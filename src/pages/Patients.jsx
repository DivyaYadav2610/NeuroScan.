import React, { useState, useEffect } from "react";
import { ArrowLeft, Users, Calendar, Clock } from "lucide-react";

export default function Patients({ onBack }) {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    // Read saved patients from localStorage
    const saved = JSON.parse(localStorage.getItem("neurosense_patients") || "[]");
    setPatients(saved);
  }, []);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* HEADER */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", marginBottom: "20px", color: "#37645E", fontWeight: "bold" }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>
      
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 10px 0", color: "#1A3C34" }}>Patient Directory</h2>
        <p style={{ margin: 0, color: "#666" }}>View all registered patients and their appointment details.</p>
      </div>

      {/* PATIENTS TABLE */}
      {patients.length === 0 ? (
        <div style={{ background: "white", padding: "40px", borderRadius: "12px", textAlign: "center", border: "1px dashed #E1E6DF" }}>
          <Users size={40} color="#A0AEC0" style={{ margin: "0 auto 15px auto" }} />
          <h3 style={{ margin: "0 0 10px 0", color: "#4A5568" }}>No Patients Found</h3>
          <p style={{ margin: 0, color: "#718096" }}>Patients will appear here after their first EEG analysis.</p>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E1E6DF", overflow: "hidden" }}>
          
          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.5fr", gap: "15px", padding: "15px 20px", background: "#F8FAFC", borderBottom: "1px solid #E1E6DF", fontWeight: "bold", color: "#1A3C34", fontSize: "14px" }}>
            <span>Patient Name</span>
            <span>Patient ID</span>
            <span>Age / Gender</span>
            <span>Appointment</span>
            <span>Registration Date</span>
          </div>

          {/* Table Rows */}
          {patients.map((item, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.5fr", gap: "15px", padding: "15px 20px", borderBottom: "1px solid #F1F5F9", alignItems: "center", fontSize: "14px" }}>
              
              <div>
                <strong style={{ display: "block", color: "#1A3C34" }}>{item.name || "Unknown"}</strong>
              </div>

              <div style={{ color: "#718096" }}>
                {item.patientId || "N/A"}
              </div>

              <div style={{ color: "#718096" }}>
                {item.age ? `${item.age} yr` : "N/A"} / {item.gender || "N/A"}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#37645E", fontWeight: "bold" }}>
                <Calendar size={14} /> Today
              </div>

              <div style={{ color: "#718096", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} /> {new Date(item.registrationDate).toLocaleDateString()}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}