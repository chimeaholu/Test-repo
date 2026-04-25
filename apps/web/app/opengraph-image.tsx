import { ImageResponse } from "next/og";

export const alt = "Agrodomain social preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #1a2f1e 0%, #2d5a3d 52%, #c17b2a 100%)",
          color: "#fdfbf7",
          fontFamily: "sans-serif",
          padding: "56px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 28,
            padding: "48px",
            background: "rgba(253,251,247,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: "#fdfbf7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1a2f1e",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              A
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  opacity: 0.86,
                }}
              >
                Agrodomain
              </div>
              <div style={{ fontSize: 18, opacity: 0.76 }}>
                Agricultural operating system for Africa and the Caribbean
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              maxWidth: 820,
            }}
          >
            <div style={{ fontSize: 66, lineHeight: 1.04, fontWeight: 800 }}>
              Trade. Fund. Insure. Grow.
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.88 }}>
              One platform for market access, finance, insurance, weather intelligence,
              logistics, and AI-powered farm operations.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 22,
              opacity: 0.84,
            }}
          >
            <div>Farmers</div>
            <div>Buyers</div>
            <div>Co-ops</div>
            <div>Investors</div>
            <div>Advisers</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
