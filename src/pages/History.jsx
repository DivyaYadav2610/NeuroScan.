import React, { useState, useEffect } from "react";
import { ArrowLeft, History as HistoryIcon, CheckCircle2, XCircle } from "lucide-react";

export default function History({ onBack }) {
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("neurosense_reports") || "[]");
    setHistoryData(saved);
  }, []);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", marginBottom: "20px", color: "#37645E", fontWeight: "bold" }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>
      
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 10px 0", color: "#1A3C34" }}>Analysis History</h2>
        <p style={{ margin: 0, color: "#666" }}>A complete log of all EEG recordings analyzed by the Mamba model.</p>
      </div>

      {historyData.length === 0 ? (
        <div style={{ background: "white", padding: "40px", borderRadius: "12px", textAlign: "center", border: "1px dashed #E1E6DF" }}>
          <HistoryIcon size={40} color="#A0AEC0" style={{ margin: "0 auto 15px auto" }} />
          <h3 style={{ margin: "0 0 10px 0", color: "#4A5568" }}>No History Found</h3>
          <p style={{ margin: 0, color: "#718096" }}>Run a new analysis to start building your history log.</p>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E1E6DF", overflow: "hidden" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1.5fr 1fr", gap: "15px", padding: "15px 20px", background: "#F8FAFC", borderBottom: "1px solid #E1E6DF", fontWeight: "bold", color: "#1A3C34", fontSize: "14px" }}>
            <span>Patient</span>
            <span>Date</span>
            <span>Recording File</span>
            <span>AI Result</span>
            <span>Report</span>
          </div>

          {historyData.map((item, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1.5fr 1fr", gap: "15px", padding: "15px 20px", borderBottom: "1px solid #F1F5F9", alignItems: "center", fontSize: "14px" }}>
              
              <div>
                <strong style={{ display: "block", color: "#1A3C34" }}>{item.patientName || "Unknown"}</strong>
                <span style={{ color: "#718096", fontSize: "12px" }}>ID: {item.patientId || "N/A"}</span>
              </div>

              <div style={{ color: "#718096" }}>
                {new Date(item.date).toLocaleDateString()}
              </div>

              <div style={{ color: "#718096", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.filename}>
                {item.filename || "N/A"}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", color: item.isSeizure ? "#d9534f" : "#37645E" }}>
                {item.isSeizure ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                {item.resultLabel}
              </div>

              <div>
                <button style={{ background: "#EAF0EC", color: "#37645E", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                  View
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}