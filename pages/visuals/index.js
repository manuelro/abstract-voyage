import { useEffect } from "react";
import Head from "next/head";

const ThreeDSphere = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.innerHTML = `
      import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

      const config = {
        rotationVelocity: { x: 0.0005, y: 0.0007 },
        particleSizeBase: 5,
        particleCount: 1300,
        radius: 2,
        blinkSpeed: 0.5,
        scaleSpeed: 1.0,
        scaleAmplitude: 1,
      };

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
      camera.position.z = 4;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      for (let i = 0; i < config.particleCount; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / config.particleCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        const x = config.radius * Math.sin(phi) * Math.cos(theta);
        const y = config.radius * Math.sin(phi) * Math.sin(theta);
        const z = config.radius * Math.cos(phi);

        positions.push(x, y, z);

        const color = new THREE.Color(Math.random(), Math.random(), Math.random());
        colors.push(color.r, color.g, color.b);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.ShaderMaterial({
        vertexShader: \`
          uniform float u_time;
          uniform float u_blinkSpeed;
          uniform float u_scaleSpeed;
          uniform float u_scaleAmplitude;
          uniform float u_particleSizeBase;
          varying vec3 v_color;
          void main() {
            v_color = color;

            float scaleFactor = 1.0 + sin(u_time * u_scaleSpeed + position.x * 10.0) * u_scaleAmplitude * 0.1;
            float blinkFactor = 0.5 + 0.5 * sin(u_time * u_blinkSpeed + position.y * 5.0);

            gl_PointSize = u_particleSizeBase * scaleFactor * blinkFactor;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        \`,
        fragmentShader: \`
          varying vec3 v_color;
          void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            if (distanceToCenter > 0.5) discard;

            gl_FragColor = vec4(v_color, 1.0);
          }
        \`,
        uniforms: {
          u_time: { value: 0.0 },
          u_blinkSpeed: { value: config.blinkSpeed },
          u_scaleSpeed: { value: config.scaleSpeed },
          u_scaleAmplitude: { value: config.scaleAmplitude },
          u_particleSizeBase: { value: config.particleSizeBase },
        },
        vertexColors: true,
        transparent: true,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      const clock = new THREE.Clock();

      function animate() {
        requestAnimationFrame(animate);

        material.uniforms.u_time.value = clock.getElapsedTime();

        particles.rotation.y += config.rotationVelocity.y;
        particles.rotation.x += config.rotationVelocity.x;

        renderer.render(scene, camera);
      }

      animate();

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    `;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Interactive 3D Particles Sphere with Effects</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          body {
            margin: 0;
            overflow: hidden;
            background: radial-gradient(circle, #000, #111);
          }
          canvas {
            display: block;
          }
        `}</style>
      </Head>
      {/* Content here will be replaced by the script */}
    </>
  );
};

export default ThreeDSphere;