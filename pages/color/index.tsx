// @ts-nocheck
import { useEffect } from "react";
import Head from "next/head";
import Light from "../../tools/light";

const LightPage = () => {
  useEffect(() => {
    // console.log("Let There Be Light");
  }, []);

  return (
    <>
      <Head>
        <title>OKLCH Color Tokens Generator | Light/Dark Ladders, AA-Safe Contrast</title>
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
      <Light />
    </>
  );
};

export default LightPage;