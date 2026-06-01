import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Sky,
  Cloud,
  Clouds,
  Float,
  Sparkles,
  Html,
  Environment,
  ContactShadows,
  MeshWobbleMaterial,
} from "@react-three/drei";
import * as THREE from "three";
import { ISLANDS } from "@/game/data";
import type { GameState } from "@/game/types";

interface IslandViewProps {
  state: GameState;
  onPlotClick: (index: number) => void;
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
const PLOT_POSITIONS: [number, number][] = [
  [0, 0],
  [-3.2, -1.2],
  [3.2, -1.2],
  [-4.4, 1.8],
  [4.4, 1.8],
  [0, -3.6],
  [-2.2, 3.3],
  [2.2, 3.3],
  [-5.4, -2.6],
  [5.4, -2.6],
  [0, 4.6],
  [0, -5.2],
];

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
      {/* Rocky cliff accents around the shoreline */}
      {rocks.map((r, i) => (
        <mesh key={i} position={r.pos} scale={r.scale} rotation={[0, r.rot, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color={PALETTE.rockLight} roughness={0.95} />
        </mesh>
      ))}
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
      <Sparkles count={20} scale={[0.6, 1, 0.6]} position={[0, 0.7, 0]} size={2} speed={1.4} color="#a0f0ff" />
    </group>
  );
}

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

      {/* Gable triangular ends (front + back) */}
      <mesh castShadow position={[0, 1.05, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.55, 0.45, 3]} />
        <meshStandardMaterial color="#caa370" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.05, -0.48]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.55, 0.45, 3]} />
        <meshStandardMaterial color="#caa370" roughness={0.9} />
      </mesh>

      {/* Pitched thatched roof — multiple layered slabs for straw look */}
      {[0, 1, 2].map((i) => {
        const y = 1.0 + i * 0.08;
        const w = 1.3 - i * 0.18;
        const d = 1.25 - i * 0.18;
        const col = i === 0 ? "#b8853c" : i === 1 ? "#caa050" : "#dcbb68";
        return (
          <group key={`thatch-${i}`}>
            <mesh castShadow position={[-0.18, y + 0.08, 0]} rotation={[0, 0, 0.7]}>
              <boxGeometry args={[0.08, w, d]} />
              <meshStandardMaterial color={col} roughness={1} />
            </mesh>
            <mesh castShadow position={[0.18, y + 0.08, 0]} rotation={[0, 0, -0.7]}>
              <boxGeometry args={[0.08, w, d]} />
              <meshStandardMaterial color={col} roughness={1} />
            </mesh>
          </group>
        );
      })}
      {/* Ridge cap */}
      <mesh castShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[0.12, 0.08, 1.3]} />
        <meshStandardMaterial color="#7a4e1e" roughness={0.95} />
      </mesh>
      {/* Roof beam ends sticking out */}
      {[-0.5, 0.5].map((z, i) => (
        <mesh key={`beam-${i}`} castShadow position={[0, 1.32, z * 1.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#5a3818" />
        </mesh>
      ))}

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



function LumberBuilding({ stages }: { stages: number }) {
  const saw = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    if (saw.current) saw.current.rotation.z += dt * 5;
  });
  return (
    <>
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.7, 0.75, 0.16, 16]} />
        <meshStandardMaterial color={PALETTE.rockLight} />
      </mesh>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.1, 0.7, 0.9]} />
        <meshStandardMaterial color={PALETTE.woodLight} />
      </mesh>
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[1.25, 0.35, 1.05]} />
        <meshStandardMaterial color={PALETTE.roofTeal} />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[1.1, 0.06, 0.9]} />
        <meshStandardMaterial color={PALETTE.roofBlue} />
      </mesh>
      <mesh ref={saw} position={[0.65, 0.5, 0]}>
        <torusGeometry args={[0.22, 0.05, 8, 24]} />
        <meshStandardMaterial color="#dde2ea" metalness={0.95} roughness={0.15} emissive="#aaa" emissiveIntensity={0.1} />
      </mesh>
      {/* Stacked logs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow position={[-0.55, 0.18 + i * 0.12, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 10]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      ))}
      {stages >= 2 && (
        <mesh castShadow position={[-0.55, 0.5, -0.3]}>
          <boxGeometry args={[0.3, 0.5, 0.3]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
      )}
    </>
  );
}

function QuarryBuilding({ stages }: { stages: number }) {
  return (
    <>
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.7, 0.85, 0.2, 12]} />
        <meshStandardMaterial color={PALETTE.rockDark} />
      </mesh>
      <mesh castShadow position={[0.25, 0.45, 0.1]}>
        <dodecahedronGeometry args={[0.38]} />
        <meshStandardMaterial color={PALETTE.rockLight} />
      </mesh>
      <mesh castShadow position={[-0.3, 0.4, -0.15]}>
        <dodecahedronGeometry args={[0.32]} />
        <meshStandardMaterial color={PALETTE.rockLight} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -0.05]}>
        <dodecahedronGeometry args={[0.26]} />
        <meshStandardMaterial color={PALETTE.crystal} emissive={PALETTE.crystal} emissiveIntensity={0.5} />
      </mesh>
      {/* Pickaxe */}
      <group position={[0.5, 0.6, 0.4]} rotation={[0, 0, -0.6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshStandardMaterial color={PALETTE.woodDark} />
        </mesh>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.4, 0.06, 0.06]} />
          <meshStandardMaterial color="#cdd3dc" metalness={0.8} />
        </mesh>
      </group>
      {stages >= 2 && (
        <mesh castShadow position={[-0.5, 0.55, 0.3]}>
          <dodecahedronGeometry args={[0.22]} />
          <meshStandardMaterial color={PALETTE.crystal} emissive={PALETTE.crystal} emissiveIntensity={0.6} />
        </mesh>
      )}
    </>
  );
}

