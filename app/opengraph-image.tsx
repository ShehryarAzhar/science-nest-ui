import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import {
  LATTICE_PATH,
  VIEW_H,
  VIEW_W,
} from "@/components/brand/hex-lattice";
import { SHARE_IMAGE_ALT, SHARE_IMAGE_SIZE } from "@/lib/site-metadata";

// The one site-wide share image (spec 19), generated at build time. Light
// theme colours only. next/font can't feed ImageResponse, so the brand fonts
// are bundled in assets/fonts/ (SIL OFL) and read from disk, never fetched

export const alt = SHARE_IMAGE_ALT;
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

const BACKGROUND = "#F7F7FB";
const FOREGROUND = "#1C1A33";
const MUTED_FOREGROUND = "#5B5873";
const PRIMARY = "#3D2F8F";

const [sourceSerif, atkinson, logo] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/SourceSerif4-Semibold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/AtkinsonHyperlegibleNext-Regular.ttf")),
  // The light horizontal logo as shipped (never edited)
  readFile(join(process.cwd(), "public/logo/science-nest-horizontal.svg")),
]);

// The logo file's own proportions (viewBox 224.29 × 40)
const LOGO_HEIGHT = 64;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 224.29) / 40);

// The lattice fills the right part of the card. Its viewBox is cropped like
// HexLattice's "slice", so the stroke is divided by the scale to land at
// about 1px; the component's non-scaling CSS stroke isn't available here
const LATTICE_WIDTH = 600;
const latticeScale = Math.max(
  LATTICE_WIDTH / VIEW_W,
  SHARE_IMAGE_SIZE.height / VIEW_H,
);
const latticeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${LATTICE_WIDTH}" height="${SHARE_IMAGE_SIZE.height}" preserveAspectRatio="xMidYMid slice"><path d="${LATTICE_PATH}" fill="none" stroke="${PRIMARY}" stroke-opacity="0.2" stroke-width="${(1 / latticeScale).toFixed(3)}" stroke-linejoin="round"/></svg>`;

function dataUri(svg: string | Buffer) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: BACKGROUND,
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
        <img
          src={dataUri(latticeSvg)}
          width={LATTICE_WIDTH}
          height={SHARE_IMAGE_SIZE.height}
          alt=""
          style={{ position: "absolute", top: 0, right: 0 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
        <img
          src={dataUri(logo)}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          alt="Science Nest"
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* One text child each (Satori). The no-break space keeps "O" off
              the end of a line */}
          <div
            style={{
              fontFamily: "Source Serif 4",
              fontSize: 64,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: FOREGROUND,
              maxWidth: 760,
            }}
          >
            {"Science tutoring from O\u00a0Level to university"}
          </div>
          <div
            style={{
              marginTop: 28,
              fontFamily: "Atkinson Hyperlegible Next",
              fontSize: 28,
              lineHeight: 1.4,
              color: MUTED_FOREGROUND,
              whiteSpace: "nowrap",
            }}
          >
            MPhil in Biochemistry and Molecular Biology · 8+ years of teaching experience
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Source Serif 4", data: sourceSerif, weight: 600, style: "normal" },
        {
          name: "Atkinson Hyperlegible Next",
          data: atkinson,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );
}
