/* eslint-disable lingui/no-unlocalized-strings -- static OG image (ja_JP) */
import { ImageResponse } from "next/og";

export const alt = "Dollrobe — QR で、ドール服の収納を半自動管理";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OpengraphImage = () =>
  new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background:
          "linear-gradient(135deg, #fbf2f3 0%, #f7ecec 45%, #efe7f7 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          left: -120,
          width: 480,
          height: 480,
          borderRadius: 9999,
          background: "rgba(242, 181, 206, 0.55)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          right: -80,
          width: 520,
          height: 520,
          borderRadius: 9999,
          background: "rgba(192, 162, 232, 0.5)",
          filter: "blur(100px)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #d997ae, #8e6bc9)",
            color: "#fdfbf7",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: -1.5,
          }}
        >
          DR
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#7a5a64",
            letterSpacing: -1,
          }}
        >
          Dollrobe
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#453338",
            lineHeight: 1.1,
            letterSpacing: -2.5,
            maxWidth: 940,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>ドール服が、</span>
          <span
            style={{
              background: "linear-gradient(135deg, #c66d94, #8e6bc9)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            どこにあるか分かる。
          </span>
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#7a6c72",
            fontWeight: 500,
            letterSpacing: -0.5,
            maxWidth: 900,
          }}
        >
          QR と NFC で、収納を半自動で管理する PWA
        </div>
      </div>
    </div>,
    { ...size },
  );

export default OpengraphImage;
