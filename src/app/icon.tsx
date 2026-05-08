import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const Icon = () =>
  new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        background: "linear-gradient(135deg, #d997ae, #8e6bc9)",
        color: "#fdfbf7",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: -0.5,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      DW
    </div>,
    { ...size },
  );

export default Icon;