function WindmillBuilding() {
  const blades = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 1.4;
  });
  return (
    <>
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.18, 16]} />
        <meshStandardMaterial color={PALETTE.rockLight} />
      </mesh>
      <mesh castShadow position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.28, 0.42, 1.1, 16]} />
        <meshStandardMaterial color="#fff5e0" />
      </mesh>
      {/* Diagonal trim */}
      <mesh position={[0, 0.4, 0.43]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.6, 0.04, 0.02]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh position={[0, 0.7, 0.43]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.6, 0.04, 0.02]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      <mesh castShadow position={[0, 1.3, 0]}>
        <coneGeometry args={[0.32, 0.42, 12]} />
        <meshStandardMaterial color={PALETTE.roofRed} />
      </mesh>
      <mesh position={[0, 1.56, 0]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.7} />
      </mesh>
      <group ref={blades} position={[0, 1.15, 0.32]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <mesh castShadow position={[0, 0.4, 0]}>
              <boxGeometry args={[0.1, 0.75, 0.04]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.08, 0.4, 0.025]}>
              <boxGeometry args={[0.06, 0.7, 0.005]} />
              <meshStandardMaterial color={PALETTE.flagRed} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

function MarketBuilding({ stages }: { stages: number }) {
  return (
    <>
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[1.3, 0.16, 1.1]} />
        <meshStandardMaterial color={PALETTE.rockLight} />
      </mesh>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.55, 1]} />
        <meshStandardMaterial color="#fff1d0" />
      </mesh>
      {/* Striped awning roof */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.95, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.22, 0.4, 4]} />
          <meshStandardMaterial color={i % 2 ? PALETTE.roofRed : "#ffffff"} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[1.3, 0.06, 1.1]} />
        <meshStandardMaterial color={PALETTE.roofRed} />
      </mesh>
      {/* Open counter */}
      <mesh position={[0, 0.35, 0.52]}>
        <boxGeometry args={[0.9, 0.1, 0.06]} />
        <meshStandardMaterial color={PALETTE.woodDark} />
      </mesh>
      {/* Produce */}
      <mesh castShadow position={[-0.3, 0.45, 0.45]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#ff6b3a" />
      </mesh>
      <mesh castShadow position={[-0.1, 0.45, 0.45]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={PALETTE.flowerYellow} />
      </mesh>
      <mesh castShadow position={[0.15, 0.45, 0.45]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#88e066" />
      </mesh>
      {stages >= 2 && (
        <>
          {[-0.7, 0.7].map((x, i) => (
            <mesh key={i} position={[x, 0.18, 0.6]}>
              <boxGeometry args={[0.22, 0.32, 0.22]} />
              <meshStandardMaterial color={PALETTE.woodDark} />
            </mesh>
          ))}
        </>
      )}
    </>
  );
}

function RefineryBuilding() {
  const orb = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (orb.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.08;
      orb.current.scale.setScalar(s);
    }
  });
  return (
    <>
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.2, 16]} />
        <meshStandardMaterial color={PALETTE.rockDark} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#4a3a7a" />
      </mesh>
      <mesh castShadow position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.28, 0.4, 0.5, 12]} />
        <meshStandardMaterial color="#7a5aaa" emissive="#5030a0" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={orb} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshPhysicalMaterial
          color="#c490ff"
          emissive="#9050ff"
          emissiveIntensity={1.6}
          transmission={0.4}
          thickness={0.5}
          roughness={0.1}
        />
      </mesh>
      <Sparkles count={20} scale={[1, 1, 1]} position={[0, 1.55, 0]} size={3} speed={1} color="#c0a0ff" />
      <pointLight position={[0, 1.55, 0]} color="#b070ff" intensity={2.4} distance={5} />
    </>
  );
}

