import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const AppleIcon = () =>
  new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #d997ae, #8e6bc9)",
        color: "#fdfbf7",
        fontSize: 92,
        fontWeight: 800,
        letterSpacing: -2,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      DW
    </div>,
    { ...size },
  );

export default AppleIcon;
