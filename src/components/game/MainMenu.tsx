import { motion, AnimatePresence } from "motion/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Sky, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import {
  Play, Plus, Settings, Bell, Gift, Trophy, ShoppingBag,
  Swords, CalendarDays, LogOut, ChevronRight, Coins, TreePine, Mountain,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MainMenuProps {
  onPlay: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onLeaderboards: () => void;
  onDaily: () => void;
  onShop: () => void;
  onPrestige?: () => void;
  onAchievements?: () => void;
  onQuests?: () => void;
  onEvents?: () => void;
  hasSave: boolean;
}

const STORAGE_KEY = "island-tycoon-save-v2";

type SaveSnap = {
  level: number;
  xp: number;
  xpNext: number;
  gold: number;
  wood: number;
  stone: number;
  islandName: string;
  plots: number;
  buildings: number;
};

function loadSnap(): SaveSnap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const level = s.level ?? 1;
    const xpNext = Math.floor(50 * Math.pow(1.35, level - 1));
    return {
      level,
      xp: s.xp ?? 0,
      xpNext,
      gold: Math.floor(s.resources?.gold ?? 0),
      wood: Math.floor(s.resources?.wood ?? 0),
      stone: Math.floor(s.resources?.stone ?? 0),
      islandName: s.activeIsland ?? "paradise",
      plots: s.plots ?? 3,
      buildings: Array.isArray(s.buildings) ? s.buildings.filter(Boolean).length : 0,
    };
  } catch {
    return null;
  }
}

const fmt = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toString();
};

const MENU_COLORS = {
  ocean: "#32bfd7",
  oceanDeep: "#0b6e9a",
  foam: "#f4ffff",
  sand: "#efd184",
  grass: "#58c65b",
  grassDark: "#2f8f45",
  path: "#dccaa2",
  trunk: "#80502b",
  leaf: "#3ab35b",
  leafLight: "#7ddf6c",
  roofRed: "#df5650",
  roofBlue: "#3d8bd8",
  wall: "#f1d2a0",
  rock: "#9da9ad",
  wood: "#8a532f",
  darkWood: "#4a2a18",
  gold: "#f4c45a",
  };

function MenuCinematicBackdrop({ mounted }: { mounted: boolean }) {
  const lowPower = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return mobile || cores <= 6;
  }, []);

  if (!mounted) {
    return <div className="absolute inset-0 bg-[#8bdcf2]" />;
  }

  return (
    <div className="absolute inset-0 z-0 bg-[#8bdcf2]">
      <Canvas
        shadows={!lowPower}
        dpr={lowPower ? 1 : [1, 1.35]}
        camera={{ position: [17, 13, 18], fov: 42 }}
        gl={{
          antialias: !lowPower,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Suspense fallback={null}>
          <MenuScene lowPower={lowPower} />
        </Suspense>
      </Canvas>
    </div>
  );
}

function MenuScene({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <color attach="background" args={["#91dbf4"]} />
      <fog attach="fog" args={["#c9eef7", 34, 86]} />
      <Sky sunPosition={[12, 12, 4]} turbidity={5} rayleigh={1.6} mieCoefficient={0.008} mieDirectionalG={0.76} />
      <ambientLight color="#fff5dd" intensity={0.78} />
      <directionalLight position={[12, 16, 8]} intensity={2.15} color="#fff0c8" castShadow={!lowPower} />
      {!lowPower && <Environment preset="park" />}

      <CinematicCamera />
      <OceanSurface lowPower={lowPower} />
      <Archipelago />
      <CentralMenuIsland lowPower={lowPower} />
      <MenuShips lowPower={lowPower} />
      <MovingClouds />
      <SeagullFlock lowPower={lowPower} />
      <MenuFish lowPower={lowPower} />
      {!lowPower && <Sparkles count={38} scale={[42, 1, 42]} position={[0, 0.18, 0]} size={2.2} speed={0.22} color="#fff8d1" />}
    </>
  );
}

function CinematicCamera() {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.045;
    const radius = 22 + Math.sin(t * 1.7) * 1.2;
    camera.position.set(Math.cos(t) * radius, 12.8 + Math.sin(t * 0.8) * 0.65, Math.sin(t) * radius);
    camera.lookAt(0, 1.2, 0);
  });
  return null;
}

function OceanSurface({ lowPower }: { lowPower: boolean }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const glint = useRef<THREE.Mesh>(null!);
  const geometry = useMemo(() => new THREE.PlaneGeometry(120, 120, lowPower ? 36 : 58, lowPower ? 36 : 58), [lowPower]);
  const original = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = original[i];
      const y = original[i + 1];
      pos[i + 2] = Math.sin(x * 0.32 + t * 1.15) * 0.16 + Math.cos(y * 0.25 + t * 0.82) * 0.12;
    }
    geometry.attributes.position.needsUpdate = true;
    if (glint.current) {
      glint.current.position.x = Math.sin(t * 0.18) * 2.2;
      (glint.current.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 1.1) * 0.06;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
        <circleGeometry args={[72, 96]} />
        <meshBasicMaterial color={MENU_COLORS.oceanDeep} />
      </mesh>
      <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} receiveShadow>
        <meshStandardMaterial color={MENU_COLORS.ocean} roughness={0.18} metalness={0.18} transparent opacity={0.82} />
      </mesh>
      <mesh ref={glint} rotation={[-Math.PI / 2, 0, -0.35]} position={[1.5, -0.11, -8]}>
        <planeGeometry args={[18, 5]} />
        <meshBasicMaterial color="#fff7c7" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <WaveLines />
    </group>
  );
}

function WaveLines() {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = Math.sin(clock.elapsedTime * 0.35) * 0.5;
  });
  return (
    <group ref={group} position={[0, -0.08, 0]}>
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0.12]} position={[-24 + i * 5, 0.02, -25 + (i % 4) * 9]}>
          <planeGeometry args={[3.8, 0.05]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function CentralMenuIsland({ lowPower }: { lowPower: boolean }) {
  const island = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (island.current) island.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.025;
  });

  const palms: [number, number, number, number][] = [
    [-5.2, 0.55, -2.8, 1.25],
    [-4.4, 0.55, 2.9, 0.92],
    [-1.9, 0.55, 4.9, 1.1],
    [2.9, 0.55, 4.3, 0.86],
    [5.1, 0.55, 1.4, 1.16],
    [4.8, 0.55, -3.2, 0.94],
    [-1.0, 0.55, -5.1, 1.05],
  ];

  return (
    <group ref={island}>
      <mesh position={[0, -1.05, 0]} receiveShadow>
        <cylinderGeometry args={[8.8, 10.4, 1.55, 88]} />
        <meshStandardMaterial color="#8f6637" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.34, 0]} receiveShadow>
        <cylinderGeometry args={[8.2, 9.2, 0.58, 88]} />
        <meshStandardMaterial color={MENU_COLORS.sand} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[6.55, 7.35, 0.72, 88]} />
        <meshStandardMaterial color={MENU_COLORS.grass} roughness={0.78} />
      </mesh>
      <mesh position={[-1.8, 0.58, -0.7]} scale={[1.15, 0.42, 0.95]} castShadow receiveShadow>
        <sphereGeometry args={[2.2, 28, 14]} />
        <meshStandardMaterial color={MENU_COLORS.grassDark} roughness={0.85} />
      </mesh>
      <mesh position={[3.25, 0.42, -1.8]} scale={[1.15, 0.48, 0.75]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.08, 0]} />
        <meshStandardMaterial color={MENU_COLORS.rock} roughness={0.92} />
      </mesh>
      <FoamRings />
      <PathNetwork />
      <FountainMini />
      <MenuHouse position={[-2.7, 0.62, 1.35]} roof={MENU_COLORS.roofRed} scale={1.05} />
      <MenuHouse position={[2.45, 0.62, 1.8]} roof={MENU_COLORS.roofBlue} scale={0.92} />
      <MenuHouse position={[0.85, 0.64, -2.65]} roof="#e5ad3f" scale={0.82} />
      <Banner position={[-4.8, 0.62, -0.15]} color="#e84e5f" />
      <Banner position={[4.8, 0.62, 0.15]} color="#2e9ad7" />
      {palms.map((p, i) => (
        <MenuPalm key={i} position={[p[0], p[1], p[2]]} scale={p[3]} delay={i * 0.42} />
      ))}
      {!lowPower && <DecorScatter />}
    </group>
  );
}

function FoamRings() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.35) * 0.015);
  });
  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[8.25, 8.85, 96]} />
        <meshBasicMaterial color={MENU_COLORS.foam} transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[8.9, 9.75, 96]} />
        <meshBasicMaterial color={MENU_COLORS.foam} transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

function PathNetwork() {
  const stones = [
    [0, 0], [0.6, 0.65], [1.25, 1.2], [2.0, 1.55],
    [-0.6, 0.5], [-1.25, 0.9], [-2.05, 1.2],
    [0.22, -0.75], [0.55, -1.45], [0.82, -2.15],
    [-0.8, -0.42], [-1.7, -0.25], [-2.65, 0.15],
  ];
  return (
    <group position={[0, 0.44, 0]}>
      {stones.map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i * 0.41]} position={[x, 0, z]} receiveShadow>
          <circleGeometry args={[0.28 + (i % 3) * 0.035, 7]} />
          <meshStandardMaterial color={MENU_COLORS.path} roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

function FountainMini() {
  const water = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (water.current) {
      water.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.2) * 0.05);
      water.current.rotation.y += 0.012;
    }
  });
  return (
    <group position={[0, 0.63, 0]}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[0.75, 0.9, 0.28, 32]} />
        <meshStandardMaterial color="#d9d3c2" roughness={0.75} />
      </mesh>
      <mesh ref={water} position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.52, 0.56, 0.08, 32]} />
        <meshStandardMaterial color="#6fe4ff" emissive="#2bc4e8" emissiveIntensity={0.35} roughness={0.15} transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.16, 16, 10]} />
        <meshStandardMaterial color="#bff7ff" emissive="#7defff" emissiveIntensity={0.6} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

function MenuHouse({ position, roof, scale = 1 }: { position: [number, number, number]; roof: string; scale?: number }) {
  return (
    <group position={position} scale={scale} rotation={[0, position[0] * 0.08, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.34, 0]}>
        <boxGeometry args={[1.15, 0.68, 1.0]} />
        <meshStandardMaterial color={MENU_COLORS.wall} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.92, 0.58, 4]} />
        <meshStandardMaterial color={roof} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.26, 0.52]}>
        <boxGeometry args={[0.22, 0.36, 0.03]} />
        <meshStandardMaterial color={MENU_COLORS.wood} roughness={0.85} />
      </mesh>
    </group>
  );
}

