import { Suspense, createContext, useContext, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Sky,
  Float,
  Sparkles,
  Html,
  Environment,
  
  MeshWobbleMaterial,
} from "@react-three/drei";
import * as THREE from "three";
import { ISLANDS } from "@/game/data";
import type { GameState } from "@/game/types";

interface IslandViewProps {
  state: GameState;
  onPlotClick: (index: number) => void;
  moveMode?: boolean;
  movingFrom?: number | null;
  lowPower?: boolean;
}

/* ============================================================
   Performance gating: skip expensive sparkles on low-power devices.
   ============================================================ */
const LowPowerContext = createContext(false);

function FxSparkles(props: React.ComponentProps<typeof Sparkles>) {
  const low = useContext(LowPowerContext);
  if (low) return null;
  return <Sparkles {...props} />;
}



/* ============================================================
   Stylized palette — bright, saturated, cartoon-premium feel
   ============================================================ */
const PALETTE = {
  oceanShallow: "#3ec5f0",
  oceanMid: "#1ea1e0",
  oceanDeep: "#0a5a9c",
  oceanFoam: "#f0fbff",
  sandLight: "#ffe7a8",
  sandDark: "#e6b769",
  grassTop: "#6fd16a",
  grassMid: "#4ab84a",
  grassDeep: "#2d8c3e",
  dirt: "#7d4a26",
  rockLight: "#b8c4d6",
  rockDark: "#5d6a85",
  woodLight: "#d99258",
  woodDark: "#6b3a1c",
  trunkBark: "#7a4a26",
  leafLight: "#7ee06a",
  leafMid: "#3aa84a",
  flowerPink: "#ff5ea0",
  flowerOrange: "#ff9a3c",
  flowerPurple: "#c870ff",
  flowerYellow: "#ffd84a",
  flowerWhite: "#ffffff",
  pathStone: "#d8d1b8",
  flagRed: "#ff3a5a",
  roofRed: "#e94b4b",
  roofBlue: "#3b8fe6",
  roofTeal: "#34c1b3",
  roofGold: "#f1c44b",
  gold: "#ffd24a",
  crystal: "#79f7e6",
};

/* ============================================================
   Plot layout
   ============================================================ */
const ISLAND_SCALE = 1.75;

// Static fallback positions (used only if grid generation yields nothing)
const FALLBACK_PLOT_POSITIONS: [number, number][] = [
  [0, 0],
  [-3.2, -1.2],
  [3.2, -1.2],
];

/** Generate a hex-like grid of placement positions across the island,
 *  removing any cell that overlaps a forbidden footprint (plants/decor). */
function generatePlotGrid(forbidden: { x: number; z: number; r: number }[]): [number, number][] {
  const positions: { p: [number, number]; d: number }[] = [];
  const spacing = 1.65;
  const maxR = 6.4;
  const rows = Math.ceil((maxR * 2) / spacing);
  for (let row = -rows; row <= rows; row++) {
    const z = row * spacing * 0.88;
    const offset = (row & 1) ? spacing / 2 : 0;
    for (let col = -rows; col <= rows; col++) {
      const x = col * spacing + offset;
      const d = Math.hypot(x, z);
      if (d > maxR) continue;
      const blocked = forbidden.some((f) => Math.hypot(x - f.x, z - f.z) < f.r);
      if (blocked) continue;
      positions.push({ p: [x, z], d });
    }
  }
  // Stable order: closer to center first
  positions.sort((a, b) => a.d - b.d);
  return positions.length > 0 ? positions.map((q) => q.p) : FALLBACK_PLOT_POSITIONS;
}

/* ============================================================
   Deterministic RNG so SSR/CSR/refresh match
   ============================================================ */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   NoHit — make a subtree invisible to raycaster so it never
   intercepts clicks meant for plots underneath.
   ============================================================ */
function NoHit({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.traverse((o) => {
      (o as THREE.Object3D & { raycast: () => void }).raycast = () => {};
    });
  });
  return <group ref={ref}>{children}</group>;
}

/* ============================================================
   Ocean — bright tropical water with foam ring
   ============================================================ */
function Ocean() {
  const ref = useRef<THREE.Mesh>(null!);
  // Lower segment count for perf; still smooth-looking waves
  const geom = useMemo(() => new THREE.PlaneGeometry(180, 180, 56, 56), []);
  const original = useMemo(() => Float32Array.from(geom.attributes.position.array), [geom]);
  const tick = useRef(0);

  useFrame(({ clock }) => {
    // Update waves every other frame to halve cost on weak devices
    tick.current++;
    if (tick.current % 2 !== 0) return;
    const t = clock.elapsedTime;
    const pos = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = original[i];
      const y = original[i + 1];
      pos[i + 2] =
        Math.sin(x * 0.22 + t * 1.1) * 0.22 +
        Math.cos(y * 0.28 + t * 0.85) * 0.18;
    }
    geom.attributes.position.needsUpdate = true;
    // Skip expensive per-frame normal recompute — flat normals + light fakes it
  });

  return (
    <group>
      {/* Deep base layer adds rich blue depth under the surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <circleGeometry args={[90, 64]} />
        <meshBasicMaterial color={PALETTE.oceanDeep} />
      </mesh>
      {/* Mid gradient ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <ringGeometry args={[10, 40, 64]} />
        <meshBasicMaterial color={PALETTE.oceanMid} transparent opacity={0.7} />
      </mesh>
      {/* Animated transparent surface */}
      <mesh ref={ref} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <meshStandardMaterial
          color={PALETTE.oceanShallow}
          roughness={0.2}
          metalness={0.15}
          transparent
          opacity={0.78}
          emissive={PALETTE.oceanShallow}
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* Foam rings around the island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
        <ringGeometry args={[8.7, 9.9, 64]} />
        <meshBasicMaterial color={PALETTE.oceanFoam} transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <ringGeometry args={[9.9, 11.4, 64]} />
        <meshBasicMaterial color={PALETTE.oceanFoam} transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

/* ============================================================
   Island base — multi-tier with rocky cliffs
   ============================================================ */
function IslandBase({ grassTint }: { grassTint: string }) {
  const rocks = useMemo(() => {
    const rng = mulberry32(7);
    return Array.from({ length: 18 }).map((_, i) => {
      const a = (i / 18) * Math.PI * 2 + rng() * 0.2;
      const r = 9.0 + rng() * 0.6;
      return {
        pos: [Math.cos(a) * r, -0.35 + rng() * 0.25, Math.sin(a) * r] as [number, number, number],
        scale: 0.7 + rng() * 0.9,
        rot: rng() * Math.PI,
      };
    });
  }, []);

  return (
    <group>
      {/* Deep underwater dirt */}
      <mesh position={[0, -1.9, 0]} receiveShadow>
        <cylinderGeometry args={[10, 11.8, 1.8, 64]} />
        <meshStandardMaterial color={PALETTE.dirt} roughness={1} />
      </mesh>
      {/* Sand beach (light) */}
      <mesh position={[0, -0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[8.9, 9.8, 0.95, 80]} />
        <meshStandardMaterial color={PALETTE.sandLight} roughness={0.95} />
      </mesh>
      {/* Sand darker rim */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[8.2, 8.9, 0.25, 80]} />
        <meshStandardMaterial color={PALETTE.sandDark} roughness={0.95} />
      </mesh>
      {/* Grass top */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[7.4, 8.2, 0.6, 80]} />
        <meshStandardMaterial color={grassTint} roughness={0.85} />
      </mesh>
      {/* Subtle deeper grass shade */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <cylinderGeometry args={[7.1, 7.4, 0.12, 80]} />
        <meshStandardMaterial color={PALETTE.grassDeep} roughness={0.9} />
      </mesh>
      {/* Rocky cliff accents removed for cleaner look */}
    </group>
  );
}

/* ============================================================
   Stone path winding across the island
   ============================================================ */
function StonePath() {
  const tiles = useMemo(() => {
    const points: [number, number][] = [
      [0, -5.5],
      [0, -3.5],
      [0.6, -2],
      [0, -0.6],
      [-0.4, 1],
      [0.2, 2.4],
      [0, 4],
      [0, 5.2],
    ];
    const out: { x: number; z: number; rot: number; s: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, z0] = points[i];
      const [x1, z1] = points[i + 1];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const k = s / steps;
        out.push({
          x: x0 + (x1 - x0) * k,
          z: z0 + (z1 - z0) * k,
          rot: Math.atan2(x1 - x0, z1 - z0),
          s: 0.35 + ((s + i) % 3) * 0.04,
        });
      }
    }
    return out;
  }, []);
  return (
    <group position={[0, 0.51, 0]}>
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, 0, t.z]} rotation={[-Math.PI / 2, 0, t.rot]} receiveShadow>
          <circleGeometry args={[t.s, 6]} />
          <meshStandardMaterial color={PALETTE.pathStone} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   Wooden fence ring on inner grass
   ============================================================ */
function FenceRing() {
  const posts = useMemo(() => {
    const arr: { p: [number, number, number]; rot: number }[] = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      arr.push({
        p: [Math.cos(a) * 7.05, 0.7, Math.sin(a) * 7.05],
        rot: -a,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {posts.map((p, i) => (
        <group key={i} position={p.p} rotation={[0, p.rot, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color={PALETTE.woodLight} roughness={0.85} />
          </mesh>
          <mesh position={[0.4, 0.05, 0]} castShadow>
            <boxGeometry args={[0.78, 0.08, 0.04]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ============================================================
   Palm tree — curved trunk, lush layered crown, coconuts
   ============================================================ */
function Palm({
  position,
  scale = 1,
  delay = 0,
}: {
  position: [number, number, number];
  scale?: number;
  delay?: number;
}) {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + delay;
    group.current.rotation.z = Math.sin(t * 1.1) * 0.05;
    group.current.rotation.x = Math.cos(t * 0.85) * 0.03;
  });
  const segments = 6;
  return (
    <group position={position} scale={scale}>
      <group ref={group}>
        {/* Curved trunk segments */}
        {Array.from({ length: segments }).map((_, i) => {
          const y = 0.25 + i * 0.42;
          const bend = Math.sin((i / segments) * Math.PI) * 0.25;
          const r = 0.22 - i * 0.022;
          return (
            <mesh key={i} position={[bend, y, 0]} rotation={[0, 0, -0.08 * i]} castShadow>
              <cylinderGeometry args={[r, r + 0.02, 0.45, 10]} />
              <meshStandardMaterial color={PALETTE.trunkBark} roughness={1} />
            </mesh>
          );
        })}
        {/* Crown of layered leaves */}
        <group position={[Math.sin(0.5) * 0.35, segments * 0.42 + 0.2, 0]}>
          {Array.from({ length: 9 }).map((_, i) => {
            const a = (i / 9) * Math.PI * 2;
            const tilt = -0.55 + ((i % 2) * 0.15);
            return (
              <group key={i} rotation={[0, a, tilt]}>
                <mesh position={[0.65, 0, 0]} castShadow>
                  <sphereGeometry args={[0.55, 10, 6]} />
                  <meshStandardMaterial color={i % 2 ? PALETTE.leafLight : PALETTE.leafMid} roughness={0.7} />
                </mesh>
                <mesh position={[1.05, -0.05, 0]} castShadow>
                  <sphereGeometry args={[0.32, 10, 6]} />
                  <meshStandardMaterial color={PALETTE.leafLight} roughness={0.7} />
                </mesh>
              </group>
            );
          })}
          {/* Coconuts */}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.3, -0.1, Math.sin(a) * 0.3]} castShadow>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshStandardMaterial color="#4a2a16" roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

/* ============================================================
   Pine-style tree variety
   ============================================================ */
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.8, 8]} />
        <meshStandardMaterial color={PALETTE.trunkBark} />
      </mesh>
      <mesh castShadow position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.7, 12, 10]} />
        <meshStandardMaterial color={PALETTE.leafMid} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.35, 1.35, 0.1]}>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color={PALETTE.leafLight} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-0.3, 1.35, -0.1]}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color={PALETTE.leafLight} roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ============================================================
   Bush, mushroom, grass tuft
   ============================================================ */
function Bush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[
        [0, 0.28, 0, 0.4],
        [0.32, 0.22, 0.12, 0.3],
        [-0.26, 0.24, -0.12, 0.32],
        [0.05, 0.5, 0.05, 0.25],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 12, 10]} />
          <meshStandardMaterial color={i % 2 ? PALETTE.leafMid : PALETTE.leafLight} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Mushroom({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.22, 8]} />
        <meshStandardMaterial color="#fff5d6" />
      </mesh>
      <mesh castShadow position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e7414a" />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.08, 0.31, Math.sin(a) * 0.08]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
    </group>
  );
}

