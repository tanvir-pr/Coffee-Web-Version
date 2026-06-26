"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { clampPitch, dragYaw } from "@/lib/motion/could";

function Glass({ color }: { color: string }) {
  const group = useRef<Group>(null);
  const dragging = useRef(false);
  const velocity = useRef(0);
  const rest = useRef(0);

  useFrame(({ invalidate }, delta) => {
    const node = group.current;
    if (!node) return;
    if (dragging.current) {
      node.position.y = 0;
    } else {
      velocity.current *= Math.exp(-4 * delta);
      rest.current += velocity.current * delta;
      const sway = Math.sin(performance.now() / 1000) * ((8 * Math.PI) / 180);
      node.rotation.y = rest.current + sway;
      node.position.y = Math.sin(performance.now() / 800) * 0.04;
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
        <cylinderGeometry args={[0.55, 0.46, 1.35, 40, 1, true]} />
        <meshPhysicalMaterial color="#f7f4ee" transmission={0.86} thickness={0.3} roughness={0.08} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.46, 0.4, 0.72, 40]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function Cup3DScene({ color }: { color: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ fov: 30, position: [0, 0.25, 3.2] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          gl.domElement.dispatchEvent(new CustomEvent("crema-webgl-lost", { bubbles: true }));
        });
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <Glass color={color} />
    </Canvas>
  );
}