function MenuPalm({ position, scale, delay }: { position: [number, number, number]; scale: number; delay: number }) {
  const top = useRef<THREE.Group>(null!);
  const trunk = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + delay;
    if (trunk.current) trunk.current.rotation.z = Math.sin(t * 0.75) * 0.035;
    if (top.current) top.current.rotation.z = Math.sin(t * 1.1) * 0.11;
  });
  return (
    <group position={position} scale={scale}>
      <group ref={trunk}>
        <mesh castShadow position={[0, 0.72, 0]} rotation={[0.08, 0, 0.08]}>
          <cylinderGeometry args={[0.13, 0.2, 1.5, 10]} />
          <meshStandardMaterial color={MENU_COLORS.trunk} roughness={0.92} />
        </mesh>
      </group>
      <group ref={top} position={[0, 1.55, 0]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} castShadow rotation={[0.35, (i / 8) * Math.PI * 2, 0.22]} position={[Math.cos((i / 8) * Math.PI * 2) * 0.38, 0, Math.sin((i / 8) * Math.PI * 2) * 0.38]}>
            <coneGeometry args={[0.16, 1.15, 5]} />
            <meshStandardMaterial color={i % 2 ? MENU_COLORS.leaf : MENU_COLORS.leafLight} roughness={0.82} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.18, 12, 8]} />
          <meshStandardMaterial color="#7a4b24" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function Banner({ position, color }: { position: [number, number, number]; color: string }) {
  const flag = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2.1 + position[0]) * 0.18;
  });
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 1.15, 8]} />
        <meshStandardMaterial color={MENU_COLORS.wood} />
      </mesh>
      <mesh ref={flag} castShadow position={[0.28, 0.95, 0]}>
        <planeGeometry args={[0.48, 0.28, 3, 1]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.72} />
      </mesh>
    </group>
  );
}

function DecorScatter() {
  const items = useMemo(() => {
    const out: { x: number; z: number; c: string }[] = [];
    const colors = ["#ff6f9e", "#ffd84a", "#ffffff", "#9a6cff"];
    for (let i = 0; i < 34; i++) {
      const a = i * 2.399;
      const r = 2.1 + ((i * 37) % 38) / 10;
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, c: colors[i % colors.length] });
    }
    return out;
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, 0.62, it.z]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color={it.c} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

function Archipelago() {
  const islands = [
    [-24, -22, 2.8],
    [25, -18, 2.3],
    [-20, 18, 2.1],
    [22, 22, 3.0],
  ];
  return (
    <group>
      {islands.map(([x, z, s], i) => (
        <group key={i} position={[x, -0.12, z]} scale={s}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.3, 24]} />
            <meshStandardMaterial color={MENU_COLORS.sand} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.82, 24]} />
            <meshStandardMaterial color={MENU_COLORS.grassDark} roughness={0.88} />
          </mesh>
          <MenuPalm position={[0.25, 0.12, -0.1]} scale={0.45} delay={i} />
        </group>
      ))}
    </group>
  );
}

type ShipKind = "explorer" | "merchant" | "distant";

function MenuShips({ lowPower }: { lowPower: boolean }) {
  return (
    <group>
      <StylizedShip
        kind="explorer"
        position={[-11.4, 0.18, 6.4]}
        rotation={0.82}
        scale={1.45}
        phase={0.2}
        speed={0}
      />
      <StylizedShip
        kind="merchant"
        position={[12.8, 0.08, -4.8]}
        rotation={-1.15}
        scale={0.92}
        phase={1.6}
        speed={0.07}
      />
      <StylizedShip
        kind="merchant"
        position={[-15.5, 0.06, -11.5]}
        rotation={0.45}
        scale={0.76}
        phase={3.2}
        speed={-0.052}
      />
      {!lowPower && (
        <>
          <DistantShip position={[28, 0.04, 24]} scale={1.4} speed={0.032} phase={0.4} />
          <DistantShip position={[-31, 0.04, 20]} scale={1.1} speed={-0.024} phase={2.1} />
          <DistantShip position={[18, 0.04, -30]} scale={0.92} speed={0.02} phase={4.2} />
          <ShipSeagulls />
        </>
      )}
    </group>
  );
}

function StylizedShip({
  kind,
  position,
  rotation,
  scale,
  phase,
  speed,
}: {
  kind: ShipKind;
  position: [number, number, number];
  rotation: number;
  scale: number;
  phase: number;
  speed: number;
}) {
  const ship = useRef<THREE.Group>(null!);
  const reflection = useRef<THREE.Mesh>(null!);
  const sailA = useRef<THREE.Mesh>(null!);
  const sailB = useRef<THREE.Mesh>(null!);
  const flag = useRef<THREE.Mesh>(null!);
  const isExplorer = kind === "explorer";

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (ship.current) {
      const drift = speed === 0 ? 0 : Math.sin(t * 0.42) * 1.1;
      ship.current.position.set(position[0] + drift, position[1] + Math.sin(t * 1.22) * 0.08, position[2] + Math.cos(t * 0.36) * Math.abs(speed) * 4);
      ship.current.rotation.set(Math.sin(t * 0.9) * 0.035, rotation + Math.sin(t * 0.3) * 0.035, Math.sin(t * 1.05) * 0.045);
    }
    if (reflection.current) {
      reflection.current.position.x = position[0] + (speed === 0 ? 0 : Math.sin(t * 0.42) * 1.1);
      (reflection.current.material as THREE.MeshBasicMaterial).opacity = (isExplorer ? 0.18 : 0.12) + Math.sin(t * 1.6) * 0.025;
    }
    if (sailA.current) sailA.current.scale.x = 1 + Math.sin(t * 1.7) * 0.035;
    if (sailB.current) sailB.current.scale.x = 1 + Math.cos(t * 1.55) * 0.028;
    if (flag.current) {
      flag.current.rotation.y = Math.sin(t * 2.8) * 0.2;
      flag.current.scale.x = 1 + Math.sin(t * 3.2) * 0.06;
    }
  });

  return (
    <>
      <mesh ref={reflection} rotation={[-Math.PI / 2, 0, rotation]} position={[position[0], -0.085, position[2]]}>
        <planeGeometry args={[isExplorer ? 5.8 : 3.9, isExplorer ? 1.55 : 1.05]} />
        <meshBasicMaterial color="#164f62" transparent opacity={isExplorer ? 0.18 : 0.12} depthWrite={false} />
      </mesh>
      <group ref={ship} position={position} rotation={[0, rotation, 0]} scale={scale}>
        <ShipHull explorer={isExplorer} />
        <ShipDeck explorer={isExplorer} />
        <ShipMasts explorer={isExplorer} sailA={sailA} sailB={sailB} flag={flag} />
        {!isExplorer && <MerchantCargo />}
        {isExplorer && <ExplorerDetails />}
        <ShipSplashes explorer={isExplorer} />
      </group>
    </>
  );
}

