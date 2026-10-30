import React, { useState, useEffect } from "react";
import {
  Activity,
  FileUp,
  FileText,
  History,
  LogOut,
  Users,
  Brain,
  Clock,
  ChevronRight,
  ShieldCheck,
  UserRound,
  Settings,
  Search,
  UserPlus,
  Upload
} from "lucide-react";

function Dashboard({ doctor, onLogout, onNewAnalysis, setPage }) {
  
  // ============================================
  // REAL-TIME STATS & RECENT ANALYSES LOGIC
  // ============================================
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [uniquePatients, setUniquePatients] = useState(0);
  const [reportsGenerated, setReportsGenerated] = useState(0);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  useEffect(() => {
    // Read the saved reports from localStorage
    const savedReports = JSON.parse(localStorage.getItem("neurosense_reports") || "[]");
    
    // 1. Total Analyses
    setTotalAnalyses(savedReports.length);

    // 2. Reports Generated
    setReportsGenerated(savedReports.length);

    // 3. Unique Patients
    const uniqueIds = new Set(savedReports.map(r => r.patientId).filter(Boolean));
    setUniquePatients(uniqueIds.size);

    // 4. Recent Analyses (Get the 5 most recent)
    setRecentAnalyses(savedReports.slice(0, 5));
  }, [totalAnalyses]); // Updates whenever a new analysis happens

  const getInitials = () => {
    if (!doctor?.name) return "DR";
    return doctor.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const handleUpload = () => {
    onNewAnalysis();
  };

  return (
    <div className="dashboard">

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-icon">
            <Activity size={24} />
          </div>

          <div>
            <h2>NeuroSense</h2>
            <span>EEG Analysis Platform</span>
          </div>

        </div>

        <nav>

          <div className="nav-item active">
            <Activity size={18} />
            Dashboard
          </div>

          <div
            className="nav-item"
            onClick={onNewAnalysis}
            style={{ cursor: "pointer" }}
          >
            <FileUp size={18} />
            New Analysis
          </div>

          <div 
            className="nav-item" 
            onClick={() => setPage("patients")} 
            style={{ cursor: "pointer" }}
          >
            <Users size={18} />
            Patients
          </div>

          <div 
            className="nav-item" 
            onClick={() => setPage("reports")} 
            style={{ cursor: "pointer" }}
          >
            <FileText size={18} />
            Reports
          </div>

          <div 
            className="nav-item" 
            onClick={() => setPage("history")} 
            style={{ cursor: "pointer" }}
          >
            <History size={18} />
            Analysis History
          </div>

          <div 
            className="nav-item" 
            onClick={() => setPage("profile")} 
            style={{ cursor: "pointer" }}
          >
            <UserRound size={18} />
            Profile
          </div>

          <div 
            className="nav-item" 
            onClick={() => setPage("settings")} 
            style={{ cursor: "pointer" }}
          >
            <Settings size={18} />
            Settings
          </div>

        </nav>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Logout
        </button>

      </aside>


      {/* ================= MAIN ================= */}

      <main className="dashboard-main">

        {/* HEADER */}

        <header className="dashboard-header">

          <div className="dashboard-welcome">

            <p className="welcome-text">
              Welcome back,
            </p>

            {/* CHANGED: Removed "Dr. Demo" fallback */}
            <h1>
              {doctor?.name || "Doctor"}
            </h1>

            <p className="doctor-subtitle">
              {doctor?.specialization || "Neurology"}
              <span>|</span>
              {doctor?.hospital || "NeuroSense Research Center"}
            </p>

          </div>


          <div className="header-right">

            <div className="search-box">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search patients, analyses..."
              />
            </div>


            <div className="doctor-profile">

              <div className="doctor-avatar">
                {getInitials()}
              </div>

              <div>
                {/* CHANGED: Removed "Dr. Demo" fallback */}
                <strong>
                  {doctor?.name || "Doctor"}
                </strong>

                <span>
                  {doctor?.specialization || "Neurology"}
                </span>
              </div>

            </div>

          </div>

        </header>


        {/* ================= STATISTICS ================= */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon">
              <Brain size={22} />
            </div>

            <div>
              <span>Total Analyses</span>
              <h2>{totalAnalyses}</h2>
              <small>EEG recordings analyzed</small>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon">
              <Users size={22} />
            </div>

            <div>
              <span>Patients</span>
              <h2>{uniquePatients}</h2>
              <small>Registered patients</small>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon">
              <FileText size={22} />
            </div>

            <div>
              <span>Reports Generated</span>
              <h2>{reportsGenerated}</h2>
              <small>AI-assisted reports</small>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon">
              <Clock size={22} />
            </div>

            <div>
              <span>System Status</span>
              <h2 className="status">Ready</h2>
              <small>All systems operational</small>
            </div>

          </div>

        </section>


        {/* ================= NEW EEG ANALYSIS ================= */}

        <section className="new-analysis-card">

          <div className="analysis-content">

            <span className="section-label">
              EEG ANALYSIS
            </span>

            <h2>
              Start a New EEG Analysis
            </h2>

            <p>
              Upload an EEG recording in EDF format to
              begin the analysis and generate an
              AI-assisted clinical report.
            </p>

            <button
              className="primary-button"
              onClick={handleUpload}
            >
              <Upload size={19} />

              Upload EEG Recording

              <ChevronRight size={18} />
            </button>

            <div className="upload-info">
              <span>Supported format: .edf</span>
              <span>|</span>
              <span>Max file size: 500 MB</span>
            </div>

          </div>


          <div className="analysis-visual">

            <div className="brain-visual">
              <Activity size={58} />
              <Brain size={68} />
            </div>

          </div>

        </section>


        {/* ================= RECENT + QUICK ACTIONS ================= */}

        <section className="dashboard-content-grid">

          {/* RECENT ANALYSES */}

          <div className="dashboard-left">

            <section className="recent-card">

              <div className="card-header">

                <div className="card-title">

                  <div className="small-card-icon">
                    <FileText size={19} />
                  </div>

                  <div>
                    <h2>Recent Analyses</h2>

                    <p>
                      Your latest EEG analyses
                    </p>
                  </div>

                </div>


                <button className="view-all" onClick={() => setPage("reports")}>
                  View All
                  <ChevronRight size={15} />
                </button>

              </div>


              <div className="analysis-table">

                <div className="table-header">

                  <span>#</span>
                  <span>Patient Name</span>
                  <span>Date</span>
                  <span>Recording</span>
                  <span>Result</span>
                  <span>Report</span>

                </div>


                {/* CONDITIONAL RENDERING FOR RECENT ANALYSES */}
                {recentAnalyses.length > 0 ? (
                  recentAnalyses.map((rep, index) => (
                    <div key={index} className="table-row" style={{ display: "grid", gridTemplateColumns: "0.5fr 2fr 1.5fr 1.5fr 2fr 1fr", padding: "12px 16px", borderBottom: "1px solid #eee", alignItems: "center", fontSize: "14px" }}>
                      <span>{index + 1}</span>
                      <span style={{ fontWeight: "bold", color: "#1A3C34" }}>{rep.patientName || "Unknown"}</span>
                      <span style={{ color: "#718096" }}>{new Date(rep.date).toLocaleDateString()}</span>
                      <span style={{ color: "#718096", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{rep.filename || "N/A"}</span>
                      <span style={{ fontWeight: "bold", color: rep.isSeizure ? "#d9534f" : "#37645E" }}>
                        {rep.resultLabel}
                      </span>
                      <span 
                        onClick={() => setPage("reports")} 
                        style={{ color: "#37645E", cursor: "pointer", textDecoration: "underline", fontWeight: "bold" }}
                      >
                        View
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-analysis">
                    <FileText size={32} />
                    <strong>No analyses yet</strong>
                    <p>Upload an EEG recording to see your recent analyses here.</p>
                  </div>
                )}

              </div>

            </section>

          </div>


          {/* QUICK ACTIONS */}

          <div className="dashboard-right">

            <section className="side-card">

              <h2>
                Quick Actions
              </h2>


              <button className="quick-action">

                <div>
                  <UserPlus size={18} />
                  <span>Add New Patient</span>
                </div>

                <ChevronRight size={17} />

              </button>


              <button className="quick-action" onClick={() => setPage("reports")}>

                <div>
                  <FileText size={18} />
                  <span>View Reports</span>
                </div>

                <ChevronRight size={17} />

              </button>


              <button className="quick-action" onClick={() => setPage("history")}>

                <div>
                  <History size={18} />
                  <span>Analysis History</span>
                </div>

                <ChevronRight size={17} />

              </button>


              <button className="quick-action" onClick={() => setPage("profile")}>

                <div>
                  <UserRound size={18} />
                  <span>Manage Profile</span>
                </div>

                <ChevronRight size={17} />

              </button>

            </section>

          </div>

        </section>


        {/* ================= CLINICAL NOTICE ================= */}

        <div className="clinical-notice">

          <div className="notice-icon">
            <ShieldCheck size={19} />
          </div>

          <div>

            <strong>
              AI-Assisted Clinical Support
            </strong>

            <p>
              Analysis results are intended to support
              professional review and should not replace
              clinical judgment or diagnosis.
            </p>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Dashboard;