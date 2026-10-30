# app/ml/train.py
"""
Train Bi-GRU model on chb01 Coif1 features.
Usage: python -m app.ml.train
"""
import numpy as np
import tensorflow as tf
from pathlib import Path
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score,
    f1_score, confusion_matrix, roc_curve,
)
from app.ml.bigru_model import build_bigru_model   # ← Bi-GRU

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "processed" / "chb01_features_split.npz"

# Keep the SAME filename so analysis.py auto-detect still works
MODEL_OUT  = ROOT / "app" / "ml" / "best_cnn_chb01.keras"
THRESH_OUT = ROOT / "app" / "ml" / "chb01_decision_threshold.npy"

RANDOM_SEED = 42
tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

print(f"Loading {DATA_PATH}")
data = np.load(DATA_PATH, allow_pickle=True)

X_train, y_train = data["X_train"], data["y_train"]
X_val,   y_val   = data["X_val"],   data["y_val"]
X_test,  y_test  = data["X_test"],  data["y_test"]

print(f"Train: {X_train.shape} | pos = {int(y_train.sum())}")
print(f"Val  : {X_val.shape}   | pos = {int(y_val.sum())}")
print(f"Test : {X_test.shape}  | pos = {int(y_test.sum())}")

n_pos = int(y_train.sum())
n_neg = int(len(y_train) - n_pos)
class_weight = {0: 1.0, 1: n_neg / max(n_pos, 1)}
print(f"Class weight for seizure class: {class_weight[1]:.2f}")

# ---- Build Bi-GRU ----
model = build_bigru_model(
    n_slices=8,
    n_features=69,
    hidden_dim=128,
    dropout=0.3,
)
model.summary()

callbacks = [
    tf.keras.callbacks.EarlyStopping(
        monitor="val_auc", mode="max", patience=15,
        restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss", factor=0.5, patience=5,
        min_lr=1e-6, verbose=1),
    tf.keras.callbacks.ModelCheckpoint(
        str(MODEL_OUT), monitor="val_auc", mode="max",
        save_best_only=True, verbose=1),
]

history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=60,
    batch_size=128,
    class_weight=class_weight,
    callbacks=callbacks,
    verbose=1,
)

def evaluate(model, X, y, name):
    p = model.predict(X, verbose=0).ravel()
    fpr, tpr, thr = roc_curve(y, p)
    best_thr = float(thr[np.argmax(tpr - fpr)])
    pred = (p >= best_thr).astype(int)

    print(f"\n===== {name} (thr={best_thr:.4f}) =====")
    print(f"AUC      : {roc_auc_score(y, p):.4f}")
    print(f"Precision: {precision_score(y, pred, zero_division=0):.4f}")
    print(f"Recall   : {recall_score(y, pred, zero_division=0):.4f}")
    print(f"F1       : {f1_score(y, pred, zero_division=0):.4f}")
    print(f"CM       :\n{confusion_matrix(y, pred)}")
    return best_thr

evaluate(model, X_train, y_train, "TRAIN")
evaluate(model, X_val,   y_val,   "VAL")
test_thr = evaluate(model, X_test, y_test, "TEST")

np.save(THRESH_OUT, np.array([test_thr], dtype=np.float32))
print(f"\n✅ Saved model      -> {MODEL_OUT}")
print(f"✅ Saved threshold  -> {THRESH_OUT}  ({test_thr:.4f})")