function ShipHull({ explorer }: { explorer: boolean }) {
  return (
    <group>
      <mesh castShadow receiveShadow scale={[explorer ? 2.25 : 1.65, 0.42, explorer ? 0.58 : 0.46]}>
        <sphereGeometry args={[1, 24, 10]} />
        <meshStandardMaterial color={explorer ? MENU_COLORS.darkWood : "#6a3d22"} roughness={0.78} metalness={0.03} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0]} scale={[explorer ? 2.05 : 1.5, 0.16, explorer ? 0.5 : 0.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={explorer ? "#633820" : MENU_COLORS.wood} roughness={0.82} />
      </mesh>
      <mesh position={[explorer ? 1.95 : 1.38, 0.18, 0]} rotation={[0, 0, -0.38]} scale={[0.32, 0.2, explorer ? 0.5 : 0.38]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color={explorer ? MENU_COLORS.darkWood : "#6a3d22"} roughness={0.84} />
      </mesh>
      <mesh position={[-(explorer ? 1.95 : 1.38), 0.18, 0]} rotation={[0, 0, 0.38]} scale={[0.32, 0.2, explorer ? 0.5 : 0.38]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color={explorer ? MENU_COLORS.darkWood : "#6a3d22"} roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.35, 0]} scale={[explorer ? 1.75 : 1.15, 0.035, explorer ? 0.64 : 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={MENU_COLORS.gold} roughness={0.35} metalness={0.25} />
      </mesh>
    </group>
  );
}

function ShipDeck({ explorer }: { explorer: boolean }) {
  return (
    <group position={[0, 0.46, 0]}>
      <mesh castShadow scale={[explorer ? 1.55 : 1.0, 0.09, explorer ? 0.44 : 0.34]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a2683c" roughness={0.78} />
      </mesh>
      {[-0.68, 0, 0.68].map((x, i) => (
        <mesh key={i} position={[x * (explorer ? 1.15 : 0.82), 0.11, 0]} scale={[0.055, 0.24, explorer ? 0.53 : 0.4]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={MENU_COLORS.gold} roughness={0.45} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function ShipMasts({
  explorer,
  sailA,
  sailB,
  flag,
}: {
  explorer: boolean;
  sailA: React.RefObject<THREE.Mesh>;
  sailB: React.RefObject<THREE.Mesh>;
  flag: React.RefObject<THREE.Mesh>;
}) {
  const mastHeight = explorer ? 3.25 : 2.35;
  return (
    <group>
      {[
        [explorer ? -0.64 : -0.42, mastHeight * 0.9],
        [explorer ? 0.58 : 0.42, mastHeight],
      ].map(([x, h], i) => (
        <group key={i} position={[x, 0.55, 0]}>
          <mesh castShadow position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.035, 0.05, h, 10]} />
            <meshStandardMaterial color="#6c421f" roughness={0.84} />
          </mesh>
          <mesh position={[0, h * 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, explorer ? 1.65 : 1.12, 8]} />
            <meshStandardMaterial color="#6c421f" roughness={0.82} />
          </mesh>
          <mesh ref={i === 0 ? sailA : sailB} castShadow position={[0.22, h * 0.58, 0.02]}>
            <planeGeometry args={[explorer ? 1.08 : 0.76, explorer ? 1.32 : 0.92, 4, 2]} />
            <meshStandardMaterial color="#fff8e4" side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
          <mesh position={[0.22, h * 0.58, 0.025]} scale={[explorer ? 0.78 : 0.54, 0.03, 0.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={MENU_COLORS.gold} roughness={0.42} metalness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh ref={flag} castShadow position={[0.58, 0.55 + mastHeight + 0.18, 0.04]}>
        <planeGeometry args={[explorer ? 0.58 : 0.38, explorer ? 0.32 : 0.22, 3, 1]} />
        <meshStandardMaterial color={explorer ? "#2e9ad7" : "#e84e5f"} side={THREE.DoubleSide} roughness={0.65} />
      </mesh>
      {explorer && (
        <mesh position={[0.58, 0.55 + mastHeight + 0.18, 0.055]} scale={[0.18, 0.04, 0.01]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={MENU_COLORS.gold} emissive={MENU_COLORS.gold} emissiveIntensity={0.2} />
        </mesh>
      )}
    </group>
  );
}

function MerchantCargo() {
  return (
    <group position={[-0.2, 0.73, 0]}>
      {[
        [-0.42, 0, 0.12, "#b98043"],
        [-0.08, 0.02, -0.08, "#8b5a34"],
        [0.28, 0.01, 0.1, "#c59a5d"],
      ].map(([x, y, z, color], i) => (
        <mesh key={i} castShadow position={[x as number, y as number, z as number]} scale={[0.22, 0.2, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color as string} roughness={0.86} />
        </mesh>
      ))}
      <mesh castShadow position={[0.6, 0.02, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.28, 12]} />
        <meshStandardMaterial color="#74492e" roughness={0.86} />
      </mesh>
    </group>
  );
}

function ExplorerDetails() {
  return (
    <group position={[0, 0.9, 0]}>
      <mesh castShadow position={[-1.12, 0, 0]} scale={[0.32, 0.28, 0.34]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c28a52" roughness={0.78} />
      </mesh>
      <mesh castShadow position={[-1.12, 0.27, 0]} rotation={[0, Math.PI / 4, 0]} scale={[0.35, 0.2, 0.35]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color={MENU_COLORS.roofBlue} roughness={0.7} />
      </mesh>
      {[0.95, 1.28].map((x) => (
        <mesh key={x} position={[x, -0.14, 0.32]} scale={[0.09, 0.09, 0.02]}>
          <cylinderGeometry args={[1, 1, 0.06, 12]} />
          <meshStandardMaterial color={MENU_COLORS.gold} emissive="#d9992d" emissiveIntensity={0.15} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function ShipSplashes({ explorer }: { explorer: boolean }) {
  return (
    <group position={[0, 0.05, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (explorer ? 2.12 : 1.5), 0, 0]} rotation={[-Math.PI / 2, 0, 0.12 * side]}>
          <planeGeometry args={[explorer ? 1.1 : 0.72, 0.18]} />
          <meshBasicMaterial color="#f6ffff" transparent opacity={explorer ? 0.62 : 0.42} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, -0.015, explorer ? 0.58 : 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[explorer ? 2.9 : 1.8, 0.16]} />
        <meshBasicMaterial color="#dcfbff" transparent opacity={0.36} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DistantShip({
  position,
  scale,
  speed,
  phase,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (ref.current) {
      ref.current.position.x = position[0] + Math.sin(t * speed) * 3.5;
      ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.025;
    }
  });
  return (
    <group ref={ref} position={position} scale={scale} rotation={[0, position[0] > 0 ? -0.9 : 0.9, 0]}>
      <mesh scale={[1.1, 0.12, 0.22]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#234a5a" transparent opacity={0.48} />
      </mesh>
      <mesh position={[0.05, 0.5, 0]}>
        <planeGeometry args={[0.58, 0.9]} />
        <meshBasicMaterial color="#f7fbff" transparent opacity={0.58} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.08, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.45, 0.22]} />
        <meshBasicMaterial color="#17475b" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ShipSeagulls() {
  return (
    <group>
      <Seagull phase={0.4} radius={9.5} />
      <Seagull phase={2.8} radius={12.5} />
    </group>
  );
}

function MovingClouds() {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = ((clock.elapsedTime * 0.55) % 48) - 24;
  });
  return (
    <group ref={group}>
      {[[-18, 12, -24], [3, 14, -28], [21, 11, -21], [-8, 15, 22]].map((p, i) => (
        <Cloud key={i} position={p as [number, number, number]} scale={1 + (i % 2) * 0.25} />
      ))}
    </group>
  );
}

function Cloud({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      {[[0, 0, 0, 1], [0.9, 0.05, 0, 0.72], [-0.85, -0.02, 0.05, 0.75], [0.18, 0.28, 0.04, 0.82]].map((c, i) => (
        <mesh key={i} position={[c[0], c[1], c[2]]} scale={[c[3], c[3] * 0.55, c[3] * 0.45]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function SeagullFlock({ lowPower }: { lowPower: boolean }) {
  const count = lowPower ? 3 : 6;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <Seagull key={i} phase={i * 1.7} radius={15 + i * 1.6} />
      ))}
    </group>
  );
}

function Seagull({ phase, radius }: { phase: number; radius: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.28 + phase;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * radius, 6.5 + Math.sin(t * 1.7) * 0.55, Math.sin(t) * radius);
      ref.current.rotation.y = -t + Math.PI / 2;
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 5 + phase) * 0.18;
    }
  });
  return (
    <group ref={ref}>
      <mesh scale={[0.34, 0.055, 0.12]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.28, 0, 0]} rotation={[0, 0, 0.42]}>
        <planeGeometry args={[0.55, 0.08]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.28, 0, 0]} rotation={[0, 0, -0.42]}>
        <planeGeometry args={[0.55, 0.08]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function MenuFish({ lowPower }: { lowPower: boolean }) {
  const count = lowPower ? 3 : 7;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <FishSwim key={i} phase={i * 0.9} radius={9.8 + (i % 3) * 1.8} color={i % 2 ? "#ffe082" : "#ff8f6d"} />
      ))}
    </group>
  );
}

function FishSwim({ phase, radius, color }: { phase: number; radius: number; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.32 + phase;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * radius, -0.44, Math.sin(t) * radius);
      ref.current.rotation.y = -t;
    }
  });
  return (
    <group ref={ref} scale={0.45}>
      <mesh scale={[0.56, 0.2, 0.18]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.72} roughness={0.35} />
      </mesh>
      <mesh position={[-0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.2, 0.34, 3]} />
        <meshStandardMaterial color={color} transparent opacity={0.68} />
      </mesh>
    </group>
  );
}

function Enhanced2DMenuBackdrop({ mounted }: { mounted: boolean }) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#8dddf4]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #77c9f2 0%, #b8ecff 38%, #e7fbff 56%, #6ed9df 57%, #1598c9 100%)",
        }}
      />
      <motion.div
        className="absolute left-[8%] top-[8%] h-28 w-28 rounded-full"
        style={{
          background: "radial-gradient(circle, #fffbd0 0%, #ffd76b 44%, rgba(255,215,107,0) 72%)",
          filter: "blur(0.5px)",
        }}
        animate={{ scale: [1, 1.04, 1], opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <Distant2DArchipelago />
      <Cloud2DLayer mounted={mounted} />
      <Ocean2DLayer mounted={mounted} />
      <Central2DIsland mounted={mounted} />
      <Bird2DLayer mounted={mounted} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,244,206,0.2) 0%, rgba(255,255,255,0) 35%), radial-gradient(ellipse at center, rgba(255,255,255,0) 46%, rgba(8,38,62,0.24) 100%)",
        }}
      />
    </div>
  );
}

function Cloud2DLayer({ mounted }: { mounted: boolean }) {
  if (!mounted) return null;
  return (
    <>
      {[
        { top: "10%", scale: 1.05, dur: 72, delay: -8, opacity: 0.78 },
        { top: "18%", scale: 0.76, dur: 88, delay: -32, opacity: 0.62 },
        { top: "27%", scale: 1.22, dur: 96, delay: -54, opacity: 0.5 },
      ].map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: cloud.top, opacity: cloud.opacity }}
          initial={{ x: "-22vw" }}
          animate={{ x: "118vw" }}
          transition={{ duration: cloud.dur, delay: cloud.delay, repeat: Infinity, ease: "linear" }}
        >
          <svg width={260 * cloud.scale} height={96 * cloud.scale} viewBox="0 0 260 96">
            <g fill="#ffffff">
              <ellipse cx="56" cy="62" rx="48" ry="24" />
              <ellipse cx="112" cy="48" rx="58" ry="34" />
              <ellipse cx="174" cy="58" rx="52" ry="27" />
              <ellipse cx="216" cy="66" rx="36" ry="18" />
            </g>
            <path d="M24 70 C80 54 148 86 238 66" stroke="rgba(132,190,215,0.18)" strokeWidth="5" fill="none" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

function Distant2DArchipelago() {
  return (
    <svg className="absolute left-0 top-[34%] h-[24%] w-full" viewBox="0 0 1200 260" preserveAspectRatio="none">
      <defs>
        <linearGradient id="haze2d" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#dff8ff" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#dff8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="260" fill="url(#haze2d)" />
      {[
        { x: 82, y: 142, s: 0.92 },
        { x: 294, y: 118, s: 0.74 },
        { x: 866, y: 130, s: 0.86 },
        { x: 1050, y: 112, s: 0.68 },
      ].map((island, i) => (
        <g key={i} transform={`translate(${island.x} ${island.y}) scale(${island.s})`} opacity="0.74">
          <ellipse cx="0" cy="52" rx="92" ry="18" fill="#7bc6c8" opacity="0.45" />
          <path d="M-98 50 C-55 14 7 24 42 2 C66 -12 106 8 132 44 C72 58 -36 64 -98 50Z" fill="#78bd72" />
          <path d="M-112 55 C-48 38 64 38 142 53 C82 72 -52 74 -112 55Z" fill="#ecd492" />
          <path d="M-72 36 L-38 4 L-12 38Z" fill="#86a8aa" opacity="0.5" />
          <path d="M38 42 L76 8 L110 43Z" fill="#7f9fa3" opacity="0.42" />
        </g>
      ))}
    </svg>
  );
}

function Ocean2DLayer({ mounted }: { mounted: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[53%] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #8df0ee 0%, #42c9df 22%, #148fc4 58%, #08639d 100%)" }}
      />
      <motion.div
        className="absolute left-[20%] top-[4%] h-[20%] w-[48%]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,250,202,0.7) 0%, rgba(255,250,202,0.22) 34%, rgba(255,250,202,0) 74%)",
          mixBlendMode: "screen",
          filter: "blur(7px)",
        }}
        animate={{ opacity: [0.5, 0.82, 0.5], scaleX: [0.96, 1.05, 0.96] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {mounted &&
        Array.from({ length: 20 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 47) % 100}%`,
              top: `${4 + ((i * 19) % 34)}%`,
              width: i % 3 === 0 ? 4 : 2,
              height: i % 3 === 0 ? 4 : 2,
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 0 8px rgba(255,255,255,0.8)",
            }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.7, 1.6, 0.7] }}
            transition={{ duration: 2.4 + (i % 5) * 0.45, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.svg
          key={i}
          className="absolute left-0 w-[200%]"
          style={{ top: `${4 + i * 12}%`, height: 96 }}
          viewBox="0 0 1600 90"
          preserveAspectRatio="none"
          animate={{ x: i % 2 ? ["-50%", "0%"] : ["0%", "-50%"] }}
          transition={{ duration: 18 + i * 5, repeat: Infinity, ease: "linear" }}
        >
          <path
            d={`M0,48 Q160,${34 + i * 2} 320,48 T640,48 T960,48 T1280,48 T1600,48 L1600,90 L0,90Z`}
            fill={i < 2 ? "#ffffff" : i < 4 ? "#7fdcea" : "#116fa2"}
            opacity={i < 2 ? 0.28 : 0.22}
          />
        </motion.svg>
      ))}
    </div>
  );
}

function Central2DIsland({ mounted }: { mounted: boolean }) {
  return (
    <motion.div
      className="absolute left-1/2 top-[44%] w-[min(860px,92vw)] -translate-x-1/2"
      animate={{ y: [0, -5, 0], scale: [1, 1.006, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 860 430" className="w-full drop-shadow-[0_34px_34px_rgba(14,74,87,0.25)]">
        <defs>
          <radialGradient id="islandGrass2d" cx="50%" cy="42%" r="64%">
            <stop offset="0%" stopColor="#98ee75" />
            <stop offset="55%" stopColor="#4fc560" />
            <stop offset="100%" stopColor="#2c8e48" />
          </radialGradient>
          <radialGradient id="sand2d" cx="48%" cy="44%" r="66%">
            <stop offset="0%" stopColor="#fff2b8" />
            <stop offset="100%" stopColor="#d9ae58" />
          </radialGradient>
          <linearGradient id="cliff2d" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b7894c" />
            <stop offset="100%" stopColor="#70451f" />
          </linearGradient>
        </defs>
        <ellipse cx="430" cy="316" rx="382" ry="76" fill="#bcf9ff" opacity="0.42" />
        <ellipse cx="430" cy="324" rx="354" ry="61" fill="#ffffff" opacity="0.46" />
        <ellipse cx="430" cy="324" rx="328" ry="51" fill="#e1fbff" opacity="0.25" />
        <path d="M94 278 C142 204 262 198 342 166 C438 126 540 154 610 190 C690 230 778 230 806 290 C686 360 220 370 94 278Z" fill="url(#cliff2d)" />
        <path d="M72 258 C132 174 252 170 342 134 C448 92 574 126 646 174 C724 226 800 218 828 278 C700 330 210 344 72 258Z" fill="url(#sand2d)" />
        <path d="M156 232 C222 152 334 130 430 116 C538 100 644 148 704 226 C620 278 278 292 156 232Z" fill="url(#islandGrass2d)" />
        <path d="M160 248 C244 282 624 284 704 236" fill="none" stroke="#1e7f43" strokeWidth="7" opacity="0.18" />
        <path d="M154 262 C238 300 638 298 734 254" fill="none" stroke="#fff8df" strokeWidth="7" strokeDasharray="26 18" opacity="0.58" />
        <Island2DPaths />
        <Island2DBuildings />
        <Island2DPlants />
        <Island2DFountain />
        <Island2DDetails />
      </svg>
      {mounted &&
        Array.from({ length: 6 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 rounded-full bg-white/80"
            style={{ left: `${12 + i * 13}%`, top: `${68 + (i % 2) * 4}%`, width: `${42 + i * 7}px`, filter: "blur(1px)" }}
            animate={{ x: [0, 18, 0], opacity: [0.32, 0.75, 0.32] }}
            transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
    </motion.div>
  );
}

function Island2DPaths() {
  return (
    <g fill="none" strokeLinecap="round">
      <path d="M430 238 C424 218 414 204 398 190 C376 170 346 160 314 152" stroke="#dfc997" strokeWidth="20" />
      <path d="M430 238 C458 220 492 208 534 202 C584 194 626 202 666 222" stroke="#dfc997" strokeWidth="18" />
      <path d="M430 238 C412 258 380 270 334 276" stroke="#dfc997" strokeWidth="17" />
      <path d="M430 238 C424 218 414 204 398 190 C376 170 346 160 314 152" stroke="#fff4c8" strokeWidth="7" opacity="0.55" />
      <path d="M430 238 C458 220 492 208 534 202 C584 194 626 202 666 222" stroke="#fff4c8" strokeWidth="6" opacity="0.5" />
      <path d="M430 238 C412 258 380 270 334 276" stroke="#fff4c8" strokeWidth="6" opacity="0.5" />
    </g>
  );
}

function Island2DBuildings() {
  const houses = [
    { x: 300, y: 162, roof: "#df5650", s: 1 },
    { x: 560, y: 206, roof: "#3d8bd8", s: 0.9 },
    { x: 376, y: 280, roof: "#e5ad3f", s: 0.76 },
    { x: 486, y: 170, roof: "#27a987", s: 0.82 },
  ];
  return (
    <g>
      {houses.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) scale(${h.s})`}>
          <ellipse cx="0" cy="48" rx="42" ry="10" fill="#1b5b3d" opacity="0.18" />
          <rect x="-30" y="-8" width="60" height="52" rx="6" fill="#f0cf9b" stroke="#9a6a38" strokeWidth="3" />
          <path d="M-38 -8 L0 -38 L38 -8Z" fill={h.roof} stroke="#7a4a26" strokeWidth="3" />
          <rect x="-9" y="16" width="18" height="28" rx="4" fill="#8b5530" />
          <rect x="-23" y="6" width="14" height="13" rx="3" fill="#86e4ff" stroke="#5b8faa" strokeWidth="2" />
          <rect x="12" y="6" width="14" height="13" rx="3" fill="#86e4ff" stroke="#5b8faa" strokeWidth="2" />
        </g>
      ))}
    </g>
  );
}

function Island2DFountain() {
  return (
    <g transform="translate(430 238)">
      <ellipse cx="0" cy="25" rx="54" ry="16" fill="#235c65" opacity="0.18" />
      <ellipse cx="0" cy="10" rx="42" ry="18" fill="#d8d4bf" stroke="#9d9580" strokeWidth="4" />
      <ellipse cx="0" cy="7" rx="30" ry="10" fill="#72eaff" opacity="0.9" />
      <path d="M0 5 C-10 -14 -4 -24 0 -36 C5 -22 12 -12 0 5Z" fill="#baf8ff" opacity="0.86" />
      <circle cx="-15" cy="2" r="4" fill="#ffffff" opacity="0.75" />
      <circle cx="17" cy="5" r="3" fill="#ffffff" opacity="0.7" />
    </g>
  );
}

function Island2DPlants() {
  const palms = [
    { x: 210, y: 190, s: 1.18, r: -8 },
    { x: 250, y: 252, s: 0.88, r: 6 },
    { x: 656, y: 194, s: 1.02, r: 8 },
    { x: 700, y: 258, s: 0.82, r: -7 },
    { x: 350, y: 128, s: 0.74, r: 5 },
  ];
  return (
    <g>
      {palms.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})`}>
          <path d="M0 82 C-8 50 -4 24 8 0" fill="none" stroke="#7a4a26" strokeWidth="11" strokeLinecap="round" />
          <path d="M7 0 C-36 -18 -56 0 -76 20 C-42 22 -14 14 7 0Z" fill="#48b957" />
          <path d="M7 0 C-24 -42 0 -58 26 -72 C22 -36 18 -14 7 0Z" fill="#72db67" />
          <path d="M7 0 C42 -34 70 -18 88 6 C52 12 28 8 7 0Z" fill="#42ad50" />
          <path d="M7 0 C28 -2 48 26 56 52 C30 34 14 18 7 0Z" fill="#64ce60" />
          <circle cx="3" cy="6" r="8" fill="#7a4a26" />
        </g>
      ))}
      {Array.from({ length: 28 }).map((_, i) => {
        const x = 178 + ((i * 67) % 510);
        const y = 154 + ((i * 43) % 142);
        const color = ["#ff6f9e", "#ffd84a", "#ffffff", "#9a6cff", "#ff9e4d"][i % 5];
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="10" rx="15" ry="6" fill="#217840" opacity="0.16" />
            <circle cx="-5" cy="1" r="5" fill={color} />
            <circle cx="4" cy="-2" r="4" fill={color} />
            <circle cx="7" cy="6" r="4" fill={color} />
            <circle cx="1" cy="2" r="3" fill="#ffeaa0" />
          </g>
        );
      })}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 190 + ((i * 91) % 480);
        const y = 176 + ((i * 59) % 112);
        return (
          <g key={`b-${i}`} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="7" rx="17" ry="7" fill="#1f6f3b" opacity="0.18" />
            <circle cx="-8" cy="0" r="11" fill="#329b4f" />
            <circle cx="4" cy="-5" r="13" fill="#43b85b" />
            <circle cx="14" cy="2" r="9" fill="#2f944d" />
          </g>
        );
      })}
    </g>
  );
}

function Island2DDetails() {
  return (
    <g>
      {[
        [156, 286, 25, 11],
        [730, 282, 30, 13],
        [118, 264, 16, 8],
      ].map(([x, y, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#87969a" />
          <ellipse cx={x} cy={y + 12} rx={rx + 12} ry="5" fill="#ffffff" opacity="0.62" />
        </g>
      ))}
      <g transform="translate(650 236)">
        <rect x="-4" y="-42" width="8" height="64" rx="3" fill="#80502b" />
        <path d="M4 -38 C30 -36 36 -22 4 -18Z" fill="#e84e5f" />
        <path d="M4 -29 C24 -28 29 -22 4 -18" fill="#ffd84a" opacity="0.8" />
      </g>
      <g transform="translate(250 284)">
        <rect x="-4" y="-36" width="8" height="58" rx="3" fill="#80502b" />
        <path d="M4 -33 C28 -31 34 -18 4 -15Z" fill="#2e9ad7" />
      </g>
    </g>
  );
}

function Bird2DLayer({ mounted }: { mounted: boolean }) {
  if (!mounted) return null;
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.svg
          key={i}
          className="absolute"
          style={{ top: `${13 + (i % 3) * 7}%`, opacity: 0.82 }}
          width="52"
          height="26"
          viewBox="0 0 52 26"
          initial={{ x: `${-10 - i * 8}vw` }}
          animate={{ x: "112vw", y: [0, -10, 5, 0] }}
          transition={{
            x: { duration: 42 + i * 6, delay: -i * 7, repeat: Infinity, ease: "linear" },
            y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <path d="M6 15 C15 4 24 6 27 15 C32 6 42 4 48 15" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <path d="M26 16 L29 18 L26 20 Z" fill="#ffbf62" />
        </motion.svg>
      ))}
    </>
  );
}

function Premium2DMenuBackdrop({ mounted }: { mounted: boolean }) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#8dddf6]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #74c6f2 0%, #b9edff 36%, #f4fdff 51%, #86e6e5 52%, #31b8d5 72%, #0b78b3 100%)",
        }}
      />
      <div
        className="absolute left-[7%] top-[7%] h-32 w-32 rounded-full"
        style={{
          background: "radial-gradient(circle, #fff8c8 0%, #ffd36c 42%, rgba(255,211,108,0) 72%)",
          boxShadow: "0 0 70px rgba(255,216,114,0.55)",
        }}
      />
      <div
        className="absolute left-0 top-0 h-[54%] w-full"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,244,190,0.35) 0%, rgba(255,244,190,0.14) 18%, rgba(255,255,255,0) 42%)",
        }}
      />
      <PremiumClouds mounted={mounted} />
      <PremiumArchipelago />
      <PremiumOcean mounted={mounted} />
      <PremiumIslandArt />
      <PremiumBirds mounted={mounted} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,246,214,0.18) 0%, rgba(255,255,255,0) 42%), radial-gradient(ellipse at center, rgba(255,255,255,0) 43%, rgba(3,28,54,0.26) 100%)",
        }}
      />
    </div>
  );
}

function PremiumClouds({ mounted }: { mounted: boolean }) {
  if (!mounted) return null;
  return (
    <>
      {[
        { top: "10%", scale: 1.1, duration: 88, delay: -12, opacity: 0.82 },
        { top: "20%", scale: 0.78, duration: 104, delay: -48, opacity: 0.6 },
        { top: "30%", scale: 1.32, duration: 122, delay: -76, opacity: 0.45 },
      ].map((cloud, i) => (
        <motion.svg
          key={i}
          className="absolute"
          style={{ top: cloud.top, opacity: cloud.opacity }}
          width={280 * cloud.scale}
          height={104 * cloud.scale}
          viewBox="0 0 280 104"
          initial={{ x: "-24vw" }}
          animate={{ x: "118vw" }}
          transition={{ duration: cloud.duration, delay: cloud.delay, repeat: Infinity, ease: "linear" }}
        >
          <g fill="#fff">
            <ellipse cx="62" cy="68" rx="52" ry="25" />
            <ellipse cx="120" cy="52" rx="64" ry="36" />
            <ellipse cx="188" cy="64" rx="58" ry="29" />
            <ellipse cx="232" cy="72" rx="38" ry="19" />
          </g>
          <path d="M26 76 C80 58 166 88 254 70" fill="none" stroke="rgba(120,180,205,0.2)" strokeWidth="5" />
        </motion.svg>
      ))}
    </>
  );
}

function PremiumArchipelago() {
  return (
    <svg className="absolute left-0 top-[33%] h-[22%] w-full" viewBox="0 0 1200 240" preserveAspectRatio="none">
      <defs>
        <linearGradient id="premiumHaze" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e6fbff" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#e6fbff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="240" fill="url(#premiumHaze)" />
      {[
        [88, 132, 0.9],
        [292, 108, 0.7],
        [860, 124, 0.88],
        [1066, 102, 0.64],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity="0.72">
          <ellipse cx="0" cy="56" rx="104" ry="17" fill="#6fc5cd" opacity="0.42" />
          <path d="M-110 52 C-62 14 0 24 42 0 C70 -14 116 10 148 46 C80 62 -42 66 -110 52Z" fill="#72bd72" />
          <path d="M-124 58 C-52 38 70 38 158 55 C90 74 -58 76 -124 58Z" fill="#ebd08c" />
          <path d="M-62 38 L-26 4 L4 40Z" fill="#86a0a4" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

function PremiumOcean({ mounted }: { mounted: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[53%] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #95f2ef 0%, #44cde0 24%, #1392c6 58%, #08649e 100%)" }}
      />
      <motion.div
        className="absolute left-[23%] top-[5%] h-[20%] w-[46%]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,251,208,0.7) 0%, rgba(255,251,208,0.22) 34%, rgba(255,251,208,0) 74%)",
          mixBlendMode: "screen",
          filter: "blur(7px)",
        }}
        animate={{ opacity: [0.48, 0.82, 0.48], scaleX: [0.96, 1.06, 0.96] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.svg
          key={i}
          className="absolute left-0 w-[200%]"
          style={{ top: `${5 + i * 12}%`, height: 90 }}
          viewBox="0 0 1600 90"
          preserveAspectRatio="none"
          animate={{ x: i % 2 ? ["-50%", "0%"] : ["0%", "-50%"] }}
          transition={{ duration: 19 + i * 5, repeat: Infinity, ease: "linear" }}
        >
          <path
            d={`M0,48 Q160,${34 + i * 2} 320,48 T640,48 T960,48 T1280,48 T1600,48 L1600,90 L0,90Z`}
            fill={i < 2 ? "#ffffff" : i < 4 ? "#77dce9" : "#116fa2"}
            opacity={i < 2 ? 0.26 : 0.22}
          />
        </motion.svg>
      ))}
      {mounted &&
        Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${5 + ((i * 17) % 34)}%`,
              width: i % 4 === 0 ? 4 : 2,
              height: i % 4 === 0 ? 4 : 2,
              boxShadow: "0 0 8px rgba(255,255,255,0.85)",
            }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.7, 1.55, 0.7] }}
            transition={{ duration: 2.4 + (i % 5) * 0.42, delay: i * 0.16, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
    </div>
  );
}

function PremiumIslandArt() {
  return (
    <motion.div
      className="absolute left-1/2 top-[45%] w-[min(900px,93vw)] -translate-x-1/2"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 900 460" className="w-full drop-shadow-[0_34px_34px_rgba(14,74,87,0.25)]">
        <defs>
          <radialGradient id="premiumGrass" cx="50%" cy="40%" r="66%">
            <stop offset="0%" stopColor="#a4f17a" />
            <stop offset="58%" stopColor="#54c860" />
            <stop offset="100%" stopColor="#2d8c47" />
          </radialGradient>
          <radialGradient id="premiumSand" cx="48%" cy="43%" r="68%">
            <stop offset="0%" stopColor="#fff3b9" />
            <stop offset="100%" stopColor="#d9ae58" />
          </radialGradient>
          <linearGradient id="premiumCliff" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#bb8d4e" />
            <stop offset="100%" stopColor="#70451f" />
          </linearGradient>
        </defs>
        <ellipse cx="450" cy="342" rx="390" ry="78" fill="#bffaff" opacity="0.42" />
        <ellipse cx="450" cy="352" rx="358" ry="60" fill="#ffffff" opacity="0.45" />
        <path d="M98 294 C150 216 268 204 358 170 C458 130 564 152 640 196 C716 240 802 238 834 300 C704 374 230 382 98 294Z" fill="url(#premiumCliff)" />
        <path d="M72 270 C140 184 260 174 356 138 C466 94 592 124 670 178 C748 232 822 226 852 286 C716 342 220 356 72 270Z" fill="url(#premiumSand)" />
        <path d="M156 238 C224 154 344 128 446 116 C560 102 664 150 736 232 C646 288 280 298 156 238Z" fill="url(#premiumGrass)" />
        <path d="M164 252 C260 286 642 286 728 238" fill="none" stroke="#1f7f43" strokeWidth="8" opacity="0.18" />
        <path d="M154 276 C252 310 656 308 760 262" fill="none" stroke="#fff8df" strokeWidth="7" strokeDasharray="28 18" opacity="0.6" />
        <PremiumPaths />
        <PremiumBuildings />
        <PremiumFountain />
        <PremiumPlants />
        <PremiumDockAndShip />
      </svg>
    </motion.div>
  );
}

function PremiumPaths() {
  return (
    <g fill="none" strokeLinecap="round">
      <path d="M450 246 C432 220 398 196 346 164" stroke="#dfc997" strokeWidth="21" />
      <path d="M450 246 C492 218 570 202 692 232" stroke="#dfc997" strokeWidth="18" />
      <path d="M450 246 C426 270 382 284 322 288" stroke="#dfc997" strokeWidth="17" />
      <path d="M450 246 C432 220 398 196 346 164" stroke="#fff4c8" strokeWidth="7" opacity="0.52" />
      <path d="M450 246 C492 218 570 202 692 232" stroke="#fff4c8" strokeWidth="6" opacity="0.48" />
      <path d="M450 246 C426 270 382 284 322 288" stroke="#fff4c8" strokeWidth="6" opacity="0.48" />
    </g>
  );
}

function PremiumBuildings() {
  return (
    <g>
      {[
        [318, 166, "#df5650", 1],
        [584, 208, "#3d8bd8", 0.9],
        [390, 292, "#e5ad3f", 0.76],
        [506, 170, "#27a987", 0.82],
      ].map(([x, y, roof, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse cx="0" cy="48" rx="42" ry="10" fill="#1b5b3d" opacity="0.18" />
          <rect x="-30" y="-8" width="60" height="52" rx="6" fill="#f0cf9b" stroke="#9a6a38" strokeWidth="3" />
          <path d="M-38 -8 L0 -38 L38 -8Z" fill={roof as string} stroke="#7a4a26" strokeWidth="3" />
          <rect x="-9" y="16" width="18" height="28" rx="4" fill="#8b5530" />
          <rect x="-23" y="6" width="14" height="13" rx="3" fill="#86e4ff" stroke="#5b8faa" strokeWidth="2" />
          <rect x="12" y="6" width="14" height="13" rx="3" fill="#86e4ff" stroke="#5b8faa" strokeWidth="2" />
        </g>
      ))}
    </g>
  );
}

function PremiumFountain() {
  return (
    <g transform="translate(450 246)">
      <ellipse cx="0" cy="25" rx="54" ry="16" fill="#235c65" opacity="0.18" />
      <ellipse cx="0" cy="10" rx="42" ry="18" fill="#d8d4bf" stroke="#9d9580" strokeWidth="4" />
      <ellipse cx="0" cy="7" rx="30" ry="10" fill="#72eaff" opacity="0.9" />
      <path d="M0 5 C-10 -14 -4 -24 0 -36 C5 -22 12 -12 0 5Z" fill="#baf8ff" opacity="0.86" />
      <circle cx="-15" cy="2" r="4" fill="#ffffff" opacity="0.75" />
      <circle cx="17" cy="5" r="3" fill="#ffffff" opacity="0.7" />
    </g>
  );
}

function PremiumPlants() {
  const palms = [
    [218, 196, 1.18, -8],
    [260, 260, 0.88, 6],
    [682, 198, 1.02, 8],
    [722, 264, 0.82, -7],
    [366, 132, 0.74, 5],
  ];
  return (
    <g>
      {palms.map(([x, y, s, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path d="M0 82 C-8 50 -4 24 8 0" fill="none" stroke="#7a4a26" strokeWidth="11" strokeLinecap="round" />
          <path d="M7 0 C-36 -18 -56 0 -76 20 C-42 22 -14 14 7 0Z" fill="#48b957" />
          <path d="M7 0 C-24 -42 0 -58 26 -72 C22 -36 18 -14 7 0Z" fill="#72db67" />
          <path d="M7 0 C42 -34 70 -18 88 6 C52 12 28 8 7 0Z" fill="#42ad50" />
          <path d="M7 0 C28 -2 48 26 56 52 C30 34 14 18 7 0Z" fill="#64ce60" />
          <circle cx="3" cy="6" r="8" fill="#7a4a26" />
        </g>
      ))}
      {Array.from({ length: 26 }).map((_, i) => {
        const x = 190 + ((i * 67) % 520);
        const y = 158 + ((i * 43) % 146);
        const color = ["#ff6f9e", "#ffd84a", "#ffffff", "#9a6cff", "#ff9e4d"][i % 5];
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="10" rx="15" ry="6" fill="#217840" opacity="0.16" />
            <circle cx="-5" cy="1" r="5" fill={color} />
            <circle cx="4" cy="-2" r="4" fill={color} />
            <circle cx="7" cy="6" r="4" fill={color} />
            <circle cx="1" cy="2" r="3" fill="#ffeaa0" />
          </g>
        );
      })}
    </g>
  );
}

function PremiumDockAndShip() {
  return (
    <g transform="translate(698 310)">
      <g transform="rotate(-10)">
        <rect x="-8" y="-10" width="96" height="13" rx="3" fill="#8a532f" />
        {[-2, 22, 46, 70].map((x) => (
          <rect key={x} x={x} y="-6" width="7" height="32" rx="3" fill="#6f4226" />
        ))}
        <path d="M-8 -2 H88" stroke="#d39a5a" strokeWidth="3" opacity="0.6" />
      </g>
      <g transform="translate(122 -22) rotate(-8)">
        <ellipse cx="0" cy="42" rx="76" ry="12" fill="#235c65" opacity="0.18" />
        <path d="M-74 0 C-48 32 46 34 78 0 C56 50 -56 50 -74 0Z" fill="#6e3f24" stroke="#3f2417" strokeWidth="4" />
        <path d="M-54 2 C-18 22 34 22 58 2" fill="none" stroke="#d1a064" strokeWidth="6" />
        <rect x="-6" y="-70" width="9" height="84" rx="4" fill="#70401f" />
        <path d="M3 -66 C34 -58 48 -34 6 -18Z" fill="#fff7dd" stroke="#d4b47b" strokeWidth="3" />
        <path d="M-4 -52 C-36 -46 -48 -24 -6 -12Z" fill="#fff7dd" stroke="#d4b47b" strokeWidth="3" />
        <path d="M3 -66 C22 -58 32 -48 36 -36" stroke="#f4c45a" strokeWidth="4" fill="none" />
        <path d="M2 -76 C26 -76 32 -64 2 -60Z" fill="#2e9ad7" />
      </g>
    </g>
  );
}

function PremiumBirds({ mounted }: { mounted: boolean }) {
  if (!mounted) return null;
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.svg
          key={i}
          className="absolute"
          style={{ top: `${14 + (i % 3) * 7}%`, opacity: 0.82 }}
          width="52"
          height="26"
          viewBox="0 0 52 26"
          initial={{ x: `${-10 - i * 8}vw` }}
          animate={{ x: "112vw", y: [0, -10, 5, 0] }}
          transition={{
            x: { duration: 42 + i * 7, delay: -i * 8, repeat: Infinity, ease: "linear" },
            y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <path d="M6 15 C15 4 24 6 27 15 C32 6 42 4 48 15" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <path d="M26 16 L29 18 L26 20 Z" fill="#ffbf62" />
        </motion.svg>
      ))}
    </>
  );
}

