import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import { getMyzelPresetWitnessHue } from './myzelNodeSpatialConfig';
import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes';

type MyzelRoom3CanvasCursor = { x: number; y: number; vx: number; vy: number };

export function renderMyzelRoom3Canvas(args: {
  ctx: CanvasRenderingContext2D;
  nodes: SemanticNode[];
  cursor: MyzelRoom3CanvasCursor;
  width: number;
  height: number;
  spatialFieldProbe: MyzelSpatialFieldProbe;
  selectedResidentId: string | null;
}) {
  const { ctx: c, nodes, cursor: cur, width, height, spatialFieldProbe, selectedResidentId } = args;
  c.fillStyle = '#0a0a0c';
  c.fillRect(0, 0, width, height);

  const nodeWitnessById = new Map(spatialFieldProbe.nodeConfigs.map((entry) => [entry.id, entry]));

  spatialFieldProbe.nodeConfigs.forEach((entry) => {
    const hue = getMyzelPresetWitnessHue(entry.config.presetId);
    const auraRadius = Math.max(34, Math.min(190, entry.config.auraRadius));
    const alpha = 0.022 + entry.energy * 0.042;
    c.beginPath();
    c.arc(entry.x, entry.y, auraRadius, 0, Math.PI * 2);
    c.fillStyle = `hsla(${hue}, 78%, 58%, ${alpha})`;
    c.fill();
    c.strokeStyle = `hsla(${hue}, 82%, 64%, ${0.07 + entry.energy * 0.12})`;
    c.lineWidth = 0.75;
    c.stroke();
  });

  c.strokeStyle = 'rgba(255,255,255,0.035)';
  c.lineWidth = 1;
  nodes.forEach((n1, i) => {
    nodes.slice(i + 1).forEach((n2) => {
      const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
      if (d < 200) {
        c.beginPath();
        c.moveTo(n1.x, n1.y);
        c.lineTo(n2.x, n2.y);
        c.stroke();
      }
    });
  });

  spatialFieldProbe.ball.activeRelations.forEach((relation) => {
    const nodeA = nodeWitnessById.get(relation.nodeAId);
    const nodeB = nodeWitnessById.get(relation.nodeBId);
    if (!nodeA || !nodeB) return;
    const hueA = getMyzelPresetWitnessHue(relation.presetA);
    const hueB = getMyzelPresetWitnessHue(relation.presetB);
    const hue = (hueA + hueB) / 2;
    const alpha = Math.min(0.78, 0.12 + relation.tension * 0.68);
    c.strokeStyle = `hsla(${hue}, 90%, 68%, ${alpha})`;
    c.lineWidth = 0.8 + relation.tension * 3.2;
    c.beginPath();
    c.moveTo(nodeA.x, nodeA.y);
    c.lineTo(nodeB.x, nodeB.y);
    c.stroke();
  });

  nodes.forEach((node) => {
    const isMuted = !!node.residentMuted;
    const radius = 4 + node.energy * 25;
    c.beginPath();
    c.arc(node.x, node.y, radius, 0, Math.PI * 2);
    const r = 100 + node.energy * 155;
    const g = 100 + node.energy * 100;
    const b = 200 - node.energy * 150;
    const a = (isMuted ? 0.12 : 0.3) + node.energy * (isMuted ? 0.18 : 0.5);
    c.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    c.fill();
    if (selectedResidentId && (node.residentId ?? node.label) === selectedResidentId) {
      c.strokeStyle = isMuted ? 'rgba(180,180,180,0.35)' : 'rgba(255,255,255,0.65)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = isMuted ? 'rgba(220,220,220,0.38)' : 'rgba(255,255,255,0.75)';
    c.font = '10px monospace';
    c.fillText(node.label, node.x + 10, node.y - 10);
    const nodeWitness = nodeWitnessById.get(node.residentId ?? node.label);
    if (nodeWitness) {
      const hue = getMyzelPresetWitnessHue(nodeWitness.config.presetId);
      c.fillStyle = isMuted ? 'rgba(220,220,220,0.28)' : `hsla(${hue}, 88%, 72%, 0.62)`;
      c.font = '9px monospace';
      c.fillText(nodeWitness.config.effectLabel, node.x + 10, node.y + 2);
    }
  });

  const ballAuraRadius = 14 + spatialFieldProbe.ball.voidPressure * 28 + spatialFieldProbe.ball.relationTension * 24;
  c.beginPath();
  c.arc(cur.x, cur.y, ballAuraRadius, 0, Math.PI * 2);
  c.fillStyle = `rgba(255,255,255,${0.025 + spatialFieldProbe.ball.relationTension * 0.12})`;
  c.fill();
  c.strokeStyle = `rgba(255,255,255,${0.12 + spatialFieldProbe.ball.voidPressure * 0.18})`;
  c.lineWidth = 0.9;
  c.stroke();

  c.beginPath();
  c.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
  c.fillStyle = '#fff';
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.moveTo(cur.x, cur.y);
  c.lineTo(cur.x - cur.vx * 6, cur.y - cur.vy * 6);
  c.stroke();
}
