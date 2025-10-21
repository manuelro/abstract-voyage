// @ts-nocheck
import { useEffect } from "react";
import Head from "next/head";
// import Neo from "../../";

const ScrollPage = () => {
  useEffect(() => {
    // console.log("Let There Be Light");
  }, []);

  return (
    <>
      <Head>
        <title>Scroll</title>
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
      {/* <Neo message="Wake up, human." /> */}
        {/* <Neo
          eraseSpeedupFactor={22}
          eraseInverseStrength={9}
          eraseCps={160}
          wordPause={50}
          vanishMode="words-reverse"
          typingCps={22}
          message={`TheBoringIntro`}
          messages={['dear brave you...',
"you're not a problem.",
"you're a mystery.",
"you're a creative force.",
"you're a miracle.",
"but above all...",
"you're enough.",
"just as you are."]}
        /> */}
      </>
  );
};

export default ScrollPage;