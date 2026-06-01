import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Cloud, Clouds, Float, Sparkles, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import { ISLANDS, BUILDINGS } from "@/game/data";
import type { GameState } from "@/game/types";

interface IslandViewProps {
  state: GameState;
  onPlotClick: (index: number) => void;
}

/* ---------------- Plot layout in 3D ---------------- */

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

/* ---------------- Ocean ---------------- */

function Ocean() {
  const ref = useRef<THREE.Mesh>(null!);
  const geom = useMemo(() => new THREE.PlaneGeometry(160, 160, 64, 64), []);
  const original = useMemo(() => Float32Array.from(geom.attributes.position.array), [geom]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = original[i];
      const y = original[i + 1];
      pos[i + 2] =
        Math.sin(x * 0.25 + t * 1.1) * 0.18 +
        Math.cos(y * 0.3 + t * 0.9) * 0.15 +
        Math.sin((x + y) * 0.15 + t * 0.6) * 0.1;
    }
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
  });

  return (
    <mesh ref={ref} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
      <meshPhysicalMaterial
        color="#3aa6c9"
        roughness={0.15}
        metalness={0.1}
        transmission={0.55}
        thickness={1.2}
        transparent
        opacity={0.92}
        clearcoat={1}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
}

/* ---------------- Island base ---------------- */

function IslandBase({ tint }: { tint: string }) {
  return (
    <group>
      {/* Underwater dirt */}
      <mesh position={[0, -1.6, 0]} receiveShadow>
        <cylinderGeometry args={[10, 11.5, 1.6, 48]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      {/* Sand ring */}
      <mesh position={[0, -0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[8.6, 9.6, 0.9, 64]} />
        <meshStandardMaterial color="#f3deaa" roughness={0.95} />
      </mesh>
      {/* Grass top */}
      <mesh position={[0, 0.18, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[7.2, 8.4, 0.55, 64]} />
        <meshStandardMaterial color={tint} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ---------------- Vegetation ---------------- */

function Palm({ position, scale = 1, delay = 0 }: { position: [number, number, number]; scale?: number; delay?: number }) {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + delay;
    group.current.rotation.z = Math.sin(t * 1.2) * 0.05;
    group.current.rotation.x = Math.cos(t * 0.9) * 0.03;
  });
  const leafGeo = useMemo(() => new THREE.SphereGeometry(0.5, 8, 6), []);
  return (
    <group position={position} scale={scale}>
      <group ref={group}>
        {/* Trunk */}
        <mesh castShadow position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.13, 0.2, 2.2, 8]} />
          <meshStandardMaterial color="#7a4a26" roughness={1} />
        </mesh>
        {/* Coconut crown */}
        <group position={[0, 2.3, 0]}>
          {Array.from({ length: 7 }).map((_, i) => {
            const a = (i / 7) * Math.PI * 2;
            return (
              <mesh
                key={i}
                geometry={leafGeo}
                position={[Math.cos(a) * 0.7, 0.2, Math.sin(a) * 0.7]}
                scale={[1.4, 0.18, 0.5]}
                rotation={[0, -a, -0.4]}
                castShadow
              >
                <meshStandardMaterial color="#2d8a3a" roughness={0.8} />
              </mesh>
            );
          })}
          <mesh castShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color="#3b2a1a" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function GrassPatch({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const count = 60;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        x: (Math.random() - 0.5) * 2.4,
        z: (Math.random() - 0.5) * 2.4,
        r: Math.random() * Math.PI,
        s: 0.6 + Math.random() * 0.6,
        p: Math.random() * Math.PI * 2,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      dummy.position.set(s.x, 0.15, s.z);
      dummy.rotation.set(0, s.r, Math.sin(t * 2 + s.p) * 0.15);
      dummy.scale.set(0.06, 0.35 * s.s, 0.06);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#4ea24a" roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

function Flower({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.4;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 5]} />
        <meshStandardMaterial color="#3a7a3a" />
      </mesh>
      <group ref={ref} position={[0, 0.32, 0]}>
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} />
            </mesh>
          );
        })}
        <mesh>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#ffdd55" emissive="#ffaa00" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={scale} castShadow rotation={[Math.random(), Math.random(), Math.random()]}>
      <dodecahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial color="#8a8a90" roughness={0.95} />
    </mesh>
  );
}

function Bush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[
        [0, 0.25, 0, 0.35],
        [0.3, 0.2, 0.1, 0.28],
        [-0.25, 0.22, -0.1, 0.3],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 12, 10]} />
          <meshStandardMaterial color="#3a8a3a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- Living things ---------------- */

