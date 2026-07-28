"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { clampPitch, dragYaw } from "@/lib/motion/could";

function Glass({ color }: { color: string }) {
  const group = useRef<Group>(null);
  const liquid = useRef<Mesh>(null);
  const dragging = useRef(false);
  const velocity = useRef(0);
  const rest = useRef(0);
  const ripples = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        return { x: Math.cos(angle) * 0.38, z: Math.sin(angle) * 0.38, phase: index * 0.4 };
      }),
    [],
  );

  useFrame(({ invalidate }, delta) => {
    const node = group.current;
    if (!node) return;
    const t = performance.now() / 1000;
    if (dragging.current) {
      node.position.y = 0;
    } else {
      velocity.current *= Math.exp(-4 * delta);
      rest.current += velocity.current * delta;
      const sway = Math.sin(t) * ((8 * Math.PI) / 180);
      node.rotation.y = rest.current + sway;
      node.position.y = Math.sin(t * 1.25) * 0.04;
    }
    if (liquid.current) {
      liquid.current.rotation.y = Math.sin(t * 0.7) * 0.04;
      liquid.current.position.y = -0.2 + Math.sin(t * 2.1) * 0.012;
    }
    invalidate();
  });

  return (
    <group
      ref={group}
      onPointerDown={(event) => {
        dragging.current = true;
        event.stopPropagation();
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerMove={(event) => {
        const node = group.current;
        if (!dragging.current || !node) return;
        const yaw = dragYaw(event.movementX);
        rest.current += yaw;
        velocity.current = yaw / 0.016;
        const pitch = clampPitch((node.rotation.x * 180) / Math.PI - event.movementY * 0.2);
        node.rotation.x = (pitch * Math.PI) / 180;
      }}
    >
      <mesh>
        <cylinderGeometry args={[0.55, 0.46, 1.35, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#f7f4ee"
          transmission={0.92}
          thickness={0.42}
          roughness={0.045}
          metalness={0.02}
          ior={1.5}
          transparent
          opacity={0.5}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.025, 16, 64]} />
        <meshPhysicalMaterial color="#f4efe6" transmission={0.7} roughness={0.1} thickness={0.2} />
      </mesh>
      <mesh ref={liquid} position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.47, 0.41, 0.78, 64]} />
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.46, 64]} />
        <meshStandardMaterial color={color} roughness={0.18} metalness={0.08} />
      </mesh>
      {ripples.map((ripple) => (
        <mesh key={`${ripple.x}-${ripple.z}`} position={[ripple.x, 0.205, ripple.z]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color="#fff8ef" transparent opacity={0.35} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[-0.28, 0.1, 0.42]} rotation={[0, 0.4, 0.1]}>
        <planeGeometry args={[0.08, 0.9]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

export default function Cup3DScene({ color }: { color: string }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={{ fov: 30, position: [0, 0.25, 3.2] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          gl.domElement.dispatchEvent(new CustomEvent("crema-webgl-lost", { bubbles: true }));
        });
      }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2.2, 3.4, 2]} intensity={1.25} />
      <directionalLight position={[-2, 1.2, -1]} intensity={0.35} color="#ffd9a8" />
      <pointLight position={[0.4, 1.5, 1.2]} intensity={0.55} color="#fff1d6" />
      <Glass color={color} />
    </Canvas>
  );
}