function Flower({ position, color, delay = 0 }: { position: [number, number, number]; color: string; delay?: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.5 + delay;
    ref.current.position.y = 0.32 + Math.sin(clock.elapsedTime * 1.6 + delay) * 0.02;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.32, 5]} />
        <meshStandardMaterial color="#3a7a3a" />
      </mesh>
      <group ref={ref} position={[0, 0.34, 0]}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.5} />
            </mesh>
          );
        })}
        <mesh>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshStandardMaterial color={PALETTE.flowerYellow} emissive="#ffaa00" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Rock({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const rot = useMemo<[number, number, number]>(() => {
    const rng = mulberry32(seed + 1);
    return [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI];
  }, [seed]);
  return (
    <mesh position={position} scale={scale} castShadow rotation={rot}>
      <dodecahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial color={PALETTE.rockLight} roughness={0.95} />
    </mesh>
  );
}

/* ============================================================
   Lantern with glow
   ============================================================ */
function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.7, 8]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color={PALETTE.flowerYellow} emissive="#ffb734" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <coneGeometry args={[0.18, 0.12, 4]} />
        <meshStandardMaterial color={PALETTE.roofRed} />
      </mesh>
      <pointLight position={[0, 0.42, 0]} color="#ffd58a" intensity={0.8} distance={3} />
    </group>
  );
}

/* ============================================================
   Wooden bridge over a small inlet
   ============================================================ */
function Bridge({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.7]} />
        <meshStandardMaterial color={PALETTE.woodLight} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.1, 0]}>
          <boxGeometry args={[0.05, 0.06, 0.72]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}
      {[-0.7, 0.7].map((x, i) =>
        [-0.32, 0.32].map((z, j) => (
          <mesh key={`${i}-${j}`} castShadow position={[x, 0.25, z]}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
            <meshStandardMaterial color={PALETTE.woodDark} />
          </mesh>
        )),
      )}
      {[-0.32, 0.32].map((z, i) => (
        <mesh key={i} position={[0, 0.42, z]}>
          <boxGeometry args={[1.6, 0.04, 0.04]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   Flag on pole
   ============================================================ */
function FlagPole({ position }: { position: [number, number, number] }) {
  const flag = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2) * 0.12;
  });
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.8, 8]} />
        <meshStandardMaterial color="#dcdcdc" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.6} roughness={0.3} emissive="#ffae00" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={flag} position={[0.3, 1.5, 0]}>
        <planeGeometry args={[0.6, 0.36, 8, 4]} />
        <MeshWobbleMaterial color={PALETTE.flagRed} factor={0.4} speed={2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ============================================================
   Fountain with animated water
   ============================================================ */
function Fountain({ position }: { position: [number, number, number] }) {
  const water = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (water.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
      water.current.scale.set(s, 1, s);
    }
  });
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.2, 24]} />
        <meshStandardMaterial color={PALETTE.rockLight} roughness={0.9} />
      </mesh>
      <mesh ref={water} position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 24]} />
        <meshPhysicalMaterial color={PALETTE.oceanShallow} transmission={0.6} thickness={0.4} roughness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.6, 12]} />
        <meshStandardMaterial color={PALETTE.rockLight} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.16, 14, 12]} />
        <meshStandardMaterial color={PALETTE.oceanShallow} emissive={PALETTE.oceanShallow} emissiveIntensity={0.4} />
      </mesh>
      <FxSparkles count={20} scale={[0.6, 1, 0.6]} position={[0, 0.7, 0]} size={2} speed={1.4} color="#a0f0ff" />
    </group>
  );
}

/* Clouds removed */

/* ============================================================
   Living things
   ============================================================ */
