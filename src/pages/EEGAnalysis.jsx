import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Cpu, FileText, Layers3, Minus, Play, Plus,
  RotateCcw, ShieldCheck, SlidersHorizontal, Square, Upload,
  Waves, XCircle,
} from "lucide-react";

export default function EEGAnalysis({ setPage, onBack }) {
  const [patient, setPatient] = useState({
    name: "",
    patientId: "",
    age: "",
    gender: "",
    description: "",
  });

  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBack = () => {
    if (onBack) return onBack();
    if (setPage) setPage("dashboard");
  };

  const handlePatientChange = (e) => {
    const { name, value } = e.target;
    setPatient((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setError("");
    if (!selectedFile.name.toLowerCase().endsWith(".edf")) {
      setError("Please select a valid EDF EEG file.");
      return;
    }
    if (selectedFile.size > 500 * 1024 * 1024) {
      setError("File size must be less than 500 MB.");
      return;
    }
    setFile(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload an EDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_name", patient.name);
      formData.append("patient_id", patient.patientId);
      formData.append("age", patient.age);
      formData.append("gender", patient.gender);
      formData.append("description", patient.description);

      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "EEG analysis failed.");
      }

      const data = await response.json();
      setAnalysisResult(data);
      
      // Save Report to Local Storage (For Reports Page)
      if (patient.name && patient.patientId) {
        const savedReports = JSON.parse(localStorage.getItem("neurosense_reports") || "[]");
        const newReport = {
          patientName: patient.name,
          patientId: patient.patientId,
          age: patient.age,
          gender: patient.gender,
          description: patient.description,
          date: new Date().toISOString(),
          filename: data.filename,
          resultLabel: data.prediction_label,
          probability: data.prediction_probability,
          threshold: data.threshold_used,
          isSeizure: data.prediction === 1,
          modelUsed: data.model_used,
          clinical_data: data.clinical_data // <-- Added this!
        };
        savedReports.unshift(newReport);
        localStorage.setItem("neurosense_reports", JSON.stringify(savedReports));

        // ====================================================
        // NEW: Save Patient to Local Storage (For Patients Page)
        // ====================================================
        const savedPatients = JSON.parse(localStorage.getItem("neurosense_patients") || "[]");
        const exists = savedPatients.find(p => p.patientId === patient.patientId);
        if (!exists) {
          savedPatients.unshift({
            name: patient.name,
            patientId: patient.patientId,
            age: patient.age,
            gender: patient.gender,
            description: patient.description,
            registrationDate: new Date().toISOString()
          });
          localStorage.setItem("neurosense_patients", JSON.stringify(savedPatients));
        }
        // ====================================================
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to connect to the NeuroSense backend.");
    } finally {
      setLoading(false);
    }
  };

  if (analysisResult) {
    return <EEGWorkspace result={analysisResult} file={file} patient={patient} onBack={handleBack} />;
  }

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div className="analysis-brand">
          <div className="brand-icon"><Activity size={24} /></div>
          <div>
            <h2>NeuroSense</h2>
            <span>AI-Assisted EEG Analysis</span>
          </div>
        </div>
        <button className="analysis-back-button" onClick={handleBack}>
          <ArrowLeft size={17} /> Back to Dashboard
        </button>
      </header>

      <main className="analysis-main">
        <div className="analysis-page-title">
          <div className="analysis-title-icon"><Waves size={25} /></div>
          <div>
            <p>NEW EEG ANALYSIS</p>
            <h1>Analyze EEG Recording</h1>
            <span>Upload an EDF recording for AI-assisted EEG analysis.</span>
          </div>
        </div>

        <div className="analysis-form">
          <section className="analysis-card">
            <div className="analysis-card-heading">
              <div className="card-heading-icon"><Activity size={19} /></div>
              <div>
                <h2>Patient Information</h2>
                <p>Enter the patient details for this EEG analysis.</p>
              </div>
            </div>

            <div className="patient-form-grid">
              <div className="analysis-field">
                <label>Patient Name</label>
                <div className="analysis-input">
                  <Activity size={17} />
                  <input name="name" value={patient.name} onChange={handlePatientChange} placeholder="Enter patient name" />
                </div>
              </div>
              <div className="analysis-field">
                <label>Patient ID</label>
                <div className="analysis-input">
                  <FileText size={17} />
                  <input name="patientId" value={patient.patientId} onChange={handlePatientChange} placeholder="Enter patient ID" />
                </div>
              </div>
              <div className="analysis-field">
                <label>Age</label>
                <div className="analysis-input">
                  <input type="number" name="age" value={patient.age} onChange={handlePatientChange} placeholder="Age" />
                </div>
              </div>
              <div className="analysis-field">
                <label>Gender</label>
                <div className="analysis-input">
                  <select name="gender" value={patient.gender} onChange={handlePatientChange}>
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="analysis-field full-width">
                <label>Clinical Description</label>
                <textarea name="description" value={patient.description} onChange={handlePatientChange} placeholder="Optional clinical notes..." />
              </div>
            </div>
          </section>

          <section className="analysis-card">
            <div className="analysis-card-heading">
              <div className="card-heading-icon"><Upload size={19} /></div>
              <div>
                <h2>EEG Recording</h2>
                <p>Upload the patient's EDF recording.</p>
              </div>
            </div>

            {!file ? (
              <label className="edf-upload-area" htmlFor="edf-file">
                <div className="upload-circle"><Upload size={26} /></div>
                <h3>Upload EDF File</h3>
                <p>Drag and drop or select an EEG recording</p>
                <span>EDF format • Maximum 500 MB</span>
                <input id="edf-file" type="file" accept=".edf" className="file-input" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="selected-file">
                <div className="selected-file-icon"><FileText size={21} /></div>
                <div className="selected-file-info">
                  <strong>{file.name}</strong>
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div className="file-valid"><CheckCircle2 size={15} /> Ready</div>
                <button className="remove-file" onClick={() => setFile(null)} type="button">
                  <XCircle size={18} />
                </button>
              </div>
            )}

            {error && (
              <div className="analysis-error">
                <XCircle size={17} />
                <span>{error}</span>
              </div>
            )}
          </section>

          <div className="analysis-actions">
            <button className="cancel-analysis" onClick={handleBack} type="button">Cancel</button>
            <button className="start-analysis-button" onClick={handleAnalyze} disabled={loading || !file} type="button">
              {loading ? <><span className="button-spinner" /> Processing EEG...</> : <><Activity size={17} /> Start EEG Analysis</>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// THE WORKSPACE AND WAVE GRAPHS ARE BELOW (RESTORED)
// ============================================================

function EEGWorkspace({ result, file, patient, onBack }) {
  const channels = result.channels || [];
  const originalSignal = result.original_signal || [];
  const d3Signal = result.coif1_d3 || [];
  const d4Signal = result.coif1_d4 || [];
  const d5Signal = result.coif1_d5 || [];
  const featureMatrix = result.feature_matrix || [];
  
  const samplingRate = Number(result.sampling_rate || 256);
  const sampleCount = Number(result.window_samples || originalSignal?.[0]?.length || 1024);
  // Use the new duration sent by the backend, fallback to 4 seconds
  const duration = Number(result.duration_seconds || (sampleCount / samplingRate) || 4);

  const [activeTab, setActiveTab] = useState("original");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [windowSpan, setWindowSpan] = useState(4);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waveletType, setWaveletType] = useState("D3");
  const animationRef = useRef(null);

  useEffect(() => {
    if (!playing) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    const start = performance.now();
    const animate = (now) => {
      const elapsed = (now - start) / 1000;
      const next = Math.min(elapsed, duration);
      setCurrentTime(next);
      if (next >= duration) {
        setPlaying(false);
        return;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, duration]);

  const visibleChannels = selectedChannel === "all" ? channels : [selectedChannel];

  const getSignal = (type = "original") => {
    if (type === "D3") return d3Signal;
    if (type === "D4") return d4Signal;
    if (type === "D5") return d5Signal;
    return originalSignal;
  };

  const moveTime = (amount) => setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + amount)));
  
  const resetViewer = () => {
    setCurrentTime(0);
    setScale(1);
    setZoom(1);
    setSelectedChannel("all");
    setWindowSpan(4);
    setPlaying(false);
  };

  const activeSignal = activeTab === "wavelet" ? getSignal(waveletType) : originalSignal;

  return (
    <div className="eeg-viewer-page">
      <header className="eeg-viewer-header">
        <div className="eeg-viewer-brand">
          <div className="eeg-viewer-brand-icon"><Activity size={22} /></div>
          <div>
            <h1>NeuroSense</h1>
            <span>AI-Assisted EEG Analysis</span>
          </div>
        </div>
        <div className="eeg-header-actions">
          <div className="dataset-pill"><ShieldCheck size={16} /> CHB-MIT EEG • {samplingRate} Hz</div>
          <div className="pipeline-pill"><Cpu size={16} /> Coif1 Wavelet Pipeline</div>
          <button className="viewer-back-button" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        </div>
      </header>

      <main className="eeg-viewer-main">
        <div className="viewer-status-grid">
          <StatusCard
            icon={<FileText size={19} />}
            title="Recording Status"
            value={file?.name || "EDF Recording"}
            description={`Duration: ${duration.toFixed(1)}s • Rate: ${samplingRate} Hz • Channels: ${channels.length}`}
            status="EDF Loaded"
            success
          />
          <StatusCard
            icon={<SlidersHorizontal size={19} />}
            title="Filtering Pipeline"
            value="Preprocessing"
            description="Coif1 wavelet decomposition and feature extraction"
            status="Available"
            success
          />
          <StatusCard
            icon={<Cpu size={19} />}
            title="ML Classifier"
            value={result.prediction_label || "Model Prediction"}
            description={`Mamba Model (${result.model_used || "chb01"})`}
            status="Connected"
            success
          />
        </div>

        <section className="eeg-control-panel">
          <div className="viewer-controls-row">
            <div className="channel-control">
              <label><Layers3 size={16} /> Channel</label>
              <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
                <option value="all">All 23 Channels (Stacked Montage)</option>
                {channels.map((channel) => (
                  <option key={channel} value={channel}>Single Channel: {channel}</option>
                ))}
              </select>
            </div>
            <div className="window-control">
              <span>Window Span</span>
              <div className="control-buttons">
                {[4, 10, 30, 60].map((value) => (
                  <button key={value} className={windowSpan === value ? "active" : ""} onClick={() => setWindowSpan(value)}>{value}s</button>
                ))}
              </div>
            </div>
            <div className="scale-control">
              <span>Scale</span>
              <div className="control-buttons">
                {[0.5, 1, 2, 5].map((value) => (
                  <button key={value} className={scale === value ? "active" : ""} onClick={() => setScale(value)}>{value}x</button>
                ))}
              </div>
            </div>
          </div>

          <div className="viewer-secondary-controls">
            <div className="zoom-controls">
              <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} title="Zoom in"><Plus size={17} /></button>
              <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} title="Zoom out"><Minus size={17} /></button>
              <button onClick={resetViewer} title="Reset viewer"><RotateCcw size={16} /></button>
            </div>
            <div className="playback-controls">
              <button onClick={() => moveTime(-10)}>« -10s</button>
              <button onClick={() => moveTime(-1)}><ChevronLeft size={15} /> -1s</button>
              <button className={playing ? "play-button playing" : "play-button"} onClick={() => setPlaying((prev) => !prev)}>
                {playing ? <><Square size={15} /> Pause Sweep</> : <><Play size={15} /> Play Sweep</>}
              </button>
              <button onClick={() => moveTime(1)}>+1s <ChevronRight size={15} /></button>
              <button onClick={() => moveTime(10)}>+10s »</button>
            </div>
            <div className="time-display">{formatTime(currentTime)}</div>
          </div>

          <div className="timeline-row">
            <span>0:00.0</span>
            <input type="range" min="0" max={duration} step="0.01" value={currentTime} onChange={(e) => setCurrentTime(Number(e.target.value))} />
            <span>{formatTime(duration)}</span>
          </div>
        </section>

        <section className="eeg-monitor">
          <div className="monitor-header">
            <div>
              <span className="monitor-label">LIVE EEG VIEWER</span>
              <h2>
                {activeTab === "original" ? "Original EEG Signal" : activeTab === "wavelet" ? `${waveletType} Wavelet Reconstruction` : activeTab === "features" ? "Feature Extraction" : "AI Analysis Result"}
              </h2>
            </div>
            <div className="monitor-scale">Scale: ±100µV / slot ({scale}x)</div>
          </div>

          {activeTab === "original" && (
            <EEGMontage signals={activeSignal} channels={visibleChannels} allChannels={channels} scale={scale} zoom={zoom} windowSpan={windowSpan} samplingRate={samplingRate} />
          )}

          {activeTab === "wavelet" && (
            <div className="wavelet-view">
              <div className="wavelet-tabs">
                {["D3", "D4", "D5"].map((type) => (
                  <button key={type} className={waveletType === type ? "active" : ""} onClick={() => setWaveletType(type)}>{type}</button>
                ))}
              </div>
              <div className="wavelet-info-strip">
                <Activity size={16} />
                <span>Coif1 reconstructed detail component — {waveletType}</span>
              </div>
              <EEGMontage signals={getSignal(waveletType)} channels={visibleChannels} allChannels={channels} scale={scale} zoom={zoom} windowSpan={windowSpan} samplingRate={samplingRate} />
            </div>
          )}

          {activeTab === "features" && <FeatureMatrix featureMatrix={featureMatrix} channels={channels} />}
          {activeTab === "ai" && <AIResult result={result} />}
        </section>

        <div className="eeg-view-tabs">
          <button className={activeTab === "original" ? "active" : ""} onClick={() => setActiveTab("original")}><Waves size={17} /> Original EEG</button>
          <button className={activeTab === "wavelet" ? "active" : ""} onClick={() => setActiveTab("wavelet")}><Activity size={17} /> Coif1 Wavelets</button>
          <button className={activeTab === "features" ? "active" : ""} onClick={() => setActiveTab("features")}><Layers3 size={17} /> Features</button>
          <button className={activeTab === "ai" ? "active" : ""} onClick={() => setActiveTab("ai")}><Cpu size={17} /> AI Result</button>
        </div>
      </main>
    </div>
  );
}

