import React from "react";
import { useAudioReactive } from "./AudioReactiveProvider";

export default function AudioControls() {
  const {
    enabled,
    setEnabled,
    isReady,
    isPlaying,
    volume,
    setVolume,
    toggle,
    features,
  } = useAudioReactive();

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 9999,
        padding: "12px 12px",
        borderRadius: "12px",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        color: "white",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        width: 260,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button
          onClick={() => toggle()}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: "pointer",
            flex: 1,
          }}
        >
          {isPlaying ? "Pause Audio" : "Play Audio"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Reactive
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12, opacity: 0.85 }}>Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>
        <div>Audio graph: {isReady ? "ready" : "not ready"}</div>
        <div>rms: {features.rms.toFixed(3)} | onset: {features.onset ? "✓" : "-"}</div>
        <div>low: {features.low.toFixed(3)} mid: {features.mid.toFixed(3)} high: {features.high.toFixed(3)}</div>
        <div>centroid: {features.centroid.toFixed(3)}</div>
      </div>
    </div>
  );
}
