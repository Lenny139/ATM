import { CajeroInterface } from "./interfaces/cajero.interface";
import { Tarjeta } from "./models/tarjeta.model";
import { ServerResponse } from "./models/response.model";
import * as net from "node:net";

const balances = new Map<string, number>([
  ["123-456-7890", 500000],
  ["987-654-3210", 150000],
]);

const VALID_PIN = "1234";

class CajeroServidor implements CajeroInterface {
  dep(dinero: number, clave: string, tarjeta: Tarjeta): ServerResponse {
    const validation = this.validateAccess(clave, tarjeta);
    if (validation) {
      return validation;
    }
    const current = this.getBalance(tarjeta);
    this.setBalance(tarjeta, current + dinero);
    return { status: "ok", message: "Deposito exitoso" };
  }

  ret(dinero: number, clave: string, tarjeta: Tarjeta): ServerResponse {
    const validation = this.validateAccess(clave, tarjeta);
    if (validation) {
      return validation;
    }
    const current = this.getBalance(tarjeta);
    if (dinero > current) {
      return { status: "not-ok", message: "Fondos insuficientes" };
    }
    this.setBalance(tarjeta, current - dinero);
    return { status: "ok", message: "Retiro exitoso" };
  }

  con(clave: string, tarjeta: Tarjeta): ServerResponse {
    const validation = this.validateAccess(clave, tarjeta);
    if (validation) {
      return validation;
    }
    const current = this.getBalance(tarjeta);
    return { status: "ok", message: "Saldo: " + current };
  }

  private validateAccess(
    clave: string,
    tarjeta: Tarjeta
  ): ServerResponse | null {
    if (!this.isValidTarjeta(tarjeta)) {
      return { status: "not-ok", message: "Tarjeta no valida" };
    }
    if (!this.isValidClave(clave)) {
      return { status: "not-ok", message: "Clave incorrecta" };
    }
    return null;
  }

  private isValidTarjeta(tarjeta: Tarjeta): boolean {
    return balances.has(tarjeta.numero);
  }

  private isValidClave(clave: string): boolean {
    return clave === VALID_PIN;
  }

  private getBalance(tarjeta: Tarjeta): number {
    return balances.get(tarjeta.numero) ?? 0;
  }

  private setBalance(tarjeta: Tarjeta, balance: number): void {
    balances.set(tarjeta.numero, balance);
  }
}

export const cajeroServidor = new CajeroServidor();

type CajeroAccion = "dep" | "ret" | "con";

interface CajeroRequest {
  accion: CajeroAccion;
  tarjeta: string;
  clave: string;
  monto?: number;
}

const PORT = 3000;

function isCajeroAccion(value: unknown): value is CajeroAccion {
  return value === "dep" || value === "ret" || value === "con";
}

function parseRequest(raw: string): CajeroRequest | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const request = parsed as Partial<CajeroRequest>;
    if (
      !isCajeroAccion(request.accion) ||
      typeof request.tarjeta !== "string" ||
      typeof request.clave !== "string"
    ) {
      return null;
    }

    if (request.accion === "dep" || request.accion === "ret") {
      if (typeof request.monto !== "number" || !Number.isFinite(request.monto)) {
        return null;
      }
    }

    const normalizedRequest: CajeroRequest = {
      accion: request.accion,
      tarjeta: request.tarjeta,
      clave: request.clave,
    };

    if (request.monto !== undefined) {
      normalizedRequest.monto = request.monto;
    }

    return normalizedRequest;
  } catch {
    return null;
  }
}

function executeRequest(request: CajeroRequest): ServerResponse {
  const tarjeta: Tarjeta = { numero: request.tarjeta };

  switch (request.accion) {
    case "dep":
      console.log(
        `[SERVER] Operacion dep para ${tarjeta.numero} por $${request.monto}`
      );
      return cajeroServidor.dep(request.monto ?? 0, request.clave, tarjeta);
    case "ret":
      console.log(
        `[SERVER] Operacion ret para ${tarjeta.numero} por $${request.monto}`
      );
      return cajeroServidor.ret(request.monto ?? 0, request.clave, tarjeta);
    case "con":
      console.log(`[SERVER] Operacion con para ${tarjeta.numero}`);
      return cajeroServidor.con(request.clave, tarjeta);
  }
}

function startServer(): net.Server {
  const server = net.createServer((socket) => {
    const remote = `${socket.remoteAddress ?? "unknown"}:${socket.remotePort ?? "unknown"}`;
    console.log(`[SERVER] Nueva conexion desde ${remote}`);

    let buffer = "";

    socket.setEncoding("utf8");

    socket.on("data", (chunk: string) => {
      buffer += chunk;

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const rawMessage = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");

        if (!rawMessage) {
          continue;
        }

        const request = parseRequest(rawMessage);
        const response: ServerResponse = request
          ? executeRequest(request)
          : { status: "not-ok", message: "Solicitud invalida" };

        socket.write(`${JSON.stringify(response)}\n`);
      }
    });

    socket.on("error", (error) => {
      console.error(`[SERVER] Error con ${remote}:`, error.message);
    });

    socket.on("close", () => {
      console.log(`[SERVER] Conexion cerrada ${remote}`);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Escuchando en el puerto ${PORT}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

export { startServer };