function Bird({ radius, speed, height, color = "#ffffff" }: { radius: number; speed: number; height: number; color?: string }) {
  const ref = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Mesh>(null!);
  const wingR = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed;
    ref.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 2) * 0.4, Math.sin(t) * radius);
    ref.current.rotation.y = -t + Math.PI / 2;
    const flap = Math.sin(clock.elapsedTime * 14) * 0.7;
    wingL.current.rotation.z = flap;
    wingR.current.rotation.z = -flap;
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={wingL} position={[0, 0, 0.05]}>
        <boxGeometry args={[0.5, 0.02, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={wingR} position={[0, 0, -0.05]}>
        <boxGeometry args={[0.5, 0.02, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Butterfly({ origin, color }: { origin: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  const wL = useRef<THREE.Mesh>(null!);
  const wR = useRef<THREE.Mesh>(null!);
  const offset = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + offset;
    ref.current.position.set(
      origin[0] + Math.sin(t * 0.7) * 0.8,
      origin[1] + Math.sin(t * 1.4) * 0.3,
      origin[2] + Math.cos(t * 0.7) * 0.8,
    );
    const flap = Math.sin(t * 20) * 1.1;
    wL.current.rotation.y = flap;
    wR.current.rotation.y = -flap;
  });
  return (
    <group ref={ref} scale={0.4}>
      <mesh ref={wL} position={[-0.15, 0, 0]}>
        <planeGeometry args={[0.3, 0.25]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh ref={wR} position={[0.15, 0, 0]}>
        <planeGeometry args={[0.3, 0.25]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.2} />
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
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/* ---------------- Buildings (procedural 3D) ---------------- */

function HutBuilding({ stages }: { stages: number }) {
  return (
    <>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#c69a6b" />
      </mesh>
      <mesh castShadow position={[0, 0.9, 0]}>
        <coneGeometry args={[0.75, 0.6, 4]} />
        <meshStandardMaterial color="#7a3a1a" />
      </mesh>
      <mesh position={[0, 0.35, 0.46]}>
        <boxGeometry args={[0.25, 0.4, 0.02]} />
        <meshStandardMaterial color="#3a2010" />
      </mesh>
      {stages >= 2 && (
        <mesh castShadow position={[0.5, 0.25, 0.5]}>
          <boxGeometry args={[0.3, 0.5, 0.3]} />
          <meshStandardMaterial color="#d4a874" />
        </mesh>
      )}
    </>
  );
}

function LumberBuilding({ stages }: { stages: number }) {
  const saw = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    if (saw.current) saw.current.rotation.z += dt * 4;
  });
  return (
    <>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1, 0.6, 0.8]} />
        <meshStandardMaterial color="#a06030" />
      </mesh>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[1.1, 0.3, 0.9]} />
        <meshStandardMaterial color="#5a2a10" />
      </mesh>
      <mesh ref={saw} position={[0.55, 0.4, 0]}>
        <torusGeometry args={[0.2, 0.04, 8, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.2} />
      </mesh>
      {stages >= 2 && (
        <mesh position={[-0.5, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
          <meshStandardMaterial color="#6a3a1a" />
        </mesh>
      )}
    </>
  );
}

function QuarryBuilding({ stages }: { stages: number }) {
  return (
    <>
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.3, 8]} />
        <meshStandardMaterial color="#6a6a70" />
      </mesh>
      <mesh castShadow position={[0.2, 0.45, 0.1]}>
        <dodecahedronGeometry args={[0.35]} />
        <meshStandardMaterial color="#8a8a90" />
      </mesh>
      <mesh castShadow position={[-0.3, 0.4, -0.1]}>
        <dodecahedronGeometry args={[0.3]} />
        <meshStandardMaterial color="#7a7a80" />
      </mesh>
      {stages >= 2 && (
        <mesh castShadow position={[0, 0.7, -0.2]}>
          <dodecahedronGeometry args={[0.22]} />
          <meshStandardMaterial color="#9a9aa0" />
        </mesh>
      )}
    </>
  );
}

function WindmillBuilding() {
  const blades = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 1.2;
  });
  return (
    <>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.18, 0.3, 1.1, 12]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      <mesh castShadow position={[0, 1.05, 0]}>
        <coneGeometry args={[0.22, 0.3, 12]} />
        <meshStandardMaterial color="#c83030" />
      </mesh>
      <group ref={blades} position={[0, 0.95, 0.2]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} castShadow>
            <boxGeometry args={[0.08, 0.7, 0.04]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>
    </>
  );
}