function Building({ id, level }: { id: string; level: number }) {
  const stages = Math.min(level, 3);
  const scale = 0.85 + stages * 0.12;
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
   Plot
   ============================================================ */
function Plot({
  position,
  building,
  onClick,
  empty,
}: {
  position: [number, number, number];
  building?: { id: string; level: number };
  onClick: () => void;
  empty: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock }) => {
    if (ring.current && empty) {
      ring.current.rotation.z = clock.elapsedTime * 0.6;
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.07;
      ring.current.scale.set(s, s, 1);
    }
  });

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
          <Sparkles count={8} scale={[1, 0.6, 1]} position={[0, 0.5, 0]} size={2} speed={0.6} color="#ffe066" />
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
    const N = 350;
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
      <Sky ref={skyRef as unknown as React.Ref<never>} sunPosition={[18, 25, 14]} turbidity={3} rayleigh={1.8} mieCoefficient={0.005} mieDirectionalG={0.85} />
      <ambientLight ref={ambRef} intensity={0.75} color="#fff4d8" />
      <hemisphereLight ref={hemiRef} args={["#cdeaff", "#5fb050", 0.7]} />
      <directionalLight
        ref={sunRef}
        position={[18, 25, 14]}
        intensity={2.2}
        color="#fff0c8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
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
   Scene
   ============================================================ */