function Bird({
  radius,
  speed,
  height,
  color = "#ffffff",
  accent = "#f0a070",
}: {
  radius: number;
  speed: number;
  height: number;
  color?: string;
  accent?: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const y = height + Math.sin(t * 2) * 0.45;
    ref.current.position.set(x, y, z);
    ref.current.rotation.y = -t + Math.PI / 2;
    // gentle banking
    body.current.rotation.z = Math.sin(t * 2) * 0.18;
    body.current.rotation.x = -0.08;
    // smooth wing flap with two segments
    const flap = Math.sin(clock.elapsedTime * 10) * 0.55 + 0.1;
    wingL.current.rotation.z = flap;
    wingR.current.rotation.z = -flap;
  });
  return (
    <group ref={ref}>
      <group ref={body}>
        {/* Body — elongated egg shape */}
        <mesh castShadow scale={[1.4, 0.85, 0.9]}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Belly highlight */}
        <mesh position={[0, -0.04, 0]} scale={[1.1, 0.5, 0.7]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh castShadow position={[0.18, 0.06, 0]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Beak */}
        <mesh position={[0.3, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.035, 0.12, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        {/* Eyes */}
        <mesh position={[0.24, 0.1, 0.07]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#101010" />
        </mesh>
        <mesh position={[0.24, 0.1, -0.07]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#101010" />
        </mesh>
        {/* Tail feathers */}
        <mesh castShadow position={[-0.22, 0.02, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.09, 0.22, 6]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {/* Wings — two-segment for realistic shape */}
        <group ref={wingL} position={[0, 0.04, 0.08]}>
          <mesh castShadow position={[0, 0, 0.18]} rotation={[0, 0, 0.05]}>
            <boxGeometry args={[0.22, 0.015, 0.32]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          <mesh castShadow position={[-0.02, 0, 0.42]} rotation={[0, 0.2, 0.1]}>
            <boxGeometry args={[0.18, 0.012, 0.28]} />
            <meshStandardMaterial color={accent} roughness={0.65} />
          </mesh>
        </group>
        <group ref={wingR} position={[0, 0.04, -0.08]}>
          <mesh castShadow position={[0, 0, -0.18]} rotation={[0, 0, 0.05]}>
            <boxGeometry args={[0.22, 0.015, 0.32]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          <mesh castShadow position={[-0.02, 0, -0.42]} rotation={[0, -0.2, 0.1]}>
            <boxGeometry args={[0.18, 0.012, 0.28]} />
            <meshStandardMaterial color={accent} roughness={0.65} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Butterfly({ origin, color, seed = 0 }: { origin: [number, number, number]; color: string; seed?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const wL = useRef<THREE.Mesh>(null!);
  const wR = useRef<THREE.Mesh>(null!);
  const offset = useMemo(() => mulberry32(seed + 11)() * 10, [seed]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + offset;
    ref.current.position.set(
      origin[0] + Math.sin(t * 0.7) * 0.9,
      origin[1] + Math.sin(t * 1.4) * 0.3,
      origin[2] + Math.cos(t * 0.7) * 0.9,
    );
    const flap = Math.sin(t * 22) * 1.2;
    wL.current.rotation.y = flap;
    wR.current.rotation.y = -flap;
  });
  return (
    <group ref={ref} scale={0.45}>
      <mesh ref={wL} position={[-0.16, 0, 0]}>
        <planeGeometry args={[0.32, 0.26]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={wR} position={[0.16, 0, 0]}>
        <planeGeometry args={[0.32, 0.26]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Fish({ radius, depth, speed, color }: { radius: number; depth: number; speed: number; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed;
    ref.current.position.set(Math.cos(t) * radius, depth, Math.sin(t) * radius);
    ref.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <mesh>
        <coneGeometry args={[0.18, 0.6, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/* ============================================================
   Buildings — bright stylized
   ============================================================ */
function ChimneySmoke({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = (clock.elapsedTime % 3) / 3;
      ref.current.position.y = position[1] + t * 0.8;
      (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.6 * (1 - t);
      ref.current.scale.setScalar(0.15 + t * 0.5);
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.2, 10, 8]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
    </mesh>
  );
}

function HutBuilding({ stages }: { stages: number }) {
  /* Realistic log-cabin hut with thatched roof, stone chimney,
     porch with overhang, shutters and flower box. */
  const logColors = ["#a06b3a", "#8a5a30", "#9a6535", "#7d4f2c"];
  return (
    <>
      {/* Stone foundation with visible blocks */}
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[1.15, 0.14, 1.05]} />
        <meshStandardMaterial color="#9aa3b2" roughness={1} />
      </mesh>
      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <mesh key={`fs-${i}`} position={[x, 0.06, 0.53]}>
          <boxGeometry args={[0.26, 0.13, 0.02]} />
          <meshStandardMaterial color="#6c7383" roughness={1} />
        </mesh>
      ))}

      {/* Stacked horizontal logs as walls (back + sides) */}
      {Array.from({ length: 6 }).map((_, i) => {
        const y = 0.2 + i * 0.11;
        const c = logColors[i % logColors.length];
        return (
          <group key={`log-${i}`}>
            {/* back wall */}
            <mesh castShadow position={[0, y, -0.5]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 1.0, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
            {/* left wall */}
            <mesh castShadow position={[-0.5, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.0, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
            {/* right wall */}
            <mesh castShadow position={[0.5, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.0, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
            {/* front partial logs (left of door) */}
            <mesh castShadow position={[-0.35, y, 0.5]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.3, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
            {/* front partial logs (right of door) */}
            <mesh castShadow position={[0.35, y, 0.5]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.3, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Top trim above logs (front, where door is) */}
      <mesh castShadow position={[0, 0.86, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 1.0, 10]} />
        <meshStandardMaterial color={logColors[0]} roughness={0.9} />
      </mesh>

      {/* Corner posts */}
      {[
        [-0.5, 0.5],
        [0.5, 0.5],
        [-0.5, -0.5],
        [0.5, -0.5],
      ].map(([x, z], i) => (
        <mesh key={`corner-${i}`} castShadow position={[x, 0.5, z]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 10]} />
          <meshStandardMaterial color="#5a3818" roughness={0.95} />
        </mesh>
      ))}

      {/* Roof — triangular prism (pitched) */}
      <group position={[0, 1.45, 0]}>
        {/* Triangular gable ends */}
        <mesh castShadow position={[0, 0.3, 0.625]} rotation={[Math.PI / 2, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.04, 3]} />
          <meshStandardMaterial color="#caa370" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.3, -0.625]} rotation={[Math.PI / 2, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.04, 3]} />
          <meshStandardMaterial color="#caa370" roughness={0.9} />
        </mesh>

        {/* Two pitched thatched slopes */}
        <mesh castShadow position={[-0.31, 0.3, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[0.08, 0.72, 1.3]} />
          <meshStandardMaterial color="#caa050" roughness={1} />
        </mesh>
        <mesh castShadow position={[0.31, 0.3, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.08, 0.72, 1.3]} />
          <meshStandardMaterial color="#caa050" roughness={1} />
        </mesh>

        {/* Ridge cap along the top */}
        <mesh castShadow position={[0, 0.65, 0]}>
          <boxGeometry args={[0.1, 0.06, 1.32]} />
          <meshStandardMaterial color="#7a4e1e" roughness={0.95} />
        </mesh>
      </group>


      {/* Door frame + door with planks */}
      <mesh position={[0, 0.45, 0.515]}>
        <boxGeometry args={[0.36, 0.62, 0.04]} />
        <meshStandardMaterial color="#3d2510" />
      </mesh>
      {[-0.08, 0, 0.08].map((x, i) => (
        <mesh key={`plank-${i}`} position={[x, 0.45, 0.535]}>
          <boxGeometry args={[0.07, 0.58, 0.01]} />
          <meshStandardMaterial color="#6b3e1c" roughness={0.95} />
        </mesh>
      ))}
      {/* Door hinges + handle */}
      {[0.6, 0.3].map((y, i) => (
        <mesh key={`hinge-${i}`} position={[-0.13, y, 0.545]}>
          <boxGeometry args={[0.07, 0.025, 0.005]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0.11, 0.45, 0.55]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Step in front of door */}
      <mesh castShadow receiveShadow position={[0, 0.16, 0.6]}>
        <boxGeometry args={[0.42, 0.06, 0.16]} />
        <meshStandardMaterial color="#8a8a92" roughness={1} />
      </mesh>

      {/* Porch overhang with two posts */}
      <mesh castShadow position={[0, 0.95, 0.7]}>
        <boxGeometry args={[0.8, 0.05, 0.35]} />
        <meshStandardMaterial color="#7a4e1e" />
      </mesh>
      {[-0.32, 0.32].map((x, i) => (
        <mesh key={`post-${i}`} castShadow position={[x, 0.55, 0.78]}>
          <cylinderGeometry args={[0.04, 0.04, 0.82, 8]} />
          <meshStandardMaterial color="#5a3818" />
        </mesh>
      ))}

      {/* Windows with shutters and crossbars — left side */}
      <group position={[-0.51, 0.55, 0]}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.26, 0.22, 0.02]} />
          <meshStandardMaterial color="#fff0a8" emissive="#ffb734" emissiveIntensity={0.7} />
        </mesh>
        {/* cross bars */}
        <mesh position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.26, 0.02, 0.03]} />
          <meshStandardMaterial color="#3a2410" />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.02, 0.22, 0.03]} />
          <meshStandardMaterial color="#3a2410" />
        </mesh>
        {/* shutters */}
        {[-0.18, 0.18].map((z, i) => (
          <mesh key={`sh-${i}`} position={[0, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
            <boxGeometry args={[0.04, 0.24, 0.08]} />
            <meshStandardMaterial color={PALETTE.roofRed} />
          </mesh>
        ))}
      </group>

      {/* Right side window (mirror) */}
      <group position={[0.51, 0.55, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.26, 0.22, 0.02]} />
          <meshStandardMaterial color="#fff0a8" emissive="#ffb734" emissiveIntensity={0.7} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.26, 0.02, 0.03]} />
          <meshStandardMaterial color="#3a2410" />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.02, 0.22, 0.03]} />
          <meshStandardMaterial color="#3a2410" />
        </mesh>
        {[-0.18, 0.18].map((z, i) => (
          <mesh key={`shr-${i}`} position={[0, 0, z]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.04, 0.24, 0.08]} />
            <meshStandardMaterial color={PALETTE.roofRed} />
          </mesh>
        ))}
        {/* flower box under window */}
        <mesh position={[0.05, -0.18, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.34, 0.08, 0.08]} />
          <meshStandardMaterial color="#6b3e1c" />
        </mesh>
        {[-0.12, 0, 0.12].map((z, i) => (
          <mesh key={`fb-${i}`} position={[0.05, -0.12, z]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color={i === 1 ? PALETTE.flowerPink : PALETTE.flowerOrange} emissive={PALETTE.flowerPink} emissiveIntensity={0.2} />
          </mesh>
        ))}
      </group>

      {/* Stone chimney with brick pattern */}
      <group position={[0.38, 0, -0.35]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[0.2, 0.9, 0.2]} />
          <meshStandardMaterial color="#7c7c84" roughness={1} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={`brick-${i}`} position={[0, 0.15 + i * 0.18, 0.101]}>
            <boxGeometry args={[0.18, 0.02, 0.005]} />
            <meshStandardMaterial color="#54545a" />
          </mesh>
        ))}
        {/* chimney cap */}
        <mesh castShadow position={[0, 0.93, 0]}>
          <boxGeometry args={[0.24, 0.05, 0.24]} />
          <meshStandardMaterial color="#3a3a40" />
        </mesh>
      </group>
      <ChimneySmoke position={[0.38, 1.05, -0.35]} />

      {/* Hanging lantern beside door */}
      <group position={[0.26, 0.78, 0.72]}>
        <mesh>
          <cylinderGeometry args={[0.005, 0.005, 0.15, 6]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={PALETTE.flowerYellow} emissive="#ffb734" emissiveIntensity={1.3} />
        </mesh>
        <pointLight position={[0, -0.12, 0]} color="#ffd58a" intensity={0.6} distance={1.6} />
      </group>

      {/* Barrel decoration */}
      {stages >= 2 && (
        <group position={[0.55, 0.18, 0.45]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.32, 14]} />
            <meshStandardMaterial color="#7a4e1e" />
          </mesh>
          {[-0.1, 0.1].map((y, i) => (
            <mesh key={i} position={[0, y, 0]}>
              <torusGeometry args={[0.135, 0.012, 6, 16]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.6} />
            </mesh>
          ))}
        </group>
      )}

      {/* Crate */}
      {stages >= 3 && (
        <group position={[-0.55, 0.18, 0.45]}>
          <mesh castShadow>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshStandardMaterial color="#a06b3a" />
          </mesh>
          {[-0.1, 0.1].map((y, i) => (
            <mesh key={i} position={[0, y, 0.141]}>
              <boxGeometry args={[0.3, 0.025, 0.005]} />
              <meshStandardMaterial color="#5a3818" />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}



/* ============================================================
   LumberBuilding — Sawmill with log-cabin walls, spinning blade,
   log conveyor, stacked timber, sawdust pile, and woodsman's axe.
   ============================================================ */
function LumberBuilding({ stages }: { stages: number }) {
  const saw = useRef<THREE.Mesh>(null!);
  const log = useRef<THREE.Group>(null!);
  useFrame(({ clock }, dt) => {
    if (saw.current) saw.current.rotation.x += dt * 8;
    if (log.current) {
      // log slowly creeps toward blade then resets
      const t = (clock.elapsedTime % 4) / 4;
      log.current.position.x = -0.5 + t * 0.85;
    }
  });
  return (
    <>
      {/* Stone foundation */}
      <mesh castShadow receiveShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[1.25, 0.14, 1.1]} />
        <meshStandardMaterial color="#9aa3b2" roughness={1} />
      </mesh>

      {/* Log-cabin walls — horizontal stacked logs */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = 0.2 + i * 0.13;
        const c = i % 2 ? "#a06b3a" : "#8a5a30";
        return (
          <group key={`lw-${i}`}>
            <mesh castShadow position={[0, y, -0.5]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.065, 0.065, 1.15, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[-0.55, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 1.0, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0.55, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 1.0, 10]} />
              <meshStandardMaterial color={c} roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Open front — supporting posts only */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={`fp-${i}`} castShadow position={[x, 0.5, 0.5]}>
          <cylinderGeometry args={[0.07, 0.07, 0.7, 8]} />
          <meshStandardMaterial color="#5a3818" />
        </mesh>
      ))}

      {/* Pitched plank roof */}
      <group position={[0, 0.95, 0]}>
        <mesh castShadow position={[-0.32, 0.18, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[0.06, 0.78, 1.25]} />
          <meshStandardMaterial color={PALETTE.roofTeal} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0.32, 0.18, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.06, 0.78, 1.25]} />
          <meshStandardMaterial color={PALETTE.roofTeal} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.08, 0.06, 1.28]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        {/* Sign with axe icon */}
        <mesh castShadow position={[0, 0.05, 0.64]}>
          <boxGeometry args={[0.45, 0.18, 0.04]} />
          <meshStandardMaterial color="#6b3e1c" />
        </mesh>
        <mesh position={[0, 0.05, 0.665]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.03, 0.13, 0.005]} />
          <meshStandardMaterial color="#5a3818" />
        </mesh>
        <mesh position={[0.04, 0.09, 0.665]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.09, 0.05, 0.005]} />
          <meshStandardMaterial color="#cdd3dc" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* Conveyor / log feed table */}
      <mesh castShadow position={[0, 0.32, 0.25]}>
        <boxGeometry args={[1.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#6b3e1c" />
      </mesh>
      {/* Moving log being cut */}
      <group ref={log} position={[-0.5, 0.42, 0.25]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.45, 12]} />
          <meshStandardMaterial color="#a06b3a" />
        </mesh>
      </group>

      {/* Big circular saw blade — vertical, mounted on post */}
      <mesh castShadow position={[0.35, 0.42, 0.42]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh ref={saw} position={[0.35, 0.5, 0.25]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 24]} />
        <meshStandardMaterial color="#e8edf3" metalness={0.95} roughness={0.12} emissive="#aab" emissiveIntensity={0.15} />
      </mesh>
      {/* saw teeth ring */}
      <mesh position={[0.35, 0.5, 0.26]}>
        <torusGeometry args={[0.26, 0.018, 6, 22]} />
        <meshStandardMaterial color="#9aa3b2" metalness={0.7} />
      </mesh>

      {/* Sawdust pile under blade */}
      <mesh castShadow position={[0.35, 0.18, 0.05]}>
        <coneGeometry args={[0.18, 0.12, 12]} />
        <meshStandardMaterial color="#e8c89a" roughness={1} />
      </mesh>

      {/* Stacked logs pile (left side) */}
      {[0, 1, 2].map((i) => (
        <mesh key={`stk-${i}`} castShadow position={[-0.78, 0.22 + i * 0.13, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.5, 12]} />
          <meshStandardMaterial color={i % 2 ? "#a06b3a" : "#8a5a30"} />
        </mesh>
      ))}
      {/* Second log row offset */}
      {[0, 1].map((i) => (
        <mesh key={`stk2-${i}`} castShadow position={[-0.78, 0.485 + i * 0.13, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.5, 12]} />
          <meshStandardMaterial color="#9a6535" />
        </mesh>
      ))}

      {/* Chimney with smoke for sawmill workshop */}
      <mesh castShadow position={[0.45, 1.15, -0.35]}>
        <boxGeometry args={[0.16, 0.5, 0.16]} />
        <meshStandardMaterial color="#7c7c84" roughness={1} />
      </mesh>
      <ChimneySmoke position={[0.45, 1.45, -0.35]} />

      {/* Axe leaning against logs (clear identity) */}
      {stages >= 2 && (
        <group position={[-0.78, 0.42, 0.15]} rotation={[0, 0.4, -0.25]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.6, 8]} />
            <meshStandardMaterial color={PALETTE.woodDark} />
          </mesh>
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[0.16, 0.13, 0.03]} />
            <meshStandardMaterial color="#cdd3dc" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      )}
    </>
  );
}

/* ============================================================
   QuarryBuilding — Stone pit with terraced walls, wooden mine
   entrance, minecart on rails, pickaxes, glowing crystal vein.
   ============================================================ */
function QuarryBuilding({ stages }: { stages: number }) {
  const cart = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (cart.current) {
      const t = (clock.elapsedTime * 0.4) % 1;
      cart.current.position.x = -0.45 + t * 0.9;
    }
  });
  return (
    <>
      {/* Excavated pit floor */}
      <mesh receiveShadow position={[0, 0.05, 0.15]}>
        <cylinderGeometry args={[0.62, 0.7, 0.1, 16]} />
        <meshStandardMaterial color="#7a7e88" roughness={1} />
      </mesh>

      {/* Terraced rock walls around back */}
      {[0, 1, 2].map((i) => {
        const y = 0.12 + i * 0.18;
        const r = 0.85 - i * 0.12;
        return (
          <mesh key={`tr-${i}`} castShadow position={[0, y, -0.3 - i * 0.05]}>
            <cylinderGeometry args={[r, r + 0.05, 0.18, 16, 1, false, -Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color={i === 0 ? "#8a8e98" : i === 1 ? PALETTE.rockLight : "#a8b0c0"} roughness={1} />
          </mesh>
        );
      })}

      {/* Large boulders embedded in walls */}
      <mesh castShadow position={[-0.45, 0.32, -0.3]}>
        <dodecahedronGeometry args={[0.22]} />
        <meshStandardMaterial color="#8a8e98" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0.5, 0.38, -0.35]}>
        <dodecahedronGeometry args={[0.26]} />
        <meshStandardMaterial color="#9aa3b2" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0.18, 0.6, -0.45]}>
        <dodecahedronGeometry args={[0.2]} />
        <meshStandardMaterial color="#7a7e88" roughness={1} flatShading />
      </mesh>

      {/* Mine entrance — wooden frame with dark opening */}
      <group position={[0, 0.32, -0.15]}>
        {/* dark opening */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 0.42, 0.05]} />
          <meshStandardMaterial color="#0a0a10" />
        </mesh>
        {/* wooden frame */}
        <mesh castShadow position={[-0.2, 0, 0.03]}>
          <boxGeometry args={[0.06, 0.5, 0.08]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        <mesh castShadow position={[0.2, 0, 0.03]}>
          <boxGeometry args={[0.06, 0.5, 0.08]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        <mesh castShadow position={[0, 0.25, 0.03]}>
          <boxGeometry args={[0.5, 0.07, 0.08]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        {/* Lantern above entrance */}
        <mesh position={[0, 0.32, 0.08]}>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial color={PALETTE.flowerYellow} emissive="#ffb734" emissiveIntensity={1.2} />
        </mesh>
        <pointLight position={[0, 0.32, 0.08]} color="#ffd58a" intensity={0.7} distance={1.4} />
      </group>

      {/* Rails leading from mine */}
      {[-0.07, 0.07].map((z, i) => (
        <mesh key={`rail-${i}`} position={[0, 0.12, 0.15 + z]}>
          <boxGeometry args={[0.9, 0.015, 0.015]} />
          <meshStandardMaterial color="#5a5a60" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Wooden ties */}
      {[-0.35, -0.1, 0.15, 0.4].map((x, i) => (
        <mesh key={`tie-${i}`} position={[x, 0.105, 0.15]}>
          <boxGeometry args={[0.06, 0.02, 0.22]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}

      {/* Minecart on rails — full of rocks */}
      <group ref={cart} position={[-0.45, 0.2, 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.16, 0.22]} />
          <meshStandardMaterial color="#6b3e1c" />
        </mesh>
        {/* metal trim */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.3, 0.025, 0.24]} />
          <meshStandardMaterial color="#3a3a40" metalness={0.7} />
        </mesh>
        {/* rocks inside */}
        <mesh castShadow position={[-0.05, 0.1, 0]}>
          <dodecahedronGeometry args={[0.06]} />
          <meshStandardMaterial color={PALETTE.rockLight} flatShading />
        </mesh>
        <mesh castShadow position={[0.06, 0.1, 0.03]}>
          <dodecahedronGeometry args={[0.05]} />
          <meshStandardMaterial color="#9aa3b2" flatShading />
        </mesh>
        {/* wheels */}
        {[-0.1, 0.1].map((x, i) =>
          [-0.11, 0.11].map((z, j) => (
            <mesh key={`w-${i}-${j}`} position={[x, -0.07, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.02, 10]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.5} />
            </mesh>
          ))
        )}
      </group>

      {/* Crossed pickaxes sign — unmistakable mining icon */}
      <group position={[0.55, 0.55, 0.35]}>
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0.6]}>
          <cylinderGeometry args={[0.022, 0.022, 0.45, 8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.28, 0.05, 0.05]} />
          <meshStandardMaterial color="#cdd3dc" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.022, 0.022, 0.45, 8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0, -0.6]}>
          <boxGeometry args={[0.28, 0.05, 0.05]} />
          <meshStandardMaterial color="#9aa3b2" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* Rock pile beside cart */}
      <mesh castShadow position={[-0.6, 0.18, 0.45]}>
        <dodecahedronGeometry args={[0.13]} />
        <meshStandardMaterial color={PALETTE.rockLight} flatShading />
      </mesh>
      <mesh castShadow position={[-0.45, 0.16, 0.5]}>
        <dodecahedronGeometry args={[0.1]} />
        <meshStandardMaterial color="#9aa3b2" flatShading />
      </mesh>

      {/* Glowing crystal vein deeper in pit */}
      {stages >= 2 && (
        <>
          <mesh castShadow position={[0.3, 0.55, -0.5]} rotation={[0.3, 0.4, 0.2]}>
            <coneGeometry args={[0.08, 0.28, 6]} />
            <meshStandardMaterial color={PALETTE.crystal} emissive={PALETTE.crystal} emissiveIntensity={0.9} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0.42, 0.5, -0.48]} rotation={[0.1, -0.3, -0.3]}>
            <coneGeometry args={[0.06, 0.22, 6]} />
            <meshStandardMaterial color={PALETTE.crystal} emissive={PALETTE.crystal} emissiveIntensity={0.9} roughness={0.2} />
          </mesh>
          <pointLight position={[0.35, 0.6, -0.45]} color={PALETTE.crystal} intensity={0.8} distance={1.6} />
        </>
      )}
    </>
  );
}

/* ============================================================
   WindmillBuilding — Classic Dutch windmill: stone base, tapered
   white tower with planking & windows, balcony, swiveling cap,
   four sail blades with lattice, flag, door.
   ============================================================ */
function WindmillBuilding() {
  const blades = useRef<THREE.Group>(null!);
  const flag = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 1.4;
    if (flag.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.08;
      flag.current.scale.x = s;
    }
  });
  return (
    <>
      {/* Stone base ring */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.2, 16]} />
        <meshStandardMaterial color="#8a8e98" roughness={1} />
      </mesh>
      {/* Stone block detail */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={`sb-${i}`} position={[Math.cos(a) * 0.66, 0.1, Math.sin(a) * 0.66]}>
            <boxGeometry args={[0.16, 0.06, 0.02]} />
            <meshStandardMaterial color="#6c7383" roughness={1} />
          </mesh>
        );
      })}

      {/* Tapered tower with plank texture rings */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.3, 0.48, 1.2, 16]} />
        <meshStandardMaterial color="#fff5e0" roughness={0.85} />
      </mesh>
      {/* Plank ring trim */}
      {[0.3, 0.65, 1.0].map((y, i) => (
        <mesh key={`pr-${i}`} position={[0, y, 0]}>
          <torusGeometry args={[0.46 - i * 0.07, 0.015, 6, 24]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}

      {/* Door at base */}
      <mesh position={[0, 0.32, 0.46]}>
        <boxGeometry args={[0.22, 0.36, 0.03]} />
        <meshStandardMaterial color="#6b3e1c" />
      </mesh>
      <mesh position={[0.07, 0.32, 0.475]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.8} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, 0.5, 0.47]}>
        <boxGeometry args={[0.26, 0.04, 0.025]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>

      {/* Small round windows */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={`win-${i}`} position={[Math.cos(a) * 0.36, 0.95, Math.sin(a) * 0.36]} rotation={[0, -a + Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
            <meshStandardMaterial color="#fff0a8" emissive="#ffb734" emissiveIntensity={0.7} />
          </mesh>
        );
      })}

      {/* Balcony ring */}
      <mesh castShadow position={[0, 1.05, 0]}>
        <torusGeometry args={[0.36, 0.025, 8, 20]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={`bl-${i}`} position={[Math.cos(a) * 0.36, 1.13, Math.sin(a) * 0.36]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
            <meshStandardMaterial color={PALETTE.woodDark} />
          </mesh>
        );
      })}
      <mesh position={[0, 1.2, 0]}>
        <torusGeometry args={[0.36, 0.018, 6, 20]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>

      {/* Conical roof cap */}
      <mesh castShadow position={[0, 1.42, 0]}>
        <coneGeometry args={[0.34, 0.45, 16]} />
        <meshStandardMaterial color={PALETTE.roofRed} roughness={0.75} />
      </mesh>
      {/* Spire */}
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Flag */}
      <mesh ref={flag} position={[0.06, 1.78, 0]}>
        <boxGeometry args={[0.12, 0.07, 0.005]} />
        <meshStandardMaterial color={PALETTE.flagRed} side={THREE.DoubleSide} />
      </mesh>

      {/* Sail blade assembly */}
      <group ref={blades} position={[0, 1.25, 0.4]}>
        {/* central hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 12]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 12]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={`bl-${i}`} rotation={[0, 0, (i * Math.PI) / 2]}>
            {/* main spar */}
            <mesh castShadow position={[0, 0.5, 0]}>
              <boxGeometry args={[0.05, 0.95, 0.04]} />
              <meshStandardMaterial color={PALETTE.woodDark} />
            </mesh>
            {/* sail canvas */}
            <mesh castShadow position={[0.12, 0.5, 0.01]}>
              <boxGeometry args={[0.18, 0.88, 0.008]} />
              <meshStandardMaterial color="#fafaf0" side={THREE.DoubleSide} roughness={0.95} />
            </mesh>
            {/* lattice cross supports */}
            {[-0.3, 0, 0.3].map((y, j) => (
              <mesh key={`lat-${j}`} position={[0.12, 0.5 + y, 0.02]}>
                <boxGeometry args={[0.2, 0.012, 0.005]} />
                <meshStandardMaterial color={PALETTE.woodDark} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  );
}

/* ============================================================
   MarketBuilding — Open trade square: tiled plaza, multiple
   striped awning stalls, produce baskets, hanging coin sign,
   barrels, scale, customer benches.
   ============================================================ */
function MarketBuilding({ stages }: { stages: number }) {
  const coin = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (coin.current) coin.current.rotation.y = clock.elapsedTime * 1.5;
  });
  return (
    <>
      {/* Tiled stone plaza */}
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.4, 0.1, 1.2]} />
        <meshStandardMaterial color="#e8dcc0" roughness={1} />
      </mesh>
      {/* Tile grid lines */}
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={`gx-${i}`} position={[x, 0.101, 0]}>
          <boxGeometry args={[0.02, 0.002, 1.2]} />
          <meshStandardMaterial color="#b8a878" />
        </mesh>
      ))}
      {[-0.3, 0.3].map((z, i) => (
        <mesh key={`gz-${i}`} position={[0, 0.101, z]}>
          <boxGeometry args={[1.4, 0.002, 0.02]} />
          <meshStandardMaterial color="#b8a878" />
        </mesh>
      ))}

      {/* Back wooden booth wall */}
      <mesh castShadow position={[0, 0.45, -0.5]}>
        <boxGeometry args={[1.3, 0.7, 0.08]} />
        <meshStandardMaterial color="#a06b3a" roughness={0.9} />
      </mesh>
      {/* Vertical plank seams */}
      {[-0.55, -0.25, 0.05, 0.35, 0.65].map((x, i) => (
        <mesh key={`vp-${i}`} position={[x - 0.05, 0.45, -0.455]}>
          <boxGeometry args={[0.012, 0.7, 0.005]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}

      {/* Big counter — front display */}
      <mesh castShadow position={[0, 0.32, 0.25]}>
        <boxGeometry args={[1.2, 0.06, 0.45]} />
        <meshStandardMaterial color="#6b3e1c" />
      </mesh>
      {/* Counter legs */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={`cl-${i}`} position={[x, 0.18, 0.25]}>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}

      {/* RED & WHITE striped awning — the iconic market roof */}
      <group position={[0, 0.92, 0.15]}>
        {Array.from({ length: 7 }).map((_, i) => {
          const x = -0.6 + i * 0.2;
          return (
            <mesh key={`aw-${i}`} castShadow position={[x, 0, 0]} rotation={[Math.PI / 8, 0, 0]}>
              <boxGeometry args={[0.18, 0.04, 0.55]} />
              <meshStandardMaterial color={i % 2 ? PALETTE.roofRed : "#ffffff"} side={THREE.DoubleSide} roughness={0.85} />
            </mesh>
          );
        })}
        {/* Scalloped front trim */}
        {Array.from({ length: 7 }).map((_, i) => {
          const x = -0.6 + i * 0.2;
          return (
            <mesh key={`sc-${i}`} position={[x, -0.1, 0.27]} rotation={[Math.PI / 8, 0, 0]}>
              <coneGeometry args={[0.08, 0.1, 3]} />
              <meshStandardMaterial color={i % 2 ? "#ffffff" : PALETTE.roofRed} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
        {/* Awning ridge pole */}
        <mesh position={[0, 0.08, -0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 1.45, 8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      </group>

      {/* Awning support posts */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={`ap-${i}`} castShadow position={[x, 0.6, 0.4]}>
          <cylinderGeometry args={[0.035, 0.035, 0.95, 8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}

      {/* Produce baskets on counter — fruit pyramids */}
      {/* Apple basket */}
      <group position={[-0.35, 0.4, 0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.09, 0.08, 12]} />
          <meshStandardMaterial color="#8a5a30" />
        </mesh>
        {[[0, 0.08, 0], [-0.05, 0.08, 0.04], [0.05, 0.08, 0.04], [0, 0.13, 0.02]].map(([x, y, z], i) => (
          <mesh key={`ap-${i}`} castShadow position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#ff4848" />
          </mesh>
        ))}
      </group>
      {/* Orange basket */}
      <group position={[0, 0.4, 0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.09, 0.08, 12]} />
          <meshStandardMaterial color="#8a5a30" />
        </mesh>
        {[[0, 0.08, 0], [-0.05, 0.08, 0.04], [0.05, 0.08, 0.04], [0, 0.13, 0.02]].map(([x, y, z], i) => (
          <mesh key={`or-${i}`} castShadow position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#ff8a2a" />
          </mesh>
        ))}
      </group>
      {/* Green basket */}
      <group position={[0.35, 0.4, 0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.09, 0.08, 12]} />
          <meshStandardMaterial color="#8a5a30" />
        </mesh>
        {[[0, 0.08, 0], [-0.05, 0.08, 0.04], [0.05, 0.08, 0.04], [0, 0.13, 0.02]].map(([x, y, z], i) => (
          <mesh key={`gr-${i}`} castShadow position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#7ada3a" />
          </mesh>
        ))}
      </group>

      {/* Hanging gold-coin sign — explicit "MARKET" identity */}
      <group position={[0, 0.95, 0.45]}>
        <mesh>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 6]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh ref={coin} position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.02, 24]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.4} metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <torusGeometry args={[0.075, 0.008, 6, 18]} />
          <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* Barrels at side */}
      {stages >= 1 && (
        <group position={[-0.62, 0.2, -0.25]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.35, 14]} />
            <meshStandardMaterial color="#7a4e1e" />
          </mesh>
          {[-0.1, 0.1].map((y, i) => (
            <mesh key={`bh-${i}`} position={[0, y, 0]}>
              <torusGeometry args={[0.135, 0.012, 6, 16]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.6} />
            </mesh>
          ))}
        </group>
      )}

      {/* Sacks of grain */}
      {stages >= 2 && (
        <>
          <mesh castShadow position={[0.62, 0.18, -0.25]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color="#e8d8a8" roughness={1} />
          </mesh>
          <mesh castShadow position={[0.62, 0.34, -0.18]}>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshStandardMaterial color="#d8c898" roughness={1} />
          </mesh>
        </>
      )}

      {/* Lantern hanging on post */}
      <mesh position={[0.6, 1.05, 0.35]}>
        <boxGeometry args={[0.08, 0.1, 0.08]} />
        <meshStandardMaterial color={PALETTE.flowerYellow} emissive="#ffb734" emissiveIntensity={1.1} />
      </mesh>
      <pointLight position={[0.6, 1.05, 0.35]} color="#ffd58a" intensity={0.5} distance={1.5} />
    </>
  );
}

/* ============================================================
   RefineryBuilding — Alchemy / wizard tower: dark stone base,
   purple gothic tower with arched windows, swirling potion vat,
   floating glowing orb, magical runes, conical spired roof.
   ============================================================ */
function RefineryBuilding() {
  const orb = useRef<THREE.Mesh>(null!);
  const orbGroup = useRef<THREE.Group>(null!);
  const rune = useRef<THREE.Group>(null!);
  const potion = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (orb.current) {
      const s = 1 + Math.sin(t * 2.5) * 0.08;
      orb.current.scale.setScalar(s);
    }
    if (orbGroup.current) orbGroup.current.position.y = 1.55 + Math.sin(t * 1.6) * 0.05;
    if (rune.current) rune.current.rotation.y = t * 0.6;
    if (potion.current) potion.current.rotation.y = -t * 0.8;
  });
  return (
    <>
      {/* Stone base */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.7, 0.82, 0.2, 16]} />
        <meshStandardMaterial color="#3a3548" roughness={1} />
      </mesh>
      {/* Stone block pattern */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={`sb-${i}`} position={[Math.cos(a) * 0.74, 0.1, Math.sin(a) * 0.74]}>
            <boxGeometry args={[0.14, 0.06, 0.02]} />
            <meshStandardMaterial color="#2a2535" roughness={1} />
          </mesh>
        );
      })}

      {/* Steps up to door */}
      <mesh castShadow position={[0, 0.18, 0.55]}>
        <boxGeometry args={[0.4, 0.08, 0.18]} />
        <meshStandardMaterial color="#4a4458" />
      </mesh>
      <mesh castShadow position={[0, 0.25, 0.65]}>
        <boxGeometry args={[0.3, 0.06, 0.15]} />
        <meshStandardMaterial color="#5a5468" />
      </mesh>

      {/* Main tower body — tall hexagonal prism */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.48, 0.55, 0.95, 6]} />
        <meshStandardMaterial color="#4a3a7a" roughness={0.7} />
      </mesh>
      {/* Stone seam rings */}
      {[0.35, 0.7, 1.05].map((y, i) => (
        <mesh key={`sr-${i}`} position={[0, y, 0]}>
          <torusGeometry args={[0.51, 0.012, 6, 6]} />
          <meshStandardMaterial color="#2a1f4a" />
        </mesh>
      ))}

      {/* Gothic arched door */}
      <group position={[0, 0.5, 0.5]}>
        <mesh>
          <boxGeometry args={[0.26, 0.42, 0.04]} />
          <meshStandardMaterial color="#1a0f30" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#1a0f30" />
        </mesh>
        {/* Iron studs */}
        {[[-0.08, -0.12], [0.08, -0.12], [-0.08, 0.05], [0.08, 0.05]].map(([x, y], i) => (
          <mesh key={`st-${i}`} position={[x, y, 0.025]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color="#666" metalness={0.85} />
          </mesh>
        ))}
        {/* glowing keyhole */}
        <mesh position={[0.08, 0, 0.025]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshStandardMaterial color="#c490ff" emissive="#9050ff" emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* Arched glowing windows around tower */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
        return (
          <group key={`aw-${i}`} position={[Math.cos(a) * 0.51, 0.95, Math.sin(a) * 0.51]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh>
              <boxGeometry args={[0.12, 0.22, 0.04]} />
              <meshStandardMaterial color="#c490ff" emissive="#9050ff" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.04, 10, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#c490ff" emissive="#9050ff" emissiveIntensity={1.2} />
            </mesh>
          </group>
        );
      })}

      {/* Bubbling potion cauldron on side */}
      <group position={[-0.7, 0.32, 0.4]}>
        {/* iron rim */}
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.13, 0.16, 14]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.4} />
        </mesh>
        {/* rim band */}
        <mesh position={[0, 0.08, 0]}>
          <torusGeometry args={[0.16, 0.018, 8, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.85} />
        </mesh>
        {/* liquid potion */}
        <mesh ref={potion} position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.145, 0.145, 0.02, 14]} />
          <meshStandardMaterial color="#c490ff" emissive="#9050ff" emissiveIntensity={1.4} />
        </mesh>
        {/* legs */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={`lg-${i}`} position={[Math.cos(a) * 0.1, -0.1, Math.sin(a) * 0.1]}>
              <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.7} />
            </mesh>
          );
        })}
        <pointLight position={[0, 0.18, 0]} color="#c070ff" intensity={1.2} distance={1.4} />
      </group>

      {/* Floating rune ring around orb */}
      <group ref={rune} position={[0, 1.55, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={`rn-${i}`} position={[Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.06, 0.08, 0.01]} />
              <meshStandardMaterial color="#e0c8ff" emissive="#a070ff" emissiveIntensity={1.3} />
            </mesh>
          );
        })}
      </group>

      {/* Pedestal under orb */}
      <mesh castShadow position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 0.18, 12]} />
        <meshStandardMaterial color="#3a2a6a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <torusGeometry args={[0.25, 0.015, 6, 16]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.85} roughness={0.3} />
      </mesh>

      {/* The glowing orb */}
      <group ref={orbGroup} position={[0, 1.55, 0]}>
        <mesh ref={orb}>
          <sphereGeometry args={[0.28, 24, 20]} />
          <meshPhysicalMaterial
            color="#c490ff"
            emissive="#9050ff"
            emissiveIntensity={1.6}
            transmission={0.4}
            thickness={0.5}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Conical spired roof */}
      <mesh castShadow position={[0, 1.45, 0]}>
        <coneGeometry args={[0.55, 0.5, 6]} />
        <meshStandardMaterial color="#2a1f4a" roughness={0.7} />
      </mesh>
      {/* Tall spire */}
      <mesh castShadow position={[0, 1.95, 0]}>
        <coneGeometry args={[0.08, 0.5, 8]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.85} roughness={0.25} emissive={PALETTE.gold} emissiveIntensity={0.25} />
      </mesh>
      {/* Crescent star on top */}
      <mesh position={[0, 2.25, 0]} rotation={[0, 0, Math.PI / 5]}>
        <torusGeometry args={[0.06, 0.012, 6, 12, Math.PI * 1.3]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.9} emissive={PALETTE.gold} emissiveIntensity={0.6} />
      </mesh>

      <FxSparkles count={24} scale={[1, 1, 1]} position={[0, 1.55, 0]} size={3} speed={1} color="#c0a0ff" />
      <pointLight position={[0, 1.55, 0]} color="#b070ff" intensity={2.4} distance={5} />
      <pointLight position={[0, 0.5, 0.55]} color="#9050ff" intensity={0.5} distance={1.2} />
    </>
  );
}

