'use client';

import { useEffect, useRef } from 'react';

/** Commercial-topology visual: a slowly-rotating wireframe network sphere.
 *  Three.js is loaded dynamically so nothing WebGL runs during SSR. */
export default function ThreePanel() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let cleanupInner: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      const mount = mountRef.current;
      if (!mount || disposed) return;

      let width = mount.clientWidth || 300;
      let height = mount.clientHeight || 200;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return; // no WebGL — panel stays empty, no crash
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.domElement.className = 'oc-three';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      camera.position.z = 3.2;

      const geo = new THREE.IcosahedronGeometry(1.15, 1);
      const wire = new THREE.WireframeGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x8ad8ff, transparent: true, opacity: 0.5 });
      const lines = new THREE.LineSegments(wire, lineMat);
      scene.add(lines);

      const ptsMat = new THREE.PointsMaterial({ color: 0x8ad8ff, size: 0.05, transparent: true, opacity: 0.9 });
      const pts = new THREE.Points(geo, ptsMat);
      scene.add(pts);

      const innerGeo = new THREE.IcosahedronGeometry(0.6, 0);
      const innerMat = new THREE.MeshBasicMaterial({ color: 0x0c0f13 });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      scene.add(inner);

      const animate = () => {
        lines.rotation.y += 0.0035;
        lines.rotation.x += 0.0012;
        pts.rotation.x = lines.rotation.x;
        pts.rotation.y = lines.rotation.y;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      const ro =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => {
              const m = mountRef.current;
              if (!m) return;
              width = m.clientWidth || width;
              height = m.clientHeight || height;
              camera.aspect = width / height;
              camera.updateProjectionMatrix();
              renderer.setSize(width, height, false);
            })
          : null;
      if (ro) ro.observe(mount);

      cleanupInner = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        wire.dispose();
        geo.dispose();
        innerGeo.dispose();
        lineMat.dispose();
        ptsMat.dispose();
        innerMat.dispose();
        renderer.dispose();
        const el = renderer.domElement;
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (cleanupInner) cleanupInner();
    };
  }, []);

  return <div ref={mountRef} className="oc-three" />;
}