export function MainMenu({
  onPlay, onNewGame, onSettings, onLeaderboards, onDaily, onShop,
  onPrestige, onAchievements, onQuests, onEvents, hasSave,
}: MainMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [snap, setSnap] = useState<SaveSnap | null>(null);
  const [hoverPlay, setHoverPlay] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const requestNewGame = () => {
    if (hasSave) setConfirmNew(true);
    else onNewGame();
  };
  const confirmNewGame = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setConfirmNew(false);
    onNewGame();
  };

  useEffect(() => {
    setMounted(true);
    setSnap(loadSnap());
  }, []);

  // Time-of-day cycle (60s loop)
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(((now - start) / 60000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sky gradient cycles: dawn -> day -> dusk -> night
  const sky = useMemo(() => {
    const stops = [
      ["#ffb480", "#ffd6a5", "#9ad6f0"],   // dawn
      ["#7ec8ff", "#bfe5ff", "#e6f4ff"],   // day
      ["#ff8c7a", "#ffc56b", "#6c8fc7"],   // dusk
      ["#0c1838", "#1b2a55", "#37406b"],   // night
    ];
    const safeT = Number.isFinite(t) ? Math.max(0, Math.min(0.999999, t)) : 0;
    const idx = safeT * stops.length;
    const i = Math.floor(idx) % stops.length;
    const j = (i + 1) % stops.length;
    const k = idx - Math.floor(idx);
    const mix = (a: string, b: string) => {
      const pa = a.match(/\w\w/g)?.map((h) => parseInt(h, 16)) ?? [126, 200, 255];
      const pb = b.match(/\w\w/g)?.map((h) => parseInt(h, 16)) ?? pa;
      const m = pa.map((v, n) => Math.round(v + (pb[n] - v) * k));
      return `rgb(${m[0]},${m[1]},${m[2]})`;
    };
    const current = stops[i] ?? stops[0];
    const next = stops[j] ?? stops[0];
    return [mix(current[0], next[0]), mix(current[1], next[1]), mix(current[2], next[2])];
  }, [t]);

  const sideButtons = [
    { id: "daily", label: "Daily", icon: Gift, onClick: onDaily },
    { id: "quests", label: "Quests", icon: Swords, onClick: onQuests ?? onDaily },
    { id: "ach", label: "Achievements", icon: Trophy, onClick: onAchievements ?? onLeaderboards },
    { id: "shop", label: "Shop", icon: ShoppingBag, onClick: onShop },
    { id: "events", label: "Events", icon: CalendarDays, onClick: onEvents ?? (() => toast("События скоро 🎉")) },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* === Animated sky === */}
      <motion.div
        className="absolute inset-0 transition-colors"
        style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 55%, ${sky[2]} 100%)` }}
      />

      {/* Sun / Moon */}
      <motion.div
        className="absolute"
        style={{
          left: `${10 + t * 80}%`,
          top: `${10 + Math.sin(t * Math.PI) * -8 + 8}%`,
        }}
      >
        <div
          className="w-28 h-28 rounded-full"
          style={{
            background: t > 0.6
              ? "radial-gradient(circle, #f5f7ff 0%, #c8d2ff 45%, rgba(200,210,255,0) 75%)"
              : "radial-gradient(circle, #fff7c7 0%, #ffd84a 40%, rgba(255,200,80,0) 75%)",
            filter: "blur(1px)",
          }}
        />
      </motion.div>

      {/* Clouds (parallax) */}
      {mounted && Array.from({ length: 6 }).map((_, i) => {
        const top = 5 + (i * 7) % 35;
        const dur = 50 + i * 9;
        const scale = 0.6 + (i % 3) * 0.3;
        return (
          <motion.div
            key={`cl-${i}`}
            className="absolute"
            style={{ top: `${top}%`, opacity: 0.7 }}
            initial={{ x: "-25vw" }}
            animate={{ x: "120vw" }}
            transition={{ duration: dur, delay: -i * 8, repeat: Infinity, ease: "linear" }}
          >
            <svg width={160 * scale} height={70 * scale} viewBox="0 0 160 70">
              <g fill="#ffffff">
                <ellipse cx="40" cy="44" rx="34" ry="22" />
                <ellipse cx="80" cy="32" rx="38" ry="26" />
                <ellipse cx="120" cy="46" rx="30" ry="20" />
              </g>
            </svg>
          </motion.div>
        );
      })}

      {/* Distant mountain layer (parallax depth) */}
      <motion.svg
        className="absolute bottom-[40%] left-0 w-[110%]"
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
        style={{ height: "20%" }}
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M0,200 L0,120 L120,40 L220,110 L320,30 L460,130 L580,60 L700,120 L800,80 L800,200 Z" fill="#3d6e92" opacity="0.55" />
        <path d="M0,200 L0,150 L100,90 L200,140 L320,80 L440,150 L560,100 L680,140 L800,110 L800,200 Z" fill="#2d567a" opacity="0.7" />
      </motion.svg>

      {/* Ocean — layered depth, waves, sparkle, caustics, foam, fish */}
      <div className="absolute bottom-0 left-0 right-0 h-[55%] overflow-hidden">
        {/* Depth gradient: shallow turquoise -> mid teal -> deep navy */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #9be7f2 0%, #4cc6e8 14%, #1ea0d4 34%, #0f6fb0 62%, #093a73 88%, #051e44 100%)",
          }}
        />
        {/* Subtle horizontal teal band where mid-depth lives */}
        <div
          className="absolute inset-x-0"
          style={{
            top: "8%",
            height: "26%",
            background:
              "linear-gradient(180deg, rgba(120,230,220,0.35) 0%, rgba(80,200,210,0.05) 100%)",
            mixBlendMode: "screen",
          }}
        />

        {/* Caustic light streaks slowly drifting across surface */}
        <motion.div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: "0%",
            height: "35%",
            opacity: 0.35,
            background:
              "repeating-linear-gradient(110deg, transparent 0 26px, rgba(255,255,255,0.12) 26px 30px, transparent 30px 70px)",
            mixBlendMode: "screen",
            filter: "blur(2px)",
          }}
          animate={{ backgroundPositionX: ["0px", "140px"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />

        {/* Sun glint — soft moving highlight on the water */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: "2%",
            left: "30%",
            width: "40%",
            height: "22%",
            background:
              "radial-gradient(ellipse at center, rgba(255,250,210,0.55) 0%, rgba(255,240,180,0.25) 35%, rgba(255,240,180,0) 70%)",
            mixBlendMode: "screen",
            filter: "blur(6px)",
          }}
          animate={{ opacity: [0.55, 0.85, 0.55], scaleX: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Tiny specular sparkles */}
        {mounted &&
          Array.from({ length: 18 }).map((_, i) => {
            const left = (i * 53) % 100;
            const top = 2 + ((i * 17) % 28);
            const dur = 2.2 + ((i * 0.37) % 2.4);
            const delay = (i * 0.31) % 3;
            return (
              <motion.span
                key={`spk-${i}`}
                className="absolute rounded-full"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: 3,
                  height: 3,
                  background: "white",
                  boxShadow: "0 0 6px rgba(255,255,255,0.9)",
                  mixBlendMode: "screen",
                }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 0.6] }}
                transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
              />
            );
          })}

        {/* Sky / cloud reflection band on far water */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: "0%",
            height: "10%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)",
            mixBlendMode: "screen",
            filter: "blur(3px)",
          }}
        />

        {/* Wave layers — back to front, varying amplitude, color, speed */}
        {[
          { top: 0, color: "#ffffff", opacity: 0.22, duration: 11, amp: 5, dir: 1 },
          { top: 6, color: "#cdf2ff", opacity: 0.32, duration: 14, amp: 7, dir: -1 },
          { top: 14, color: "#7fd5ee", opacity: 0.32, duration: 18, amp: 9, dir: 1 },
          { top: 24, color: "#3aa8cf", opacity: 0.28, duration: 23, amp: 11, dir: -1 },
          { top: 38, color: "#15679a", opacity: 0.35, duration: 28, amp: 13, dir: 1 },
          { top: 56, color: "#0a3c70", opacity: 0.45, duration: 34, amp: 14, dir: -1 },
        ].map((w, i) => (
          <motion.svg
            key={`w-${i}`}
            className="absolute left-0 w-[200%]"
            style={{ top: `${w.top}%`, height: 80 }}
            viewBox="0 0 1600 70"
            preserveAspectRatio="none"
            animate={{ x: w.dir > 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
            transition={{ duration: w.duration, repeat: Infinity, ease: "linear" }}
          >
            <path
              d={`M0,35 Q200,${35 - w.amp} 400,35 T800,35 T1200,35 T1600,35 L1600,70 L0,70 Z`}
              fill={w.color}
              opacity={w.opacity}
            />
          </motion.svg>
        ))}

        {/* Drifting foam crests on top water */}
        {mounted &&
          Array.from({ length: 5 }).map((_, i) => {
            const top = 4 + i * 5;
            const dur = 26 + i * 7;
            return (
              <motion.div
                key={`fc-${i}`}
                className="absolute h-[2px] rounded-full"
                style={{
                  top: `${top}%`,
                  width: `${60 + (i * 23) % 80}px`,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
                  filter: "blur(1px)",
                  opacity: 0.7,
                }}
                initial={{ x: "-10vw" }}
                animate={{ x: "110vw" }}
                transition={{ duration: dur, delay: -i * 5, repeat: Infinity, ease: "linear" }}
              />
            );
          })}

        {/* Bubble streams rising from the deep */}
        {mounted &&
          Array.from({ length: 3 }).map((_, s) => {
            const left = 12 + s * 35;
            return (
              <div key={`bs-${s}`} className="absolute" style={{ left: `${left}%`, bottom: "5%", width: 30, height: "30%" }}>
                {Array.from({ length: 4 }).map((_, b) => (
                  <motion.span
                    key={b}
                    className="absolute rounded-full"
                    style={{
                      left: ((b * 7) % 14) + "px",
                      bottom: 0,
                      width: 4 + (b % 2) * 2,
                      height: 4 + (b % 2) * 2,
                      background: "rgba(220,245,255,0.7)",
                      border: "1px solid rgba(255,255,255,0.6)",
                      boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.9)",
                    }}
                    animate={{ y: [0, -120], opacity: [0, 0.9, 0], x: [0, (b % 2 ? 6 : -6)] }}
                    transition={{ duration: 6 + b, delay: s * 1.5 + b * 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                ))}
              </div>
            );
          })}

        {/* Small silvery fish near the surface */}
        {mounted &&
          Array.from({ length: 3 }).map((_, i) => {
            const top = 18 + i * 8;
            const dur = 24 + i * 6;
            const flip = i % 2 === 0;
            return (
              <motion.div
                key={`fish-${i}`}
                className="absolute"
                style={{ top: `${top}%`, opacity: 0.85 }}
                initial={{ x: flip ? "-15vw" : "115vw" }}
                animate={{ x: flip ? "115vw" : "-15vw", y: [0, -4, 4, 0] }}
                transition={{
                  x: { duration: dur, delay: i * 4, repeat: Infinity, ease: "linear" },
                  y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <svg width="22" height="10" viewBox="0 0 22 10" style={{ transform: flip ? "none" : "scaleX(-1)" }}>
                  <ellipse cx="9" cy="5" rx="7" ry="3" fill="#e8f5ff" stroke="#8fc5dc" strokeWidth="0.6" />
                  <polygon points="16,5 22,1 22,9" fill="#cfe6f1" stroke="#8fc5dc" strokeWidth="0.6" />
                  <circle cx="5" cy="4.2" r="0.6" fill="#1a1a2e" />
                </svg>
              </motion.div>
            );
          })}



        {/* Island with subtle camera drift */}
        <motion.div
          className="absolute left-1/2"
          style={{ bottom: "18%", x: "-50%" }}
          animate={{ y: [0, -6, 0], x: ["-52%", "-48%", "-52%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Pulsing foam ring around the island shoreline */}
          <motion.div
            className="absolute left-1/2 pointer-events-none"
            style={{
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 600,
              height: 110,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(255,255,255,0) 56%, rgba(255,255,255,0.85) 64%, rgba(255,255,255,0) 78%)",
              filter: "blur(2px)",
              mixBlendMode: "screen",
            }}
            animate={{ scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <svg width="560" height="240" viewBox="0 0 560 240">
            <defs>
              <radialGradient id="sand" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#fff1bd" />
                <stop offset="100%" stopColor="#e9c277" />
              </radialGradient>
              <radialGradient id="grass" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#8be082" />
                <stop offset="100%" stopColor="#3ea34a" />
              </radialGradient>
              <radialGradient id="wetSand" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#c69a55" />
                <stop offset="100%" stopColor="#a07a3a" />
              </radialGradient>
              <radialGradient id="shallow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#bff3ff" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#7fd9ee" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Shallow turquoise halo (light water near beach) */}
            <ellipse cx="280" cy="180" rx="290" ry="60" fill="url(#shallow)" />
            {/* Wet sand band — darker, just outside dry sand */}
            <ellipse cx="280" cy="178" rx="272" ry="52" fill="url(#wetSand)" opacity="0.85" />
            {/* Dry sand */}
            <ellipse cx="280" cy="170" rx="260" ry="48" fill="url(#sand)" />
            {/* Grass */}
            <ellipse cx="280" cy="135" rx="180" ry="52" fill="url(#grass)" />
            {/* Surf line — thin white foam along the waterline */}
            <ellipse cx="280" cy="184" rx="268" ry="48" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeDasharray="14 10" opacity="0.7" />
            <ellipse cx="120" cy="168" rx="22" ry="12" fill="#8a96aa" />
            <ellipse cx="450" cy="170" rx="26" ry="14" fill="#8a96aa" />
            {/* Tiny foam splashes around rocks */}
            <ellipse cx="120" cy="178" rx="30" ry="6" fill="rgba(255,255,255,0.75)" />
            <ellipse cx="450" cy="180" rx="34" ry="7" fill="rgba(255,255,255,0.75)" />
            <g transform="translate(220 105)">
              <rect x="0" y="0" width="28" height="24" fill="#f5d29a" stroke="#8a5a2a" strokeWidth="1.5" />
              <polygon points="-2,0 30,0 14,-14" fill="#e8a020" stroke="#8a6a10" strokeWidth="1.5" />
            </g>
            <g transform="translate(300 110)">
              <rect x="0" y="0" width="22" height="20" fill="#f5d29a" stroke="#8a5a2a" strokeWidth="1.5" />
              <polygon points="-2,0 24,0 11,-12" fill="#3a7ac8" stroke="#1e4a82" strokeWidth="1.5" />
            </g>
          </svg>


          {[{ left: "15%", s: 1 }, { left: "75%", s: 0.9 }, { left: "48%", s: 1.1 }].map((p, i) => (
            <motion.div
              key={`pl-${i}`}
              className="absolute"
              style={{ left: p.left, bottom: "55%", transformOrigin: "bottom center", transform: `scale(${p.s})` }}
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="110" height="160" viewBox="0 0 110 160">
                <path d="M55,160 Q48,110 52,70 Q56,40 62,10" stroke="#7a4a26" strokeWidth="8" fill="none" strokeLinecap="round" />
                {[0, 60, 120, 180, 240, 300].map((rot) => (
                  <g key={rot} transform={`translate(60 18) rotate(${rot})`}>
                    <path d="M0,0 Q24,-10 50,0 Q24,8 0,0 Z" fill="#3aa84a" stroke="#2d8c3e" strokeWidth="2" />
                  </g>
                ))}
                <circle cx="60" cy="18" r="6" fill="#2d8c3e" />
              </svg>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Birds */}
      {mounted && Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={`bd-${i}`}
          className="absolute"
          style={{ top: `${10 + i * 6}%` }}
          initial={{ x: "-10vw" }}
          animate={{ x: "110vw", y: [0, -16, 8, -10, 0] }}
          transition={{
            x: { duration: 22 + i * 4, delay: i * 5, repeat: Infinity, ease: "linear" },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <motion.svg width={24} height={12} viewBox="0 0 28 14" animate={{ scaleY: [1, 0.5, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
            <path d="M2,8 Q7,1 14,7 Q21,1 26,8" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
          </motion.svg>
        </motion.div>
      ))}

      {/* Soft canvas-tone vignette (lighter so Miro UI reads cleanly) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,20,0.35) 100%)" }} />

      {/* ============ FOREGROUND UI — Miro design tokens ============ */}

      {/* TOP BAR */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 sm:top-5 sm:left-6 sm:right-6 z-30 flex items-center gap-2 sm:gap-3"
      >
        <ProfileChip snap={snap} />

        <div className="hidden md:flex items-center gap-2 ml-1">
          <ResChip icon={<Coins className="w-5 h-5" style={{ color: "#7a4a10" }} />} value={fmt(snap?.gold ?? 0)} bg="#fde8c4" />
          <ResChip icon={<TreePine className="w-5 h-5" style={{ color: "#0e6b63" }} />} value={fmt(snap?.wood ?? 0)} bg="#cdf3ee" />
          <ResChip icon={<Mountain className="w-5 h-5" style={{ color: "#6b4e1a" }} />} value={fmt(snap?.stone ?? 0)} bg="#fff1bd" />
        </div>

        <div className="flex-1" />

        <IconChip onClick={() => toast("Уведомлений нет 🔔")} title="Уведомления">
          <Bell className="w-5 h-5" strokeWidth={2.2} />
          {hasSave && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "#ff4747" }} />}
        </IconChip>
        <IconChip onClick={onSettings} title="Настройки">
          <Settings className="w-5 h-5" strokeWidth={2.2} />
        </IconChip>
        <AuthChip />
      </motion.div>

      {/* TITLE — Miro-style wordmark with yellow sticky highlight */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.9, 0.3, 1.1] }}
        className="absolute top-[10%] sm:top-[12%] left-0 right-0 z-20 text-center pointer-events-none px-4"
      >
        <div
          className="inline-block mb-3 px-3 py-1 rounded-full font-semibold tracking-[0.18em]"
          style={{
            background: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: "#ffffff",
            fontSize: "13px",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 24px rgba(30,80,100,0.25)",
          }}
        >
          ISLECRAFT · ТРОПИКИ
        </div>
        <h1
          className="font-semibold leading-[1.02] tracking-[-0.04em]"
          style={{
            fontSize: "clamp(3rem, 9vw, 6.8rem)",
            color: "#ffffff",
            textShadow: "0 6px 28px rgba(30,80,110,0.45)",
          }}
        >
          Isle
          <br />
          <span className="relative inline-block">
            <span style={{ color: "#ffffff", position: "relative", padding: "0 0.18em" }}>craft</span>
          </span>

        </h1>
      </motion.div>

      {/* SIDE QUICK MENU — circular white icons on hairline */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="absolute left-3 sm:left-6 top-[44%] sm:top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 sm:gap-2.5"
      >
        {sideButtons.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.04 }}
            whileHover={{ scale: 1.06, x: 2 }}
            whileTap={{ scale: 0.94 }}
            onClick={b.onClick}
            title={b.label}
            className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.9)",
              color: "#6b4e1a",
              boxShadow: "0 6px 18px rgba(107,78,26,0.15)",
            }}
          >
            <b.icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
            <span
              className="absolute left-full ml-2 px-3 py-1.5 text-[14px] font-semibold rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none hidden sm:block"
              style={{ background: "#ffd84a", color: "#6b4e1a" }}
            >
              {b.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* CENTER — PLAY card */}
      <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="pointer-events-auto w-full max-w-md px-5 pb-8 sm:pb-0 sm:mt-28"
        >
          {/* Save snapshot — clean white feature card */}
          <AnimatePresence>
            {snap && hasSave && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                className="mb-4 p-4 sm:p-5"
                style={{
                  background: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  borderRadius: "28px",
                  boxShadow: "0 20px 60px rgba(107,78,26,0.18)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] uppercase tracking-[0.12em] font-semibold" style={{ color: "#8e91a0" }}>
                    Последнее сохранение
                  </div>
                  <div
                    className="text-[13px] font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                    style={{ background: "#e6f7ef", color: "#00b473" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00b473" }} />
                    Синхронизировано
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "#fde8c4" }}
                  >
                    🏝️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold capitalize truncate text-[17px]" style={{ color: "#6b4e1a" }}>
                      {snap.islandName}
                    </div>
                    <div className="text-[14px] mt-0.5" style={{ color: "#6b6f7e" }}>
                      Зданий <b style={{ color: "#6b4e1a" }}>{snap.buildings}</b>/{snap.plots} · Уровень{" "}
                      <b style={{ color: "#6b4e1a" }}>{snap.level}</b>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (snap.buildings / Math.max(1, snap.plots)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="h-full"
                        style={{ background: "#ffd84a" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRIMARY PLAY — black pill (Miro signature) */}
          <motion.button
            onMouseEnter={() => setHoverPlay(true)}
            onMouseLeave={() => setHoverPlay(false)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={hasSave ? onPlay : onNewGame}
            className="relative w-full overflow-hidden flex items-center justify-center gap-3"
            style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: "#6b4e1a",
              border: "1.5px solid rgba(255,216,74,0.9)",
              borderRadius: "9999px",
              padding: "20px 28px",
              fontSize: "19px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              boxShadow: hoverPlay
                ? "0 20px 50px rgba(245,184,32,0.45), 0 0 0 4px rgba(255,216,74,0.45)"
                : "0 16px 40px rgba(245,184,32,0.4)",
              transition: "box-shadow 0.25s ease",
            }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: "#ffd84a", color: "#6b4e1a" }}
            >
              <Play className="w-5 h-5 fill-current" strokeWidth={0} />
            </span>
            <span>{hasSave ? "Продолжить игру" : "Начать играть"}</span>
            <ChevronRight className="w-6 h-6 opacity-70" />
          </motion.button>

          {/* Secondary — full width like primary */}
          <div className="mt-3 w-full">
            <SecondaryBtn icon={<Plus className="w-5 h-5" strokeWidth={2.4} />} label="Новая игра" onClick={requestNewGame} />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="absolute bottom-3 right-4 text-[12px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        v1.0 · Islecraft
      </motion.div>

      {/* CONFIRM NEW GAME MODAL */}
      <AnimatePresence>
        {confirmNew && (
          <motion.div
            key="confirm-new"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: "rgba(10,20,35,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
              onClick={() => setConfirmNew(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="relative w-full max-w-md p-6 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.9)",
                borderRadius: "28px",
                boxShadow: "0 30px 80px rgba(10,20,35,0.35)",
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "#ffe3e3" }}
                >
                  ⚠️
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-[22px] leading-tight" style={{ color: "#1a1a2e" }}>
                    Вы уверены?
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#4b5063" }}>
                    У вас уже есть сохранённая игра. Создание новой игры приведёт к удалению текущего прогресса. Это действие нельзя отменить.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmNew(false)}
                  className="flex-1 rounded-full font-semibold text-[15px] py-3 px-5"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    color: "#4b5063",
                    border: "1.5px solid #e4e6ec",
                  }}
                >
                  ❌ Отмена
                </motion.button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmNewGame}
                  className="flex-1 rounded-full font-semibold text-[15px] py-3 px-5"
                  style={{
                    background: "#ff4d57",
                    color: "#ffffff",
                    border: "1.5px solid #ff4d57",
                    boxShadow: "0 10px 24px rgba(255,77,87,0.4)",
                  }}
                >
                  ✅ Создать новую игру
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- subcomponents (Miro design tokens) ---------- */

function ResChip({ icon, value, bg }: { icon: React.ReactNode; value: string; bg: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 h-9 rounded-full"
      style={{ background: bg, color: "#6b4e1a", border: "1px solid rgba(255,255,255,0.8)" }}
    >
      {icon}
      <span className="text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

function IconChip({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={title}
      className="relative w-9 h-9 rounded-full flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.9)",
        color: "#6b4e1a",
        boxShadow: "0 4px 12px rgba(107,78,26,0.12)",
      }}
    >
      {children}
    </motion.button>
  );
}

function SecondaryBtn({
  icon,
  label,
  onClick,
  variant = "outline",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "outline" | "yellow";
}) {
    const styles =
      variant === "yellow"
        ? { background: "rgba(255,216,74,0.75)", color: "#6b4e1a", border: "1.5px solid rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }
        : { background: "rgba(255,255,255,0.55)", color: "#6b4e1a", border: "1.5px solid rgba(255,216,74,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" };
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative w-full flex items-center justify-center gap-2 rounded-full font-semibold text-[15px]"
      style={{
        ...styles,
        padding: "12px 18px",
        boxShadow: "0 6px 16px rgba(107,78,26,0.18)",
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

function ProfileChip({ snap }: { snap: SaveSnap | null }) {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Гость";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  const level = snap?.level ?? 1;
  const xpPct = snap ? Math.min(100, (snap.xp / Math.max(1, snap.xpNext)) * 100) : 0;

  return (
    <div
      className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 6px 18px rgba(107,78,26,0.15)",
      }}
    >
      <div className="relative">
        {avatar ? (
          <img src={avatar} alt="" className="w-8 h-8 rounded-full" style={{ border: "2px solid #ffb347" }} />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[15px]"
            style={{ background: "#ffb347", color: "#6b4e1a" }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className="absolute -bottom-1 -right-1 min-w-[20px] h-[16px] px-1 rounded-full text-[12px] font-extrabold flex items-center justify-center"
          style={{ background: "#ffd84a", color: "#6b4e1a", border: "2px solid #ffffff" }}
        >
          {level}
        </div>
      </div>
      <div className="hidden sm:flex flex-col min-w-0">
        <div className="text-[14px] font-bold truncate max-w-[110px] leading-tight" style={{ color: "#6b4e1a" }}>
          {name}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full"
              style={{ background: "#ffd84a" }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: "#8e91a0" }}>
            {Math.round(xpPct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AuthChip() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/login"
          search={{ mode: "login" }}
          className="flex items-center gap-1.5 px-4 h-9 rounded-full text-[14px] font-semibold"
          style={{ background: "rgba(255,216,74,0.8)", color: "#6b4e1a", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.8)" }}
        >
          Войти
        </Link>
        <Link
          to="/login"
          search={{ mode: "register" }}
          className="hidden sm:flex items-center gap-1.5 px-4 h-9 rounded-full text-[14px] font-semibold"
          style={{ background: "rgba(255,255,255,0.62)", color: "#6b4e1a", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.9)" }}
        >
          Регистрация
        </Link>
      </div>
    );
  }
  const email = user.email ?? "Аккаунт";
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={async () => {
        await supabase.auth.signOut();
        toast.success("Вы вышли из аккаунта");
      }}
      title="Выйти"
      className="h-9 max-w-[230px] rounded-full flex items-center justify-center gap-2 px-3"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.9)",
        color: "#6b4e1a",
        boxShadow: "0 4px 12px rgba(107,78,26,0.12)",
      }}
    >
      <span className="block max-w-[120px] sm:max-w-[180px] truncate text-[13px] font-semibold" title={email}>
        {email}
      </span>
      <LogOut className="w-4 h-4" />
    </motion.button>
  );
}