function Building({ id, level }: { id: string; level: number }) {
  const stages = Math.min(level, 3);
  const scale = 0.82 + Math.min(level, 5) * 0.09;
  let content: React.ReactNode = null;
  switch (id) {
    case "hut":
      content = <HutBuilding stages={stages} />;
      break;
    case "lumber":
      content = <LumberBuilding stages={stages} />;
      break;
    case "quarry":
      content = <QuarryBuilding stages={stages} />;
      break;
    case "windmill":
      content = <WindmillBuilding />;
      break;
    case "market":
      content = <MarketBuilding stages={stages} />;
      break;
    case "refinery":
      content = <RefineryBuilding />;
      break;
  }
  return <group scale={scale}>{content}</group>;
}

/* ============================================================
   UpgradeDecor — beautifies buildings as their level grows.
   Lv2: flower pots + golden trim
   Lv3: corner torches (glow stronger at night)
   Lv4: rooftop banner + hanging lanterns
   Lv5+: golden star + gem accents + sparkles
   ============================================================ */
function UpgradeDecor({ level }: { level: number }) {
  const torchRefs = useRef<THREE.PointLight[]>([]);
  const lanternRefs = useRef<THREE.PointLight[]>([]);
  const bannerRef = useRef<THREE.Mesh>(null!);
  const starRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const nightBoost = 0.4 + dayNight.night * 1.6;
    torchRefs.current.forEach((l) => {
      if (l) l.intensity = nightBoost * (0.9 + Math.sin(t * 8 + l.position.x) * 0.12);
    });
    lanternRefs.current.forEach((l) => {
      if (l) l.intensity = nightBoost * 0.8;
    });
    if (bannerRef.current) {
      bannerRef.current.rotation.z = Math.sin(t * 1.8) * 0.08;
    }
    if (starRef.current) {
      starRef.current.rotation.y = t * 0.6;
      const s = 1 + Math.sin(t * 2.4) * 0.08;
      starRef.current.scale.set(s, s, s);
    }
  });

  // Corner positions (around a 1x1 base)
  const corners: [number, number, number][] = [
    [-0.6, 0, -0.6],
    [0.6, 0, -0.6],
    [-0.6, 0, 0.6],
    [0.6, 0, 0.6],
  ];

  return (
    <group>
      {/* Lv2 — golden trim ring + decorative flower pots */}
      {level >= 2 && (
        <>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.78, 0.92, 32]} />
            <meshStandardMaterial
              color={PALETTE.gold}
              metalness={0.9}
              roughness={0.25}
              emissive="#ffae00"
              emissiveIntensity={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
          {[[-0.78, 0.78], [0.78, -0.78]].map(([x, z], i) => (
            <group key={i} position={[x, 0.1, z]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.11, 0.08, 0.16, 12]} />
                <meshStandardMaterial color="#8a4a26" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.13, 0]}>
                <sphereGeometry args={[0.13, 12, 10]} />
                <meshStandardMaterial color={PALETTE.leafLight} roughness={0.7} />
              </mesh>
              {[0, 1, 2].map((j) => (
                <mesh
                  key={j}
                  position={[
                    Math.cos((j * Math.PI * 2) / 3) * 0.09,
                    0.22,
                    Math.sin((j * Math.PI * 2) / 3) * 0.09,
                  ]}
                >
                  <sphereGeometry args={[0.045, 8, 6]} />
                  <meshStandardMaterial
                    color={j === 0 ? PALETTE.flowerPink : j === 1 ? PALETTE.flowerYellow : PALETTE.flowerPurple}
                    emissive={j === 0 ? PALETTE.flowerPink : j === 1 ? "#ffaa00" : PALETTE.flowerPurple}
                    emissiveIntensity={0.4}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )}

      {/* Lv3 — corner torches with night glow */}
      {level >= 3 &&
        corners.map((c, i) => (
          <group key={`torch-${i}`} position={[c[0] * 1.05, 0, c[2] * 1.05]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.035, 0.05, 0.6, 8]} />
              <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.36, 0]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshStandardMaterial color="#ffb734" emissive="#ff7a1a" emissiveIntensity={1.6} />
            </mesh>
            <pointLight
              ref={(el) => {
                if (el) torchRefs.current[i] = el;
              }}
              position={[0, 0.4, 0]}
              color="#ffa550"
              intensity={0.4}
              distance={3.5}
              decay={2}
            />
            <FxSparkles count={5} scale={[0.25, 0.5, 0.25]} position={[0, 0.55, 0]} size={1.6} speed={1.4} color="#ffd070" />
          </group>
        ))}

      {/* Lv4 — rooftop banner + hanging lanterns */}
      {level >= 4 && (
        <>
          <group position={[0, 1.55, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.7, 8]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh ref={bannerRef} position={[0.18, 0.05, 0]}>
              <planeGeometry args={[0.36, 0.22]} />
              <meshStandardMaterial color={PALETTE.flagRed} side={THREE.DoubleSide} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <sphereGeometry args={[0.06, 12, 10]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.95} roughness={0.15} emissive="#ffae00" emissiveIntensity={0.4} />
            </mesh>
          </group>
          {[[-0.5, 0.95, 0.7], [0.5, 0.95, 0.7]].map(([x, y, z], i) => (
            <group key={`lant-${i}`} position={[x, y, z]}>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.12, 6]} />
                <meshStandardMaterial color="#3a2a1a" />
              </mesh>
              <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[0.11, 0.14, 0.11]} />
                <meshStandardMaterial color="#ffd070" emissive="#ff9a3c" emissiveIntensity={1.4} transparent opacity={0.95} />
              </mesh>
              <pointLight
                ref={(el) => {
                  if (el) lanternRefs.current[i] = el;
                }}
                position={[0, -0.04, 0]}
                color="#ffb070"
                intensity={0.3}
                distance={2.2}
                decay={2}
              />
            </group>
          ))}
        </>
      )}

      {/* Lv5+ — golden star crown + gem accents */}
      {level >= 5 && (
        <group position={[0, 1.9, 0]}>
          <mesh ref={starRef} castShadow>
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color={PALETTE.gold}
              metalness={1}
              roughness={0.1}
              emissive="#ffd24a"
              emissiveIntensity={0.8}
            />
          </mesh>
          <pointLight position={[0, 0, 0]} color="#ffe080" intensity={0.9} distance={3} decay={2} />
          <FxSparkles count={12} scale={[0.6, 0.6, 0.6]} size={2.2} speed={1.2} color="#fff0a0" />
          {[0, 1, 2, 3].map((i) => {
            const a = (i * Math.PI) / 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.42, -0.6, Math.sin(a) * 0.42]} castShadow>
                <octahedronGeometry args={[0.07, 0]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? PALETTE.crystal : PALETTE.flowerPurple}
                  metalness={0.6}
                  roughness={0.15}
                  emissive={i % 2 === 0 ? PALETTE.crystal : PALETTE.flowerPurple}
                  emissiveIntensity={0.9}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

/* ============================================================
   Plot
   ============================================================ */
function Plot({
  position,
  building,
  onClick,
  empty,
  highlight,
  selected,
}: {
  position: [number, number, number];
  building?: { id: string; level: number };
  onClick: () => void;
  empty: boolean;
  highlight?: boolean;
  selected?: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null!);
  const moveRing = useRef<THREE.Mesh>(null!);
  const moveDisc = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock }) => {
    if (ring.current && empty) {
      ring.current.rotation.z = clock.elapsedTime * 0.6;
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.07;
      ring.current.scale.set(s, s, 1);
    }
    if (moveRing.current && highlight) {
      moveRing.current.rotation.z = -clock.elapsedTime * 0.8;
      const s = 1 + Math.sin(clock.elapsedTime * 4 + position[0]) * 0.1;
      moveRing.current.scale.set(s, s, 1);
      const mat = moveRing.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(clock.elapsedTime * 4) * 0.25;
    }
    if (moveDisc.current && highlight) {
      const mat = moveDisc.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(clock.elapsedTime * 3) * 0.1;
    }
  });

  const highlightColor = selected ? "#ff5ea0" : empty ? "#7ee06a" : "#79f7e6";

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {highlight && (
        <>
          <mesh ref={moveDisc} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <circleGeometry args={[0.95, 32]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={moveRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[0.95, 1.15, 36]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          <FxSparkles count={12} scale={[1.4, 0.8, 1.4]} position={[0, 0.6, 0]} size={3} speed={0.8} color={highlightColor} />
          <Html center position={[0, selected ? 2.6 : 1.4, 0]} distanceFactor={9} style={{ pointerEvents: "none" }}>
            <div className={`${selected ? "bg-pink-500" : "bg-violet-600"} text-white text-[10px] font-bold rounded-full px-2 py-1 border-2 border-white shadow whitespace-nowrap`}>
              {selected ? "ВЫБРАНО" : empty ? "СЮДА" : "ПЕРЕНЕСТИ"}
            </div>
          </Html>
        </>
      )}
      {empty ? (
        <>
          {/* Soil patch */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
            <circleGeometry args={[0.85, 24]} />
            <meshStandardMaterial color="#a87b48" roughness={1} />
          </mesh>
          <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.6, 0.82, 32]} />
            <meshBasicMaterial color={PALETTE.flowerYellow} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <FxSparkles count={8} scale={[1, 0.6, 1]} position={[0, 0.5, 0]} size={2} speed={0.6} color="#ffe066" />
          <Html center position={[0, 0.95, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
            <div className="bg-white/95 text-amber-700 font-bold rounded-full w-9 h-9 flex items-center justify-center border-2 border-white shadow-card text-xl">
              +
            </div>
          </Html>
        </>
      ) : (
        <Float floatIntensity={hovered ? 0.6 : 0.15} rotationIntensity={hovered ? 0.3 : 0.05} speed={2}>
          <Building id={building!.id} level={building!.level} />
          <Html center position={[0, 1.9, 0]} distanceFactor={9} style={{ pointerEvents: "none" }}>
            <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-white shadow">
              {building!.level}
            </div>
          </Html>
        </Float>
      )}
    </group>
  );
}

/* ============================================================
   Lighting — bright sunny day
   ============================================================ */
/* ============================================================
   Day/Night cycle — shared signal + dynamic sky & lights
   ============================================================ */
const dayNight = { night: 0, warmth: 0 }; // night: 0 day → 1 deep night, warmth: 0..1 sunset/sunrise glow

function DayNightSystem({ speed = 0.012 }: { speed?: number }) {
  const skyRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null!);
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  const ambRef = useRef<THREE.AmbientLight>(null!);
  const hemiRef = useRef<THREE.HemisphereLight>(null!);
  const fillRef = useRef<THREE.DirectionalLight>(null!);
  const moonRef = useRef<THREE.DirectionalLight>(null!);
  const starsRef = useRef<THREE.Points>(null!);
  const sunPos = useMemo(() => new THREE.Vector3(), []);
  const { scene } = useThree();

  // Procedural starfield (cheap)
  const starsGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 180;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random();
      const v = Math.random() * 0.5 + 0.5; // upper hemisphere
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 80;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    // Cycle: 1 full day-night every ~2 minutes by default
    const t = clock.elapsedTime * speed;
    const angle = t * Math.PI * 2; // full revolution
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle) * 0.6;
    const sunZ = Math.cos(angle) * 0.8;
    // Distance for sky
    const D = 80;
    sunPos.set(sunX * D, sunY * D, sunZ * D);

    // night factor: 1 when sun fully below, 0 when high
    const dayAmt = THREE.MathUtils.clamp(sunY * 1.8 + 0.2, 0, 1); // soft transition
    const nightAmt = 1 - dayAmt;
    // warmth peaks near horizon (sunrise/sunset)
    const horizon = 1 - Math.min(Math.abs(sunY) * 2.5, 1);
    dayNight.night = nightAmt;
    dayNight.warmth = horizon * (1 - Math.max(nightAmt - 0.6, 0));

    // Sky uniforms
    if (skyRef.current?.material?.uniforms) {
      const u = skyRef.current.material.uniforms;
      if (u.sunPosition) u.sunPosition.value.copy(sunPos);
      if (u.turbidity) u.turbidity.value = 3 + horizon * 6;
      if (u.rayleigh) u.rayleigh.value = 1.6 + horizon * 2.2 + nightAmt * 0.5;
      if (u.mieCoefficient) u.mieCoefficient.value = 0.005 + horizon * 0.02;
      if (u.mieDirectionalG) u.mieDirectionalG.value = 0.85;
    }

    // Sun light
    if (sunRef.current) {
      sunRef.current.position.set(sunX * 25, Math.max(sunY, -0.2) * 25, sunZ * 25);
      sunRef.current.intensity = 2.2 * dayAmt;
      const c = new THREE.Color("#fff0c8").lerp(new THREE.Color("#ff8a4a"), horizon * 0.8);
      sunRef.current.color.copy(c);
    }
    // Ambient
    if (ambRef.current) {
      ambRef.current.intensity = 0.35 + dayAmt * 0.55;
      const c = new THREE.Color("#fff4d8").lerp(new THREE.Color("#1a2a4a"), nightAmt * 0.85);
      ambRef.current.color.copy(c);
    }
    // Hemisphere
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.3 + dayAmt * 0.6;
      hemiRef.current.color = new THREE.Color("#cdeaff").lerp(new THREE.Color("#2a3a6a"), nightAmt) as THREE.Color;
      hemiRef.current.groundColor = new THREE.Color("#5fb050").lerp(new THREE.Color("#1a2030"), nightAmt) as THREE.Color;
    }
    // Fill
    if (fillRef.current) {
      fillRef.current.intensity = 0.2 + dayAmt * 0.4;
    }
    // Moon
    if (moonRef.current) {
      moonRef.current.position.set(-sunX * 25, Math.max(-sunY, -0.2) * 25, -sunZ * 25);
      moonRef.current.intensity = 0.6 * nightAmt;
    }
    // Stars
    if (starsRef.current) {
      const m = starsRef.current.material as THREE.PointsMaterial;
      m.opacity = nightAmt;
      starsRef.current.visible = nightAmt > 0.02;
    }
    // Fog tint
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      const c = new THREE.Color("#bfe6f5")
        .lerp(new THREE.Color("#ff9a6a"), horizon * 0.6)
        .lerp(new THREE.Color("#0a1530"), nightAmt * 0.85);
      scene.fog.color.copy(c);
    }
  });

  return (
    <>
      <Sky ref={skyRef as unknown as Ref<never>} sunPosition={[18, 25, 14]} turbidity={3} rayleigh={1.8} mieCoefficient={0.005} mieDirectionalG={0.85} />
      <ambientLight ref={ambRef} intensity={0.75} color="#fff4d8" />
      <hemisphereLight ref={hemiRef} args={["#cdeaff", "#5fb050", 0.7]} />
      <directionalLight
        ref={sunRef}
        position={[18, 25, 14]}
        intensity={2.2}
        color="#fff0c8"
      />
      <directionalLight ref={fillRef} position={[-12, 8, -8]} intensity={0.5} color="#a8d8ff" />
      <directionalLight ref={moonRef} position={[-18, -25, -14]} intensity={0} color="#9bb8ff" />
      <points ref={starsRef} geometry={starsGeom}>
        <pointsMaterial color="#ffffff" size={0.35} sizeAttenuation transparent opacity={0} depthWrite={false} />
      </points>
    </>
  );
}