function StatusCard({ icon, title, value, description, status, success = false }) {
  return (
    <div className="viewer-status-card">
      <div className="status-card-top">
        <div className="status-card-title">{icon}<span>{title}</span></div>
        <div className={success ? "status-pill success" : "status-pill"}>
          {success ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
          {status}
        </div>
      </div>
      <strong>{value}</strong>
      <p>{description}</p>
    </div>
  );
}

function EEGMontage({ signals, channels, allChannels, scale, zoom, windowSpan, samplingRate }) {
  const width = 1200;
  const rowHeight = channels.length <= 1 ? 190 : 55;
  const height = Math.max(300, channels.length * rowHeight);
  const paddingLeft = 92;
  const usableWidth = width - paddingLeft - 25;

  // Calculate how many points to show based on the selected windowSpan
  const maxPointsToShow = windowSpan * samplingRate;

  return (
    <div className="eeg-montage-scroll" style={{ overflowX: zoom > 1 ? "auto" : "hidden" }}>
      <svg className="eeg-montage" viewBox={`0 0 ${width} ${height}`} width={width * zoom} height={height}>
        <defs>
          <pattern id="eegGrid" width="50" height="20" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 20" fill="none" stroke="#E1E6DF" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect x={paddingLeft} y="0" width={usableWidth} height={height} fill="url(#eegGrid)" />

        {channels.map((channel, index) => {
          const originalIndex = allChannels.indexOf(channel);
          let data = [];
          if (signals && signals.length > 0) { data = signals[originalIndex] || signals[index] || []; }
          
          // Slice the data array to only show the selected window span!
          if (data.length > maxPointsToShow) {
            data = data.slice(0, maxPointsToShow);
          }

          const centerY = index * rowHeight + rowHeight / 2;
          const path = createWavePath(data, paddingLeft, centerY, usableWidth, rowHeight * 0.34, scale);

          return (
            <g key={channel}>
              <text x="12" y={centerY + 4} className="eeg-channel-label">{channel}</text>
              <line x1={paddingLeft} y1={centerY} x2={width - 25} y2={centerY} stroke="#D3DAD2" strokeWidth="0.7" />
              {path && <path d={path} fill="none" stroke={index % 2 === 0 ? "#37645E" : "#587A72"} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function createWavePath(data, left, centerY, width, amplitude, scale) {
  if (!data || data.length === 0) return "";
  const maxPoints = Math.min(data.length, 1200);
  const skip = Math.max(1, Math.floor(data.length / maxPoints));
  let path = "";
  let pointIndex = 0;

  for (let i = 0; i < data.length; i += skip) {
    const value = Number(data[i]) || 0;
    const x = left + (i / Math.max(1, data.length - 1)) * width;
    const normalized = Math.max(-1, Math.min(1, value / 100));
    const y = centerY - normalized * amplitude * scale;

    if (pointIndex === 0) path += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    else path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    pointIndex++;
  }
  return path;
}

function FeatureMatrix({ featureMatrix, channels }) {
  if (!featureMatrix || featureMatrix.length === 0) {
    return (
      <div className="empty-view">
        <Layers3 size={38} />
        <h3>Feature matrix not available</h3>
        <p>Feature extraction data was not returned by the backend.</p>
      </div>
    );
  }

  return (
    <div className="feature-view">
      <div className="feature-summary">
        <div><span>Slices</span><strong>{featureMatrix.length}</strong></div>
        <div><span>Features / Slice</span><strong>{featureMatrix[0]?.length || 69}</strong></div>
        <div><span>Matrix</span><strong>{featureMatrix.length} × {featureMatrix[0]?.length || 69}</strong></div>
      </div>

      <div className="feature-table-wrapper">
        <table className="feature-table">
          <thead>
            <tr>
              <th>Slice</th>
              {Array.from({ length: featureMatrix[0]?.length || 69 }, (_, index) => (
                <th key={index}>F{index + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureMatrix.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>Slice {rowIndex + 1}</td>
                {row.map((value, index) => (
                  <td key={index}>{Number(value).toFixed(4)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AIResult({ result }) {
  const prediction = result?.prediction_label || "Unknown";
  const confidence = result?.prediction_probability !== undefined ? result.prediction_probability : null;
  const isSeizure = result?.prediction === 1;

  return (
    <div className="ai-result-view">
      <div className="ai-result-icon" style={{ color: isSeizure ? "#d9534f" : "#37645E" }}>
        <Cpu size={34} />
      </div>
      <span className="ai-result-label">MAMBA AI CLASSIFIER</span>
      
      <h2 style={{ color: isSeizure ? "#d9534f" : "#37645E" }}>
        {prediction}
      </h2>

      {confidence !== null && (
        <p style={{ fontSize: "18px", fontWeight: "bold" }}>
          Probability: {(Number(confidence) * 100).toFixed(2)}%
        </p>
      )}

      <p style={{ fontSize: "14px", color: "#666" }}>
        Model: {result?.model_used || "Mamba"} <br />
        Threshold: {result?.threshold_used || "0.25"}
      </p>

      <div className="ai-pending-box" style={{ borderColor: isSeizure ? "#d9534f" : "#37645E" }}>
        {isSeizure ? <XCircle size={18} style={{ color: "#d9534f" }} /> : <CheckCircle2 size={18} style={{ color: "#37645E" }} />}
        <span>
          {isSeizure 
            ? "Seizure activity detected by the Mamba model. Please review the raw EEG."
            : "No seizure activity detected by the Mamba model."}
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toFixed(1).padStart(4, "0")}`;
}