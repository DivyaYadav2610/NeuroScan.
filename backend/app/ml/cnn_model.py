# app/ml/cnn_model.py
import tensorflow as tf
from tensorflow.keras import layers, Model, regularizers

def build_cnn_model(n_slices=8, n_features=69, dropout=0.3, l2=1e-4):
    inp = layers.Input(shape=(n_slices, n_features), name="eeg")

    x = layers.Conv1D(64, 3, padding="same",
                      kernel_regularizer=regularizers.l2(l2))(inp)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling1D(2)(x)
    x = layers.Dropout(dropout)(x)

    x = layers.Conv1D(128, 3, padding="same",
                      kernel_regularizer=regularizers.l2(l2))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dropout(dropout)(x)

    x = layers.Dense(64, activation="relu",
                     kernel_regularizer=regularizers.l2(l2))(x)
    x = layers.Dropout(dropout)(x)
    out = layers.Dense(1, activation="sigmoid", name="prob")(x)

    model = Model(inp, out, name="Coif1_1DCNN")
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