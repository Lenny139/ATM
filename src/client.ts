import { ServerResponse } from "./models/response.model";
import * as net from "node:net";
import * as readline from "node:readline";

interface CajeroRequest {
  accion: "dep" | "ret" | "con";
  tarjeta: string;
  clave: string;
  monto?: number;
}

const SERVER_PORT = 3000;
const SERVER_IP = process.env.SERVER_IP ?? "127.0.0.1";
let rlClosed = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => resolve(answer.trim()));
  });
}

function printResponse(response: ServerResponse): void {
  console.log("Respuesta JSON:", JSON.stringify(response));
}

function createConnection(): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: SERVER_IP, port: SERVER_PORT });

    socket.once("connect", () => {
      socket.setEncoding("utf8");
      resolve(socket);
    });

    socket.once("error", (error) => {
      reject(error);
    });
  });
}

function sendRequest(
  socket: net.Socket,
  request: CajeroRequest
): Promise<ServerResponse> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let settled = false;

    const cleanup = (): void => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const onData = (chunk: string): void => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        return;
      }

      const rawResponse = buffer.slice(0, newlineIndex).trim();

      try {
        finish(() => resolve(JSON.parse(rawResponse) as ServerResponse));
      } catch {
        finish(() => reject(new Error("Respuesta invalida del servidor")));
      }
    };

    const onError = (error: Error): void => {
      finish(() => reject(error));
    };

    const onClose = (): void => {
      finish(() => reject(new Error("La conexion con el servidor se cerro antes de recibir respuesta")));
    };

    socket.once("error", onError);
    socket.once("close", onClose);
    socket.on("data", onData);
    socket.write(`${JSON.stringify(request)}\n`);
  });
}

async function start(): Promise<void> {
  console.log("=== Cajero (cliente consola) ===");

  let socket: net.Socket;

  try {
    socket = await createConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`No se pudo conectar al servidor ${SERVER_IP}:${SERVER_PORT}.`);
    console.error(message);
    rlClosed = true;
    rl.close();
    return;
  }

  socket.on("close", () => {
    if (!rlClosed) {
      rlClosed = true;
      console.log("Conexion con el servidor cerrada.");
      rl.close();
    }
  });

  await menu(socket);
}

async function menu(socket: net.Socket): Promise<void> {
  const numero = await ask("Ingrese tarjeta (ej: 123-456-7890): ");
  const tarjeta = numero;

  while (true) {
    console.log("Operacion: 1) deposito  2) retiro  3) consulta");
    const op = await ask("Seleccione opcion (1/2/3): ");

    if (op !== "1" && op !== "2" && op !== "3") {
      console.log("Opcion invalida");
      continue;
    }

    const clave = await ask("Ingrese clave: ");

    try {
      if (op === "1") {
        const dineroStr = await ask("Ingrese monto a depositar: ");
        const dinero = Number(dineroStr);
        if (!Number.isFinite(dinero) || dinero <= 0) {
          console.log("Monto invalido");
        } else {
          const resp = await sendRequest(socket, {
            accion: "dep",
            tarjeta,
            clave,
            monto: dinero,
          });
          printResponse(resp);
        }
      } else if (op === "2") {
        const dineroStr = await ask("Ingrese monto a retirar: ");
        const dinero = Number(dineroStr);
        if (!Number.isFinite(dinero) || dinero <= 0) {
          console.log("Monto invalido");
        } else {
          const resp = await sendRequest(socket, {
            accion: "ret",
            tarjeta,
            clave,
            monto: dinero,
          });
          printResponse(resp);
        }
      } else {
        const resp = await sendRequest(socket, {
          accion: "con",
          tarjeta,
          clave,
        });
        printResponse(resp);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error(`Error al comunicarse con el servidor: ${message}`);
      rlClosed = true;
      socket.destroy();
      rl.close();
      return;
    }

    const again = await ask("Desea realizar otra transaccion? (s/n): ");
    if (again.toLowerCase() !== "s") {
      rlClosed = true;
      socket.end();
      rl.close();
      return;
    }
  }
}

start();