function IslandScene({ state, onPlotClick }: IslandViewProps) {
  const lowPower = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return cores <= 4 || mem <= 4 || mobile;
  }, []);
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

  const slots = useMemo(
    () => PLOT_POSITIONS.slice(0, Math.max(state.plots, state.buildings.length)),
    [state.plots, state.buildings.length],
  );

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
    const flowers = Array.from({ length: 22 }).map((_, i) => {
      const a = rng() * Math.PI * 2;
      const r = 2.5 + rng() * 4.2;
      return {
        pos: [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number],
        color: flowerColors[Math.floor(rng() * flowerColors.length)],
        delay: rng() * 6,
      };
    });
    const rocks = Array.from({ length: 8 }).map((_, i) => {
      const a = rng() * Math.PI * 2;
      const r = 5.2 + rng() * 2.5;
      return {
        pos: [Math.cos(a) * r, 0.25, Math.sin(a) * r] as [number, number, number],
        scale: 0.5 + rng() * 0.8,
        seed: i,
      };
    });
    const bushes = Array.from({ length: 7 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 3 + rng() * 3.5;
      return [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number];
    });
    const mushrooms = Array.from({ length: 6 }).map(() => {
      const a = rng() * Math.PI * 2;
      const r = 3.5 + rng() * 3.2;
      return [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number];
    });
    const lanterns = [
      [-2.3, 0.5, -1.5],
      [2.3, 0.5, -1.5],
      [-2.3, 0.5, 2.1],
      [2.3, 0.5, 2.1],
    ] as [number, number, number][];
    return { flowers, rocks, bushes, mushrooms, lanterns };
  }, []);

  return (
    <>
      <fog attach="fog" args={["#bfe6f5", 35, 95]} />
      <DayNightSystem />
      <Environment preset="park" />

      <Ocean />
      <Sparkles count={60} scale={[60, 1, 60]} position={[0, -0.15, 0]} size={3} speed={0.3} color="#ffffff" />

      <IslandBase grassTint={tint} />
      <GrassField count={lowPower ? 380 : 900} tint={tint} />
      <FoamRing />
      <BeachDecor />
      <ContactShadows position={[0, 0.52, 0]} opacity={0.35} scale={20} blur={2.4} far={6} />

      <StonePath />
      <FenceRing />

      {/* Vegetation */}
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

      {/* Centerpiece decor */}
      <Fountain position={[0, 0.45, 0]} />
      <FlagPole position={[-6, 0.45, -1]} />
      <Bridge position={[7.2, -0.05, 0]} rotation={Math.PI / 2} />

      {/* Cosmetics */}
      {state.cosmetics.includes("lighthouse") && (
        <group position={[-6.5, 0.4, 4]}>
          <mesh castShadow position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.45, 0.6, 0.4, 16]} />
            <meshStandardMaterial color={PALETTE.rockLight} />
          </mesh>
          <mesh castShadow position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.32, 0.45, 1.6, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Red stripes */}
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
      )}
      {state.cosmetics.includes("statue") && (
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
      )}

      {/* Plots / buildings */}
      {slots.map((pos, i) => (
        <Plot
          key={i}
          position={[pos[0], 0.51, pos[1]]}
          building={state.buildings[i]}
          empty={!state.buildings[i]}
          onClick={() => onPlotClick(i)}
        />
      ))}

      {/* Sky life */}
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} bounds={[10, 2, 10]} position={[-8, 12, -6]} color="#ffffff" opacity={0.8} />
        <Cloud seed={2} bounds={[10, 2, 10]} position={[10, 14, 4]} color="#ffffff" opacity={0.7} />
        <Cloud seed={3} bounds={[8, 2, 8]} position={[0, 16, -10]} color="#ffffff" opacity={0.6} />
        <Cloud seed={4} bounds={[9, 2, 9]} position={[-6, 13, 10]} color="#ffffff" opacity={0.65} />
      </Clouds>

      <Bird radius={14} speed={0.4} height={10} color="#ffffff" accent="#ff9a3c" />
      <Bird radius={11} speed={0.55} height={8.5} color="#f8e8d0" accent="#e85a3c" />
      <Bird radius={16} speed={0.3} height={11} color="#dceefb" accent="#3b8fe6" />

      <Butterfly origin={[-2, 1, 2]} color={PALETTE.flowerPink} seed={1} />
      <Butterfly origin={[2.5, 0.9, -2]} color="#80c8ff" seed={2} />
      <Butterfly origin={[0, 1.1, 4]} color={PALETTE.flowerYellow} seed={3} />
      <Butterfly origin={[-3, 1.1, -3]} color={PALETTE.flowerPurple} seed={4} />

      <Fish radius={11} depth={-0.7} speed={0.5} color="#ff8040" />
      <Fish radius={13} depth={-0.9} speed={-0.35} color="#60c0ff" />
      <Fish radius={9} depth={-0.6} speed={0.65} color="#ff60a0" />

      <Crab seed={1} />
      {!lowPower && <Crab seed={3} />}
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
      minDistance={10}
      maxDistance={28}
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
export function IslandView({ state, onPlotClick }: IslandViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;

  // Detect low-power devices and tune renderer accordingly
  const lowPower = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return cores <= 4 || mem <= 4 || mobile;
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl bg-gradient-sky">
      {mounted && (
        <Canvas
          shadows={!lowPower}
          dpr={lowPower ? [1, 1.25] : [1, 1.75]}
          camera={{ position: [14, 12, 14], fov: 45 }}
          gl={{ antialias: !lowPower, alpha: false, powerPreference: "high-performance", toneMappingExposure: 1.15 }}
          frameloop="always"
        >
          <Suspense fallback={null}>
            <IslandScene state={state} onPlotClick={onPlotClick} />
            <CameraRig />
          </Suspense>
        </Canvas>
      )}

      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-card border-2 border-white pointer-events-none">
        <span className="font-display font-bold text-sm">
          {island.emoji} {island.name} · ×{island.rateBonus}
        </span>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[11px] px-3 py-1 rounded-full pointer-events-none backdrop-blur">
        Перетаскивайте — вращение · колесо/щипок — масштаб
      </div>
    </div>
  );
}
