import T from "../../config/theme";

function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 12,
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 37%, rgba(255,255,255,.04) 63%)",
        backgroundSize: "400% 100%",
        animation: "superadminShimmer 1.4s ease infinite",
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(28,29,39,0.98), rgba(17,18,26,0.98))",
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: "1.15rem",
        minHeight: 145,
        boxShadow: "0 12px 40px rgba(0,0,0,.20)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div style={{ flex: 1 }}>
          <SkeletonBlock width={80} height={10} />
          <div style={{ height: 16 }} />
          <SkeletonBlock width={120} height={34} />
        </div>

        <SkeletonBlock width={48} height={48} radius={16} />
      </div>

      <SkeletonBlock width="70%" height={10} />
    </div>
  );
}

export default function SkeletonLoader({
  cards = 6,
}) {
  return (
    <>
      <style>
        {`
          @keyframes superadminShimmer {
            0% {
              background-position: 100% 0;
            }

            100% {
              background-position: -100% 0;
            }
          }
        `}
      </style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {Array.from({ length: cards }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </>
  );
}