/* ============================================================
   Window glows — soft warm panes + point light on each filled plot,
   intensity tracks the global night factor.
   ============================================================ */
function WindowGlows({ slots, buildings }: { slots: [number, number][]; buildings: (GameState["buildings"][number] | undefined)[] }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!groupRef.current) return;
    const n = dayNight.night;
    groupRef.current.visible = n > 0.03;
    groupRef.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissiveIntensity !== undefined && mesh.userData.glow) {
          mat.emissiveIntensity = (mesh.userData.baseGlow ?? 1.6) * n;
        }
      } else if ((obj as THREE.PointLight).isLight) {
        const l = obj as THREE.PointLight;
        if (l.userData.glow) l.intensity = (l.userData.baseGlow ?? 1.4) * n;
      }
    });
  });
  return (
    <group ref={groupRef}>
      {slots.map((p, i) => {
        const b = buildings[i];
        if (!b) return null;
        const offsets: [number, number, number][] = [
          [-0.35, 0.85, 0.46],
          [0.35, 0.85, 0.46],
          [-0.35, 0.85, -0.46],
          [0.35, 0.85, -0.46],
        ];
        return (
          <group key={i} position={[p[0], 0.55, p[1]]}>
            {offsets.map((o, j) => (
              <mesh
                key={j}
                position={o}
                rotation={[0, j < 2 ? 0 : Math.PI, 0]}
                userData={{ glow: true, baseGlow: 1.8 }}
              >
                <planeGeometry args={[0.28, 0.22]} />
                <meshStandardMaterial
                  color="#fff0a8"
                  emissive="#ffb734"
                  emissiveIntensity={0}
                  transparent
                  opacity={0.95}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
            <pointLight
              position={[0, 0.7, 0]}
              color="#ffc080"
              intensity={0}
              distance={3.5}
              decay={2}
              userData={{ glow: true, baseGlow: 1.4 }}
            />
          </group>
        );
      })}
    </group>
  );
}


/* ============================================================
   Instanced grass field — wind-animated via shader patch
   ============================================================ */
function GrassField({ count = 900, tint = "#6fd16a" }: { count?: number; tint?: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const shaderRef = useRef<{ uniforms: { uTime: { value: number } } } | null>(null);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.08, 0.35, 1, 2);
    g.translate(0, 0.175, 0);
    return g;
  }, []);

  const { matrices, colors } = useMemo(() => {
    const rng = mulberry32(2025);
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    const tmp = new THREE.Object3D();
    const palette = [
      new THREE.Color("#6fd16a"),
      new THREE.Color("#4ab84a"),
      new THREE.Color("#8de07a"),
      new THREE.Color("#2d8c3e"),
      new THREE.Color("#a8e890"),
    ];
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = 0.5 + Math.sqrt(rng()) * 6.4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 1.2 && Math.abs(z) < 1.2) continue;
      tmp.position.set(x, 0.5, z);
      tmp.rotation.set(0, rng() * Math.PI * 2, 0);
      const s = 0.7 + rng() * 1.1;
      tmp.scale.set(1, s, 1);
      tmp.updateMatrix();
      mats.push(tmp.matrix.clone());
      cols.push(palette[Math.floor(rng() * palette.length)]);
    }
    return { matrices: mats, colors: cols };
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;
    const m = meshRef.current;
    const col = new THREE.Color();
    matrices.forEach((mat, i) => {
      m.setMatrixAt(i, mat);
      col.copy(colors[i]);
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader =
        "uniform float uTime;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float ix = instanceMatrix[3][0];
          float iz = instanceMatrix[3][2];
          float sway = sin(uTime * 1.6 + ix * 0.7 + iz * 0.5) * 0.12;
          transformed.x += sway * position.y;
          transformed.z += sway * 0.5 * position.y;`,
        );
      shaderRef.current = shader as unknown as { uniforms: { uTime: { value: number } } };
    };
    mat.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <instancedMesh ref={meshRef} args={[geom, undefined, matrices.length]} receiveShadow>
      <meshStandardMaterial ref={matRef} color={tint} side={THREE.DoubleSide} roughness={0.9} />
    </instancedMesh>
  );
}

/* ============================================================
   Animated foam ring around the island
   ============================================================ */
function FoamRing() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const s = 1 + Math.sin(t * 1.4) * 0.012;
    ref.current.scale.set(s, 1, s);
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.55 + Math.sin(t * 1.8) * 0.15;
  });
  return (
    <mesh ref={ref} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[8.4, 9.2, 64]} />
      <meshBasicMaterial color="#f0fbff" transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

/* ============================================================
   Beach decor — shells, starfish, driftwood
   ============================================================ */
function BeachDecor() {
  const items = useMemo(() => {
    const rng = mulberry32(99);
    return Array.from({ length: 14 }).map((_, i) => {
      const a = rng() * Math.PI * 2;
      const r = 7.2 + rng() * 0.9;
      const type = i % 3;
      return {
        pos: [Math.cos(a) * r, 0.42, Math.sin(a) * r] as [number, number, number],
        rot: rng() * Math.PI * 2,
        type,
      };
    });
  }, []);
  return (
    <group>
      {items.map((it, i) => {
        if (it.type === 0) {
          return (
            <mesh key={i} position={it.pos} rotation={[Math.PI / 2.4, 0, it.rot]} castShadow>
              <sphereGeometry args={[0.13, 10, 8, 0, Math.PI]} />
              <meshStandardMaterial color="#ffd9c2" roughness={0.5} />
            </mesh>
          );
        }
        if (it.type === 1) {
          return (
            <group key={i} position={it.pos} rotation={[0, it.rot, 0]}>
              {[0, 1, 2, 3, 4].map((j) => (
                <mesh
                  key={j}
                  position={[Math.cos((j * Math.PI * 2) / 5) * 0.14, 0, Math.sin((j * Math.PI * 2) / 5) * 0.14]}
                  rotation={[0, (j * Math.PI * 2) / 5, 0]}
                >
                  <coneGeometry args={[0.07, 0.22, 6]} />
                  <meshStandardMaterial color="#ff7e5a" roughness={0.6} />
                </mesh>
              ))}
              <mesh>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshStandardMaterial color="#ff9a78" />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={i} position={it.pos} rotation={[0, it.rot, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.55, 8]} />
            <meshStandardMaterial color="#8a5a30" roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ============================================================
   Crab — walks sideways along the beach
   ============================================================ */
function Crab({ seed = 0 }: { seed?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);
  const phase = seed * 1.7;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.3 + phase;
    const r = 7.4;
    ref.current.position.x = Math.cos(t) * r;
    ref.current.position.z = Math.sin(t) * r;
    ref.current.position.y = 0.46;
    ref.current.rotation.y = -t + Math.PI / 2;
    const wig = Math.sin(clock.elapsedTime * 8 + phase) * 0.4;
    if (legL.current) legL.current.rotation.z = wig;
    if (legR.current) legR.current.rotation.z = -wig;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial color="#e54a3a" roughness={0.5} />
      </mesh>
      <mesh position={[0.06, 0.1, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.06, 0.1, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <group ref={legL} position={[0.1, 0, 0]}>
        <mesh position={[0.22, 0, 0.08]}>
          <boxGeometry args={[0.14, 0.05, 0.08]} />
          <meshStandardMaterial color="#e54a3a" />
        </mesh>
      </group>
      <group ref={legR} position={[-0.1, 0, 0]}>
        <mesh position={[-0.22, 0, 0.08]}>
          <boxGeometry args={[0.14, 0.05, 0.08]} />
          <meshStandardMaterial color="#e54a3a" />
        </mesh>
      </group>
    </group>
  );
}

/* ============================================================
   Dolphin — occasional jump arc far from shore
   ============================================================ */
function Dolphin({ radius = 18, speed = 0.18, phase = 0 }: { radius?: number; speed?: number; phase?: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + phase;
    const cycle = (clock.elapsedTime * 0.35 + phase) % 6;
    let y = -0.8;
    let pitch = 0;
    if (cycle < 1.2) {
      const k = cycle / 1.2;
      y = -0.8 + Math.sin(k * Math.PI) * 1.6;
      pitch = Math.cos(k * Math.PI) * 0.9;
    }
    ref.current.position.set(Math.cos(t) * radius, y, Math.sin(t) * radius);
    ref.current.rotation.set(pitch, -t + Math.PI / 2, 0);
    ref.current.visible = cycle < 1.4;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshStandardMaterial color="#5a7d96" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.4]} scale={[0.7, 0.7, 1.2]}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color="#5a7d96" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.05, 0.35]} scale={[0.7, 0.55, 1]}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color="#dfe9ee" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.3, -0.05]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.1, 0.3, 4]} />
        <meshStandardMaterial color="#46647a" />
      </mesh>
      <mesh position={[0, -0.05, -0.55]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.25, 4]} />
        <meshStandardMaterial color="#46647a" />
      </mesh>
    </group>
  );
}

/* ============================================================
   Ambient details: hills, shells, driftwood, grass tufts,
   barrels, crates, sand path tiles
   ============================================================ */
function Hill({ position, scale = 1, tint }: { position: [number, number, number]; scale?: number; tint: string }) {
  return (
    <mesh position={position} scale={[scale, scale * 0.45, scale]} receiveShadow castShadow>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color={tint} roughness={0.95} />
    </mesh>
  );
}

function Shell({ position, color = "#ffd8c2" }: { position: [number, number, number]; color?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.4 + position[0]) * 0.1;
  });
  return (
    <group ref={ref} position={position} scale={0.18}>
      <mesh castShadow>
        <sphereGeometry args={[1, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[0, (i / 5) * Math.PI - Math.PI / 2, 0]} position={[0, 0.02, 0]}>
          <boxGeometry args={[0.04, 0.02, 1]} />
          <meshStandardMaterial color="#e8a890" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Driftwood({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.16, 1.4, 8]} />
        <meshStandardMaterial color="#a47148" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0.55, 0.05, 0.1]} rotation={[0, 0.3, Math.PI / 2.2]}>
        <cylinderGeometry args={[0.07, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#8a5a36" roughness={0.95} />
      </mesh>
    </group>
  );
}

function GrassTuft({ position, tint }: { position: [number, number, number]; tint: string }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.06, 0.08, Math.sin(a) * 0.06]} rotation={[0, a, 0.15]}>
            <coneGeometry args={[0.03, 0.22, 4]} />
            <meshStandardMaterial color={tint} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Barrel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.36, 14]} />
        <meshStandardMaterial color="#8a5a30" roughness={0.85} />
      </mesh>
      {[0.05, 0.18, 0.31].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[0.185, 0.018, 6, 18]} />
          <meshStandardMaterial color="#3a2a18" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 14]} />
        <meshStandardMaterial color="#6b3a1c" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Crate({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.17, 0]}>
        <boxGeometry args={[0.36, 0.34, 0.36]} />
        <meshStandardMaterial color="#c98a4a" roughness={0.9} />
      </mesh>
      {[
        [0.18, 0.17, 0, 0.36, 0.34, 0.05],
        [-0.18, 0.17, 0, 0.36, 0.34, 0.05],
        [0, 0.17, 0.18, 0.05, 0.34, 0.36],
        [0, 0.17, -0.18, 0.05, 0.34, 0.36],
      ].map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]}>
          <boxGeometry args={[b[3], 0.05, b[5]]} />
          <meshStandardMaterial color="#6b3a1c" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function PathSegment({
  position,
  rotation = 0,
  length = 1,
  width = 0.95,
  index = 0,
}: {
  position: [number, number, number];
  rotation?: number;
  length?: number;
  width?: number;
  index?: number;
}) {
  // Slightly lifted above grass so it never z-fights or sinks under terrain.
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Soft dirt halo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[length + 0.32, width + 0.32]} />
        <meshStandardMaterial color="#7a5a32" roughness={1} transparent opacity={0.55} />
      </mesh>
      {/* Dark border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <planeGeometry args={[length + 0.16, width + 0.16]} />
        <meshStandardMaterial color="#6b4a24" roughness={1} />
      </mesh>
      {/* Sand surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color={PALETTE.sandLight} roughness={1} />
      </mesh>
      {/* Raised stone curbs along both sides */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.05, s * (width / 2 + 0.02)]} castShadow receiveShadow>
          <boxGeometry args={[length + 0.04, 0.1, 0.09]} />
          <meshStandardMaterial color="#a89878" roughness={0.85} />
        </mesh>
      ))}
      {/* Repeating premium tile pattern */}
      {Array.from({ length: Math.max(2, Math.round(length / 0.42)) }).map((_, i, arr) => {
        const t = (i + 0.5) / arr.length;
        const x = (t - 0.5) * length;
        const tileLen = (length / arr.length) * 0.82;
        const tileWid = width * 0.78;
        const dark = (i + index) % 2 === 0;
        return (
          <group key={i} position={[x, 0.022, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[tileLen, tileWid]} />
              <meshStandardMaterial
                color={dark ? PALETTE.pathStone : "#ece3c8"}
                roughness={0.9}
              />
            </mesh>
            {/* Grout line accent */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[tileLen / 2 + 0.01, 0.001, 0]}>
              <planeGeometry args={[0.025, tileWid + 0.02]} />
              <meshStandardMaterial color="#8a7654" roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function BuildingSurround({ position, seed }: { position: [number, number, number]; seed: number }) {
  const rng = useMemo(() => mulberry32(seed * 97 + 13), [seed]);
  const props = useMemo(() => {
    const items: { kind: "barrel" | "crate" | "tuft" | "flower"; offset: [number, number]; rot: number }[] = [];
    const n = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const r = 0.85 + rng() * 0.35;
      const kind = (["barrel", "crate", "tuft", "flower"] as const)[Math.floor(rng() * 4)];
      items.push({ kind, offset: [Math.cos(a) * r, Math.sin(a) * r], rot: rng() * Math.PI });
    }
    return items;
  }, [rng]);
  return (
    <group position={position}>
      {props.map((p, i) => {
        const pos: [number, number, number] = [p.offset[0], 0, p.offset[1]];
        if (p.kind === "barrel") return <Barrel key={i} position={pos} />;
        if (p.kind === "crate") return <Crate key={i} position={pos} rotation={p.rot} />;
        if (p.kind === "tuft") return <GrassTuft key={i} position={pos} tint={PALETTE.grassMid} />;
        return (
          <Flower
            key={i}
            position={[pos[0], 0, pos[2]]}
            color={[PALETTE.flowerPink, PALETTE.flowerYellow, PALETTE.flowerOrange][i % 3]}
            delay={i * 0.7}
          />
        );
      })}
    </group>
  );
}

/* ============================================================
   Scene
   ============================================================ */

function IslandScene({ state, onPlotClick, moveMode, movingFrom, lowPower = false }: IslandViewProps) {

  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;
  const tint = useMemo(() => {
    switch (island.id) {
      case "volcano":
        return "#6a4a3a";
      case "crystal":
        return "#7ad0c0";
      case "golden":
        return "#d8c25a";
      default:
        return PALETTE.grassTop;
    }
  }, [island.id]);

  const palms = useMemo(
    () =>
      [
        [-5.5, 0.4, 1.5, 1.15, 0],
        [5.2, 0.4, -1.8, 1.05, 0.5],
        [-3.5, 0.4, 4.8, 0.95, 1.2],
        [4.7, 0.4, 4.2, 1.1, 1.8],
        [-6, 0.4, -3, 1, 0.3],
        [3.2, 0.4, -5.2, 1.05, 0.9],
        [-6.2, 0.4, 4.5, 0.85, 2.4],
      ] as [number, number, number, number, number][],
    [],
  );

  const trees = useMemo(
    () =>
      [
        [-4.8, 0.45, -4.2, 1],
        [5.4, 0.45, 3.6, 0.9],
        [-2.8, 0.45, -6, 0.95],
      ] as [number, number, number, number][],
    [],
  );

  const decor = useMemo(() => {
    const rng = mulberry32(42);
    const flowerColors = [PALETTE.flowerPink, PALETTE.flowerOrange, PALETTE.flowerPurple, PALETTE.flowerYellow, PALETTE.flowerWhite];
    const flowers = Array.from({ length: 40 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 2.2 + rng() * 4.8;
      return {
        pos: [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number],
        color: flowerColors[Math.floor(rng() * flowerColors.length)],
        delay: rng() * 6,
      };
    });
    const rocks = Array.from({ length: 14 }).map((_, i) => {
      const a = rng() * Math.PI * 2;
      const r = 4.8 + rng() * 2.8;
      return {
        pos: [Math.cos(a) * r, 0.25, Math.sin(a) * r] as [number, number, number],
        scale: 0.4 + rng() * 0.9,
        seed: i,
      };
    });
    const bushes = Array.from({ length: 16 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 2.6 + rng() * 4.2;
      return [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number];
    });
    const mushrooms = Array.from({ length: 12 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 3 + rng() * 3.8;
      return [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number];
    });
    const lanterns = [
      [-2.3, 0.5, -1.5],
      [2.3, 0.5, -1.5],
      [-2.3, 0.5, 2.1],
      [2.3, 0.5, 2.1],
    ] as [number, number, number][];
    const grassTufts = Array.from({ length: 30 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 1.5 + rng() * 5.5;
      return [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number];
    });
    // Shells & driftwood scattered on the sandy beach ring
    const shells = Array.from({ length: 12 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 8.0 + rng() * 0.7;
      return {
        pos: [Math.cos(a) * r, 0.22, Math.sin(a) * r] as [number, number, number],
        color: (["#ffd8c2", "#ffeed0", "#f8c0d0", "#fff4d8"] as const)[Math.floor(rng() * 4)],
      };
    });
    const driftwood = Array.from({ length: 4 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 7.8 + rng() * 0.9;
      return {
        pos: [Math.cos(a) * r, 0.22, Math.sin(a) * r] as [number, number, number],
        rot: rng() * Math.PI,
      };
    });
    return { flowers, rocks, bushes, mushrooms, lanterns, grassTufts, shells, driftwood };
  }, []);


  // Build a grid of legal plot positions that avoids every plant/decor footprint.
  const slots = useMemo<[number, number][]>(() => {
    const forbidden: { x: number; z: number; r: number }[] = [];
    for (const p of palms) forbidden.push({ x: p[0], z: p[2], r: 1.7 });
    for (const t of trees) forbidden.push({ x: t[0], z: t[2], r: 1.6 });
    for (const r of decor.rocks) forbidden.push({ x: r.pos[0], z: r.pos[2], r: 0.9 + r.scale * 0.4 });
    for (const b of decor.bushes) forbidden.push({ x: b[0], z: b[2], r: 1.1 });
    for (const m of decor.mushrooms) forbidden.push({ x: m[0], z: m[2], r: 0.85 });
    for (const f of decor.flowers) forbidden.push({ x: f.pos[0], z: f.pos[2], r: 0.7 });
    for (const l of decor.lanterns) forbidden.push({ x: l[0], z: l[2], r: 0.9 });
    // Centerpieces
    forbidden.push({ x: 0, z: 0, r: 1.5 });   // Fountain
    forbidden.push({ x: -6, z: -1, r: 1.0 }); // FlagPole
    forbidden.push({ x: 7.2, z: 0, r: 1.5 }); // Bridge
    forbidden.push({ x: -6.5, z: 4, r: 1.3 }); // Lighthouse cosmetic
    forbidden.push({ x: 6, z: -4, r: 1.2 });   // Statue cosmetic
    return generatePlotGrid(forbidden);
  }, [palms, trees, decor]);

  return (
    <>
      <fog attach="fog" args={["#bfe6f5", 30, 75]} />
      <DayNightSystem />
      {!lowPower && <Environment preset="park" />}

      <Ocean />
      {!lowPower && (
        <Sparkles count={30} scale={[60, 1, 60]} position={[0, -0.15, 0]} size={3} speed={0.3} color="#ffffff" />
      )}

      <group scale={ISLAND_SCALE}>
      <IslandBase grassTint={tint} />
      
      <FoamRing />
      <BeachDecor />

      

      {/* Vegetation — wrapped in NoHit so it never blocks plot clicks */}
      <NoHit>
        {palms.map((p, i) => (
          <Palm key={`palm-${i}`} position={[p[0], p[1], p[2]]} scale={p[3]} delay={p[4]} />
        ))}
        {trees.map((t, i) => (
          <Tree key={`tree-${i}`} position={[t[0], t[1], t[2]]} scale={t[3]} />
        ))}
        {decor.flowers.map((f, i) => (
          <Flower key={`f-${i}`} position={f.pos} color={f.color} delay={f.delay} />
        ))}
        {decor.rocks.map((r, i) => (
          <Rock key={`r-${i}`} position={r.pos} scale={r.scale} seed={r.seed} />
        ))}
        {decor.bushes.map((p, i) => (
          <Bush key={`b-${i}`} position={p} />
        ))}
        {decor.mushrooms.map((p, i) => (
          <Mushroom key={`m-${i}`} position={p} />
        ))}
        {decor.lanterns.map((p, i) => (
          <Lantern key={`l-${i}`} position={p} />
        ))}
        {decor.grassTufts.map((p, i) => (
          <GrassTuft key={`gt-${i}`} position={p} tint={PALETTE.grassMid} />
        ))}
        {decor.shells.map((s, i) => (
          <Shell key={`sh-${i}`} position={s.pos} color={s.color} />
        ))}
        {decor.driftwood.map((d, i) => (
          <Driftwood key={`dw-${i}`} position={d.pos} rotation={d.rot} />
        ))}

        {/* Centerpiece decor */}
        <Fountain position={[0, 0.45, 0]} />
        <FlagPole position={[-6, 0.45, -1]} />
        <Bridge position={[7.2, -0.05, 0]} rotation={Math.PI / 2} />
      </NoHit>


      {/* Cosmetics — also non-interactive */}
      {state.cosmetics.includes("lighthouse") && (
        <NoHit>
          <group position={[-6.5, 0.4, 4]}>
            <mesh castShadow position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.45, 0.6, 0.4, 16]} />
              <meshStandardMaterial color={PALETTE.rockLight} />
            </mesh>
            <mesh castShadow position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.32, 0.45, 1.6, 16]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {[0.9, 1.6, 2.2].map((y, i) => (
              <mesh key={i} position={[0, y, 0]}>
                <cylinderGeometry args={[0.34, 0.34, 0.18, 16]} />
                <meshStandardMaterial color={PALETTE.roofRed} />
              </mesh>
            ))}
            <mesh position={[0, 2.65, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.35, 12]} />
              <meshStandardMaterial color={PALETTE.flowerYellow} emissive="#ffaa00" emissiveIntensity={1.5} />
            </mesh>
            <mesh castShadow position={[0, 2.95, 0]}>
              <coneGeometry args={[0.4, 0.4, 12]} />
              <meshStandardMaterial color={PALETTE.roofRed} />
            </mesh>
            <pointLight position={[0, 2.65, 0]} color="#ffcc66" intensity={2.5} distance={10} />
          </group>
        </NoHit>
      )}
      {state.cosmetics.includes("statue") && (
        <NoHit>
          <group position={[6, 0.4, -4]}>
            <mesh castShadow position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.5, 0.55, 0.5, 12]} />
              <meshStandardMaterial color={PALETTE.rockLight} />
            </mesh>
            <mesh castShadow position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.18, 0.3, 0.6, 12]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh castShadow position={[0, 1.35, 0]}>
              <sphereGeometry args={[0.28, 16, 14]} />
              <meshStandardMaterial color={PALETTE.gold} metalness={0.8} roughness={0.2} emissive="#ffae00" emissiveIntensity={0.2} />
            </mesh>
            <pointLight position={[0, 1.4, 0]} color="#ffd060" intensity={0.8} distance={3} />
          </group>
        </NoHit>
      )}

      {/* Sand road from the central fountain to every built plot — gentle bezier curve */}
      <NoHit>
        {slots.map((pos, i) => {
          if (!state.buildings[i]) return null;
          const ex = pos[0];
          const ez = pos[1];
          const dist = Math.hypot(ex, ez);
          if (dist < 0.4) return null;
          const baseAngle = Math.atan2(ez, ex);
          // Curve control point: perpendicular offset from straight line midpoint.
          const perp = { x: -Math.sin(baseAngle), z: Math.cos(baseAngle) };
          // Deterministic curl direction per plot
          const curl = ((i * 73) % 7) / 7 - 0.5; // -0.5..0.5
          const bend = dist * 0.22 * (curl >= 0 ? 1 : -1) * (0.4 + Math.abs(curl));
          const cx = (ex / 2) + perp.x * bend;
          const cz = (ez / 2) + perp.z * bend;
          // Trim near building
          const trim = 0.85 / dist;
          const tEnd = 1 - trim;
          const segCount = Math.max(4, Math.round(dist / 0.7));
          const points: { x: number; z: number }[] = [];
          for (let k = 0; k <= segCount; k++) {
            const t = (k / segCount) * tEnd;
            const omt = 1 - t;
            const x = omt * omt * 0 + 2 * omt * t * cx + t * t * ex;
            const z = omt * omt * 0 + 2 * omt * t * cz + t * t * ez;
            points.push({ x, z });
          }
          return points.slice(0, -1).map((p, idx) => {
            const next = points[idx + 1];
            const mx = (p.x + next.x) / 2;
            const mz = (p.z + next.z) / 2;
            const segDx = next.x - p.x;
            const segDz = next.z - p.z;
            const segLen = Math.hypot(segDx, segDz);
            const segAngle = Math.atan2(segDz, segDx);
            return (
              <PathSegment
                key={`pth-${i}-${idx}`}
                position={[mx, 0.54, mz]}
                rotation={-segAngle}
                length={segLen + 0.04}
                width={0.9}
                index={idx}
              />
            );
          });
        })}
      </NoHit>



      {/* Plots / buildings */}
      {slots.map((pos, i) => {
        const hasBuilding = !!state.buildings[i];
        const ownedPlot = i < state.plots;
        if (!moveMode && !ownedPlot && !hasBuilding) return null;
        const isSource = movingFrom === i;
        const isHighlighted = !!moveMode && (
          isSource ||
          (movingFrom === null && hasBuilding) ||
          (movingFrom !== null && movingFrom !== undefined && movingFrom !== i && !hasBuilding)
        );
        return (
          <Plot
            key={i}
            position={[pos[0], 0.51, pos[1]]}
            building={state.buildings[i] ?? undefined}
            empty={!hasBuilding}
            highlight={isHighlighted}
            selected={isSource}
            onClick={() => onPlotClick(i)}
          />
        );
      })}

      {/* Decorative surroundings around every built plot */}
      <NoHit>
        {slots.map((pos, i) => {
          if (!state.buildings[i]) return null;
          return <BuildingSurround key={`bs-${i}`} position={[pos[0], 0.52, pos[1]]} seed={i + 1} />;
        })}
      </NoHit>

      <WindowGlows slots={slots} buildings={state.buildings.slice(0, slots.length)} />

      </group>

      {/* Clouds removed per user request */}

      <Bird radius={14} speed={0.4} height={10} color="#ffffff" accent="#ff9a3c" />
      {!lowPower && <Bird radius={11} speed={0.55} height={8.5} color="#f8e8d0" accent="#e85a3c" />}
      {!lowPower && <Bird radius={16} speed={0.3} height={11} color="#dceefb" accent="#3b8fe6" />}

      <Butterfly origin={[-2, 1, 2]} color={PALETTE.flowerPink} seed={1} />
      {!lowPower && <Butterfly origin={[2.5, 0.9, -2]} color="#80c8ff" seed={2} />}
      {!lowPower && <Butterfly origin={[0, 1.1, 4]} color={PALETTE.flowerYellow} seed={3} />}
      {!lowPower && <Butterfly origin={[-3, 1.1, -3]} color={PALETTE.flowerPurple} seed={4} />}

      <Fish radius={11} depth={-0.7} speed={0.5} color="#ff8040" />
      {!lowPower && <Fish radius={13} depth={-0.9} speed={-0.35} color="#60c0ff" />}
      {!lowPower && <Fish radius={9} depth={-0.6} speed={0.65} color="#ff60a0" />}

      <Crab seed={1} />
      {!lowPower && <Crab seed={3} />}
      {!lowPower && <Crab seed={7} />}
      {/* Floating pollen / pixie dust over the island for atmosphere */}
      {!lowPower && (
        <Sparkles count={40} scale={[14, 5, 14]} position={[0, 3, 0]} size={2} speed={0.25} color="#fff4c0" />
      )}
      <Dolphin radius={20} phase={0} speed={0.18} />
      {!lowPower && <Dolphin radius={22} phase={3} speed={-0.16} />}
    </>
  );
}

/* ============================================================
   Camera controls
   ============================================================ */
function CameraRig() {
  return (
    <OrbitControls
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
      minDistance={18}
      maxDistance={55}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.4}
      target={[0, 0.5, 0]}
      makeDefault
    />
  );
}

/* ============================================================
   Public component
   ============================================================ */
export function IslandView({ state, onPlotClick, moveMode, movingFrom }: IslandViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;

  // Auto-detect low-power devices (more aggressive than before).
  const autoLow = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const narrow = typeof window !== "undefined" && window.innerWidth < 900;
    return mobile || narrow || cores <= 6 || mem <= 4;
  }, []);

  // User-controlled quality override stored in localStorage. Cycles auto → high → low.
  type Quality = "auto" | "high" | "low";
  const [quality, setQuality] = useState<Quality>("auto");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("gfx-quality") as Quality | null;
    if (saved === "auto" || saved === "high" || saved === "low") setQuality(saved);
  }, []);
  const cycleQuality = () => {
    const next: Quality = quality === "auto" ? "high" : quality === "high" ? "low" : "auto";
    setQuality(next);
    if (typeof window !== "undefined") window.localStorage.setItem("gfx-quality", next);
  };

  const lowPower = quality === "low" ? true : quality === "high" ? false : autoLow;
  const qualityLabel = quality === "auto" ? `Авто (${lowPower ? "Низк." : "Выс."})` : quality === "high" ? "Высокое" : "Низкое";
  const qualityEmoji = lowPower ? "🌱" : "✨";

  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl bg-gradient-sky">
      {mounted && (
        <Canvas
          key={lowPower ? "low" : "high"}
          shadows={false}
          dpr={lowPower ? 1 : [1, 1.25]}
          camera={{ position: [26, 22, 26], fov: 45 }}
          gl={{ antialias: !lowPower, alpha: false, powerPreference: "high-performance", toneMappingExposure: 1.1, stencil: false, depth: true }}
          performance={{ min: 0.4 }}
          frameloop="always"
        >
          <Suspense fallback={null}>
            <LowPowerContext.Provider value={lowPower}>
              <IslandScene state={state} onPlotClick={onPlotClick} moveMode={moveMode} movingFrom={movingFrom} lowPower={lowPower} />
              <CameraRig />
            </LowPowerContext.Provider>
          </Suspense>
        </Canvas>
      )}

      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-card border-2 border-white pointer-events-none">
        <span className="font-display font-bold text-sm">
          {island.emoji} {island.name} · ×{island.rateBonus}
        </span>
      </div>

      <button
        type="button"
        onClick={cycleQuality}
        title="Качество графики"
        className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-card border-2 border-white text-xs font-display font-bold hover:bg-white transition-colors"
      >
        {qualityEmoji} {qualityLabel}
      </button>


      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[11px] px-3 py-1 rounded-full pointer-events-none backdrop-blur">
        Перетаскивайте — вращение · колесо/щипок — масштаб
      </div>
    </div>
  );
}
