# app/pdf/report.py
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from datetime import datetime
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def _plot_prob_curve(result, out_path):
    wins  = result["windows"]
    times = [w["start_sec"] / 60 for w in wins]
    probs = result["smoothed_probs"]
    thr   = result["threshold"]

    fig, ax = plt.subplots(figsize=(10, 3))
    ax.plot(times, probs, color="#1f77b4", lw=1.2, label="Seizure probability")
    ax.axhline(thr, color="red", ls="--", lw=1, label=f"Threshold ({thr:.2f})")
    for s, e in result["seizure_events"]:
        ax.axvspan(s/60, e/60, color="red", alpha=0.15)
    ax.set_xlabel("Time (minutes)")
    ax.set_ylabel("P(seizure)")
    ax.set_ylim(-0.05, 1.05)
    ax.legend(loc="upper right", fontsize=8)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)


def generate_pdf_report(result, patient, out_path):
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"],
                        textColor=colors.HexColor("#0B3D91"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"],
                        textColor=colors.HexColor("#0B3D91"))
    body = styles["BodyText"]

    doc = SimpleDocTemplate(
        str(out_path), pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=1.8*cm,  bottomMargin=1.8*cm,
    )

    story = []
    story.append(Paragraph("NeuroSense — EEG Seizure Analysis Report", h1))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("1. Patient Information", h2))
    info = [
        ["Patient ID",   patient["id"]],
        ["Patient Name", patient["name"]],
        ["Age",          str(patient["age"])],
        ["Gender",       patient["gender"]],
        ["Notes",        patient.get("notes") or "—"],
    ]
    t = Table(info, colWidths=[4*cm, 12*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EAF0FB")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.grey),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("2. EEG Recording Summary", h2))
    summary = [
        ["File",              result["file"]],
        ["Duration",          f"{result['duration_sec']/60:.2f} minutes"],
        ["Windows analyzed",  str(len(result["windows"]))],
        ["Detected seizures", str(result["n_seizures"])],
        ["Mean probability",  f"{result['mean_prob']*100:.2f}%"],
    ]
    t = Table(summary, colWidths=[4*cm, 12*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EAF0FB")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.grey),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("3. Seizure Probability Timeline", h2))
    plot_path = out_path.parent / f"{out_path.stem}_plot.png"
    _plot_prob_curve(result, plot_path)
    story.append(Image(str(plot_path), width=17*cm, height=5.5*cm))
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("4. Detected Seizure Events", h2))
    if result["seizure_events"]:
        rows = [["#", "Start (min)", "End (min)", "Duration (s)"]]
        for i, (s, e) in enumerate(result["seizure_events"], 1):
            rows.append([str(i), f"{s/60:.2f}", f"{e/60:.2f}", f"{e-s:.1f}"])
        t = Table(rows, colWidths=[1.5*cm, 4*cm, 4*cm, 4*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0B3D91")),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
            ("GRID",       (0,0), (-1,-1), 0.4, colors.grey),
            ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("No seizure events detected.", body))

    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("5. Model Details", h2))
    model_info = [
        ["Architecture", "Bidirectional GRU (Zhang et al. 2022, adapted)"],
        ["Wavelet",      "coif1, level 5 (scales 3,4,5)"],
        ["Features",     "8 slices × 69 features = 552 per window"],
        ["Window",       "4 s with 25% overlap"],
        ["Threshold",    f"{result['threshold']:.4f} (Youden's J on test)"],
    ]
    t = Table(model_info, colWidths=[4*cm, 12*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EAF0FB")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.grey),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.8*cm))

    story.append(Paragraph(
        "<i>Disclaimer: This report is generated by an AI model and is "
        "intended to assist, not replace, clinical judgment.</i>", body))

    doc.build(story)
    return out_path