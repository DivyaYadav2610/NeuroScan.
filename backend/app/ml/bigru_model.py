# app/ml/bigru_model.py
"""
Bi-GRU model — faithful to Zhang et al. 2022 (IEEE TNSRE).
Input : (batch, 8, 69)   -> 8 time slices x 69 features
Output: (batch, 1)       -> sigmoid P(seizure)
"""
import tensorflow as tf
from tensorflow.keras import layers, Model, regularizers


def build_bigru_model(
    n_slices: int = 8,
    n_features: int = 69,
    hidden_dim: int = 128,     # paper: 2-3x input dim (69 -> 138-207); 128 is fine
    dropout: float = 0.3,
    l2: float = 1e-4,
):
    inp = layers.Input(shape=(n_slices, n_features), name="eeg")

    # ---- Bidirectional GRU layer 1 (forward + backward) ----
    x = layers.Bidirectional(
        layers.GRU(
            hidden_dim,
            return_sequences=True,
            dropout=dropout,
            kernel_regularizer=regularizers.l2(l2),
        ),
        merge_mode="concat",
        name="bigru_1",
    )(inp)

    # ---- Bidirectional GRU layer 2 ----
    x = layers.Bidirectional(
        layers.GRU(
            hidden_dim // 2,
            return_sequences=False,
            dropout=dropout,
            kernel_regularizer=regularizers.l2(l2),
        ),
        merge_mode="concat",
        name="bigru_2",
    )(x)

    # ---- Dense classifier head ----
    x = layers.Dense(64, activation="relu",
                     kernel_regularizer=regularizers.l2(l2))(x)
    x = layers.Dropout(dropout)(x)
    out = layers.Dense(1, activation="sigmoid", name="prob")(x)

    model = Model(inp, out, name="BiGRU_SeizureDetector")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=[
            tf.keras.metrics.AUC(name="auc"),
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
        ],
    )
    return model