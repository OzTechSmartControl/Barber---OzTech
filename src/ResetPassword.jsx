import { useEffect, useState } from "react";
          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                top: 14,
                left: 12,
                color: T.muted,
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua nova senha"
              style={{
                width: "100%",
                height: 48,
                paddingLeft: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#0f0f15",
                color: T.text,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              color: T.text,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Confirmar senha
          </div>

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                top: 14,
                left: 12,
                color: T.muted,
              }}
            />

            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirme sua nova senha"
              style={{
                width: "100%",
                height: 48,
                paddingLeft: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#0f0f15",
                color: T.text,
                outline: "none",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: "100%",
            height: 48,
            border: "none",
            borderRadius: 10,
            background: T.accent,
            color: "#000",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </div>
    </div>
  );
}