function MarketBuilding({ stages }: { stages: number }) {
  return (
    <>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.6, 1]} />
        <meshStandardMaterial color="#e8d090" />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0]}>
        <coneGeometry args={[1, 0.5, 4]} />
        <meshStandardMaterial color="#d04040" />
      </mesh>
      <mesh position={[0, 0.3, 0.51]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
        <meshStandardMaterial color="#3a2010" />
      </mesh>
      {stages >= 2 && (
        <>
          <mesh position={[0.7, 0.15, 0.7]}>
            <boxGeometry args={[0.2, 0.3, 0.2]} />
            <meshStandardMaterial color="#a06030" />
          </mesh>
          <mesh position={[-0.7, 0.15, 0.7]}>
            <boxGeometry args={[0.2, 0.3, 0.2]} />
            <meshStandardMaterial color="#a06030" />
          </mesh>
        </>
      )}
    </>
  );
}

function RefineryBuilding() {
  return (
    <>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#5a4a8a" />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.8, 8]} />
        <meshStandardMaterial color="#7a5aaa" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color="#b080ff" emissive="#9050ff" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, 1.7, 0]} color="#b070ff" intensity={2} distance={4} />
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


/* ---------------- Plot ---------------- */

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
          <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.51, 0]}>
            <ringGeometry args={[0.55, 0.75, 32]} />
            <meshBasicMaterial color="#ffe680" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <Html center position={[0, 0.9, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
            <div className="bg-white/90 text-amber-700 font-bold rounded-full w-9 h-9 flex items-center justify-center border-2 border-white shadow-card text-xl">
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

/* ---------------- Sun / day cycle ---------------- */

function DayCycle() {
  const sun = useRef<THREE.DirectionalLight>(null!);
  const ambient = useRef<THREE.AmbientLight>(null!);
  const { scene } = useThree();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.04;
    const angle = t % (Math.PI * 2);
    const y = Math.sin(angle) * 30;
    const x = Math.cos(angle) * 25;
    sun.current.position.set(x, Math.max(8, y), 12);
    const day = Math.max(0, Math.sin(angle));
    sun.current.intensity = 0.8 + day * 1.2;
    sun.current.color.setHSL(0.07 + (1 - day) * 0.04, 0.6, 0.6 + day * 0.2);
    ambient.current.intensity = 0.35 + day * 0.35;
    (scene.fog as THREE.Fog).color.setHSL(0.58, 0.4, 0.55 + day * 0.2);
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.5} />
      <directionalLight
        ref={sun}
        position={[20, 25, 12]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight args={["#bde0ff", "#3a8050", 0.5]} />
    </>
  );
}

/* ---------------- Scene ---------------- */

function IslandScene({ state, onPlotClick }: IslandViewProps) {
  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;
  const tint = useMemo(() => {
    switch (island.id) {
      case "volcano":
        return "#6a4a3a";
      case "crystal":
        return "#7ad0c0";
      case "golden":
        return "#d4b66a";
      default:
        return "#5fb050";
    }
  }, [island.id]);

  const slots = useMemo(
    () => PLOT_POSITIONS.slice(0, Math.max(state.plots, state.buildings.length)),
    [state.plots, state.buildings.length],
  );

  const palms = useMemo(
    () =>
      [
        [-5.5, 0.4, 1.5, 1.1, 0],
        [5.2, 0.4, -1.8, 1, 0.5],
        [-3.5, 0.4, 4.5, 0.9, 1.2],
        [4.5, 0.4, 4, 1.05, 1.8],
        [-6, 0.4, -3, 0.95, 0.3],
        [3, 0.4, -5, 1, 0.9],
      ] as [number, number, number, number, number][],
    [],
  );

  const flowers = useMemo(
    () =>
      Array.from({ length: 14 }).map(() => {
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 4;
        const colors = ["#ff5a8a", "#ff9050", "#c870ff", "#ffe060", "#ffffff"];
        return {
          pos: [Math.cos(a) * r, 0.45, Math.sin(a) * r] as [number, number, number],
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      }),
    [],
  );

  const rocks = useMemo(
    () =>
      Array.from({ length: 6 }).map(() => {
        const a = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 2.5;
        return {
          pos: [Math.cos(a) * r, 0.2, Math.sin(a) * r] as [number, number, number],
          scale: 0.6 + Math.random() * 0.8,
        };
      }),
    [],
  );

  const bushes = useMemo(
    () =>
      Array.from({ length: 5 }).map(() => {
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 3.5;
        return [Math.cos(a) * r, 0.45, Math.sin(a) * r] as [number, number, number];
      }),
    [],
  );

  const grassPatches = useMemo(
    () =>
      Array.from({ length: 8 }).map(() => {
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 5;
        return [Math.cos(a) * r, 0.45, Math.sin(a) * r] as [number, number, number];
      }),
    [],
  );

  return (
    <>
      <fog attach="fog" args={["#9cd4e8", 30, 90]} />
      <DayCycle />
      <Sky sunPosition={[20, 25, 12]} turbidity={4} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <Environment preset="sunset" />

      <Ocean />
      <Sparkles count={80} scale={[40, 1, 40]} position={[0, -0.2, 0]} size={3} speed={0.3} color="#ffffff" />

      <IslandBase tint={tint} />

      {/* Vegetation */}
      {palms.map((p, i) => (
        <Palm key={i} position={[p[0], p[1], p[2]]} scale={p[3]} delay={p[4]} />
      ))}
      {grassPatches.map((p, i) => (
        <GrassPatch key={i} position={p} />
      ))}
      {flowers.map((f, i) => (
        <Flower key={i} position={f.pos} color={f.color} />
      ))}
      {rocks.map((r, i) => (
        <Rock key={i} position={r.pos} scale={r.scale} />
      ))}
      {bushes.map((p, i) => (
        <Bush key={i} position={p} />
      ))}

      {/* Cosmetics */}
      {state.cosmetics.includes("lighthouse") && (
        <group position={[-6.5, 0.4, 4]}>
          <mesh castShadow position={[0, 1, 0]}>
            <cylinderGeometry args={[0.35, 0.5, 2, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
            <meshStandardMaterial color="#ffdd55" emissive="#ffaa00" emissiveIntensity={1} />
          </mesh>
          <pointLight position={[0, 2.2, 0]} color="#ffcc66" intensity={2} distance={8} />
        </group>
      )}
      {state.cosmetics.includes("statue") && (
        <group position={[6, 0.4, -4]}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
            <meshStandardMaterial color="#909098" />
          </mesh>
          <mesh castShadow position={[0, 1, 0]}>
            <sphereGeometry args={[0.35, 16, 12]} />
            <meshStandardMaterial color="#a0a0a8" />
          </mesh>
        </group>
      )}

      {/* Plots / buildings */}
      {slots.map((pos, i) => (
        <Plot
          key={i}
          position={[pos[0], 0.46, pos[1]]}
          building={state.buildings[i]}
          empty={!state.buildings[i]}
          onClick={() => onPlotClick(i)}
        />
      ))}

      {/* Living things */}
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} bounds={[10, 2, 10]} position={[-8, 12, -6]} color="#ffffff" opacity={0.7} />
        <Cloud seed={2} bounds={[10, 2, 10]} position={[10, 14, 4]} color="#ffffff" opacity={0.6} />
        <Cloud seed={3} bounds={[8, 2, 8]} position={[0, 16, -10]} color="#ffffff" opacity={0.5} />
      </Clouds>

      <Bird radius={14} speed={0.4} height={10} />
      <Bird radius={11} speed={0.55} height={8.5} color="#f8e8d0" />
      <Bird radius={16} speed={0.3} height={11} color="#ffffff" />

      <Butterfly origin={[-2, 1, 2]} color="#ff7ab8" />
      <Butterfly origin={[2.5, 0.9, -2]} color="#80c8ff" />
      <Butterfly origin={[0, 1.1, 4]} color="#ffd060" />

      <Fish radius={11} depth={-0.7} speed={0.5} color="#ff8040" />
      <Fish radius={13} depth={-0.9} speed={-0.35} color="#60c0ff" />
      <Fish radius={9} depth={-0.6} speed={0.65} color="#ff60a0" />
    </>
  );
}

/* ---------------- Camera controls ---------------- */

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

/* ---------------- Public component ---------------- */

export function IslandView({ state, onPlotClick }: IslandViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl bg-gradient-sky">
      {mounted && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [14, 12, 14], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <IslandScene state={state} onPlotClick={onPlotClick} />
            <CameraRig />
          </Suspense>
        </Canvas>
      )}

      {/* Island label overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-card border-2 border-white pointer-events-none">
        <span className="font-display font-bold text-sm">
          {island.emoji} {island.name} · ×{island.rateBonus}
        </span>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[11px] px-3 py-1 rounded-full pointer-events-none backdrop-blur">
        Перетаскивайте — вращение · колесо/щипок — масштаб
      </div>
    </div>
  );
}
