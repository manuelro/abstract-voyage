import { useMemo, useState } from 'react';
import {
  ConfigScopeList,
  createConfigScopeBinding,
  useConfigPanelBindings,
} from '../components/Panel/config';
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel';
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility';
import { CUBE_FACE_ROTATIONS, CubeNavigator } from '../components/CubeNavigator';
import {
  DEFAULT_CUBE_LAB_CONFIG,
  normalizeCubeLabConfig,
  type CubeLabConfig,
} from './cube-lab.config';
import { CUBE_LAB_PANEL } from './cube-lab.panel';
import styles from './cube-lab.module.css';

// Isolated harness for the same CubeNavigator used by MobileNavCube. This
// page keeps all six diagnostic faces and manual controls; the production
// navigation supplies the abstract page as A and the menu as E.

const FACE_WIDTH_VW = 20;
// The cuboid's own real, predefined height — shared, unchanged, by EVERY
// face's geometry (B/C/D/A's own inset:0 sizing at rest, E/F's own
// translateZ(height/2) seam math) regardless of how tall face A's content
// is. Face A is the one deliberate exception: at rest it's allowed to grow
// past this value (see .faceA/.faceAMeasure in cube-lab.module.css), but
// that overflow is local to A alone — it never feeds back into this
// constant, and every other face stays exactly this size at all times.
const FACE_HEIGHT_VW = FACE_WIDTH_VW * 2;

function applySelectedFace(config: CubeLabConfig): CubeLabConfig {
  if (config.faceTheCameraSelection === 'none') return config;
  const preset = CUBE_FACE_ROTATIONS[config.faceTheCameraSelection];
  return { ...config, rotateXDeg: preset.x, rotateYDeg: preset.y };
}

function createDefaultCubeLabConfig(): CubeLabConfig {
  return applySelectedFace(normalizeCubeLabConfig(DEFAULT_CUBE_LAB_CONFIG));
}

// Mock figures — tall enough (well past any reasonable faceHeightVh) to
// force real overflow inside face A's own content area, so the scroll/
// freeze behavior below has something genuine to demonstrate, not an
// empty box that merely claims to scroll.
const MOCK_FACE_A_METRICS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Monthly active users', value: '48,204' },
  { label: 'Sessions per user', value: '3.2' },
  { label: 'Median session length', value: '6m 41s' },
  { label: 'Conversion rate', value: '2.8%' },
  { label: 'Revenue (30d)', value: '$128,430' },
  { label: 'Revenue per user', value: '$2.66' },
  { label: 'Churn rate', value: '1.4%' },
  { label: 'Support tickets', value: '312' },
  { label: 'Avg. response time', value: '4h 12m' },
  { label: 'CSAT score', value: '4.6 / 5' },
  { label: 'New signups (7d)', value: '2,041' },
  { label: 'Activation rate', value: '61%' },
  { label: 'API requests (24h)', value: '1.9M' },
  { label: 'Error rate', value: '0.03%' },
  { label: 'p95 latency', value: '212ms' },
  { label: 'Uptime (30d)', value: '99.97%' },
  { label: 'Storage used', value: '4.1 TB' },
  { label: 'Bandwidth (30d)', value: '18.6 TB' },
  { label: 'Active experiments', value: '7' },
  { label: 'Feature flags on', value: '23' },
];

export default function CubeLabPage() {
  const [cubeLabConfig, setCubeLabConfig] = useState(createDefaultCubeLabConfig);
  const { showAuthoringTools, isPanelOpen, togglePanel } = useAuthoringToolsVisibility();
  // Face selection is a one-shot command: it writes the corresponding
  // preset into X/Y. The sliders always drive those same values directly,
  // and moving either one clears the preset indicator back to manual.
  const handleCubeLabConfigChange = (next: typeof cubeLabConfig) => {
    const selectedFaceChanged = next.faceTheCameraSelection !== cubeLabConfig.faceTheCameraSelection;
    if (selectedFaceChanged && next.faceTheCameraSelection !== 'none') {
      setCubeLabConfig(applySelectedFace(next));
      return;
    }

    const rotatedManually = next.rotateXDeg !== cubeLabConfig.rotateXDeg
      || next.rotateYDeg !== cubeLabConfig.rotateYDeg;
    setCubeLabConfig(rotatedManually ? { ...next, faceTheCameraSelection: 'none' } : next);
  };
  const cubeLabBinding = useMemo(() => createConfigScopeBinding({
    definition: CUBE_LAB_PANEL,
    value: cubeLabConfig,
    onChange: handleCubeLabConfigChange,
  }), [cubeLabConfig]);
  const cubeLabLocalBindings = useMemo(() => [cubeLabBinding], [cubeLabBinding]);
  const configPanelBindings = useConfigPanelBindings(cubeLabLocalBindings);

  return (
    <div className={styles.page}>
      <CubeNavigator
        config={cubeLabConfig}
        rotation={{ x: cubeLabConfig.rotateXDeg, y: cubeLabConfig.rotateYDeg }}
        faceWidth={cubeLabConfig.fillViewportEnabled ? '100vw' : `${FACE_WIDTH_VW}vw`}
        faceHeight={cubeLabConfig.fillViewportEnabled ? '100dvh' : `${FACE_HEIGHT_VW}vw`}
        faces={{
          A: (
            <div className={`${styles.labFace} ${styles.faceAVisual}`}>
              <div className={styles.faceALabel}>A</div>
              <div className={styles.faceAContent}>
                {MOCK_FACE_A_METRICS.map(metric => (
                  <div key={metric.label} className={styles.faceAMetricRow}>
                    <span>{metric.label}</span>
                    <span>{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
          B: <div className={`${styles.labFace} ${styles.faceBVisual}`}>B</div>,
          C: <div className={`${styles.labFace} ${styles.faceCVisual}`}>C</div>,
          D: <div className={`${styles.labFace} ${styles.faceDVisual}`}>D</div>,
          E: <div className={`${styles.labFace} ${styles.faceEVisual}`}>E</div>,
          F: <div className={`${styles.labFace} ${styles.faceFVisual}`}>F</div>,
        }}
      />
      {showAuthoringTools ? (
        <PanelShell
          title="CUBE LAB SETTINGS"
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          headerActions={(
            <PanelStandardHeaderActions
              bindings={configPanelBindings}
              onReset={() => setCubeLabConfig(createDefaultCubeLabConfig())}
            />
          )}
        >
          <ConfigScopeList bindings={configPanelBindings} />
        </PanelShell>
      ) : null}
    </div>
  );
}
