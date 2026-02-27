"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";

export function WireframeBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef(0);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const container = containerRef.current;
    const isDark = resolvedTheme === "dark";

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Colors based on theme
    const wireColor = isDark ? 0x444466 : 0xccccdd;
    const accentColor = isDark ? 0x6366f1 : 0x8b5cf6;
    const material = new THREE.MeshBasicMaterial({
      color: wireColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.15 : 0.12,
    });
    const accentMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.2 : 0.15,
    });

    // Geometries - multiple polyhedra at different positions
    const shapes: { mesh: THREE.Mesh; rotSpeed: THREE.Vector3; floatSpeed: number; floatOffset: number }[] = [];

    // Main icosahedron (center-right)
    const ico = new THREE.IcosahedronGeometry(1.6, 1);
    const icoMesh = new THREE.Mesh(ico, accentMaterial);
    icoMesh.position.set(1.5, 0.3, -1);
    scene.add(icoMesh);
    shapes.push({ mesh: icoMesh, rotSpeed: new THREE.Vector3(0.001, 0.0015, 0.0005), floatSpeed: 0.4, floatOffset: 0 });

    // Octahedron (top-left)
    const oct = new THREE.OctahedronGeometry(0.9, 0);
    const octMesh = new THREE.Mesh(oct, material);
    octMesh.position.set(-2.2, 1.5, -2);
    scene.add(octMesh);
    shapes.push({ mesh: octMesh, rotSpeed: new THREE.Vector3(0.002, 0.001, 0.0015), floatSpeed: 0.5, floatOffset: 1.5 });

    // Dodecahedron (bottom-left)
    const dod = new THREE.DodecahedronGeometry(1.1, 0);
    const dodMesh = new THREE.Mesh(dod, material);
    dodMesh.position.set(-1.8, -1.3, -1.5);
    scene.add(dodMesh);
    shapes.push({ mesh: dodMesh, rotSpeed: new THREE.Vector3(0.0012, 0.0008, 0.002), floatSpeed: 0.35, floatOffset: 3 });

    // Tetrahedron (right)
    const tet = new THREE.TetrahedronGeometry(0.7, 0);
    const tetMesh = new THREE.Mesh(tet, material);
    tetMesh.position.set(2.8, -1.0, -2.5);
    scene.add(tetMesh);
    shapes.push({ mesh: tetMesh, rotSpeed: new THREE.Vector3(0.0018, 0.0012, 0.001), floatSpeed: 0.6, floatOffset: 4.5 });

    // Small icosahedron (top-right)
    const ico2 = new THREE.IcosahedronGeometry(0.5, 0);
    const ico2Mesh = new THREE.Mesh(ico2, material);
    ico2Mesh.position.set(3.0, 1.8, -3);
    scene.add(ico2Mesh);
    shapes.push({ mesh: ico2Mesh, rotSpeed: new THREE.Vector3(0.0025, 0.002, 0.0015), floatSpeed: 0.45, floatOffset: 2 });

    // Store base Y positions
    const basePositions = shapes.map((s) => s.mesh.position.y);

    // Animation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;

      shapes.forEach((s, i) => {
        s.mesh.rotation.x += s.rotSpeed.x;
        s.mesh.rotation.y += s.rotSpeed.y;
        s.mesh.rotation.z += s.rotSpeed.z;
        // Gentle floating
        s.mesh.position.y = basePositions[i] + Math.sin(time * s.floatSpeed + s.floatOffset) * 0.15;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
    };
  }, [mounted, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
