import { useEffect, useMemo, useState } from "react";
                  borderRadius: 12,
                  padding: "0.9rem 1rem",
                  border: `1px solid ${
                    active ? `${T.accent}55` : "transparent"
                  }`,
                  background: active ? `${T.accent}14` : "transparent",
                  color: active ? T.accent : T.mutedLight,
                  cursor: "pointer",
                  transition: "all .15s ease",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "auto",
            background: `${T.warning}12`,
            border: `1px solid ${T.warning}22`,
            borderRadius: 14,
            padding: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <AlertTriangle size={15} color={T.warning} />

            <span
              style={{
                color: T.warning,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              SUPER ADMIN
            </span>
          </div>

          <div
            style={{
              color: T.mutedLight,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Ambiente administrativo global da plataforma SaaS.
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          padding: "2rem",
          overflowX: "hidden",
        }}
      >
        {currentView}
      </main>
    </div>
  );
}