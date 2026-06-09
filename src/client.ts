import { cajeroServidor } from "./server";
import { Tarjeta } from "./models/tarjeta.model";
import { ServerResponse } from "./models/response.model";
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string, cb: (answer: string) => void): void {
  rl.question(question, (answer: string) => cb(answer.trim()));
}

function printResponse(response: ServerResponse): void {
  console.log("Respuesta:", response.status, "-", response.message);
}

function start(): void {
  console.log("=== Cajero (cliente consola) ===");
  ask("Ingrese tarjeta (ej: 123-456-7890): ", (numero) => {
    const tarjeta: Tarjeta = { numero };
    menu(tarjeta);
  });
}

function menu(tarjeta: Tarjeta): void {
  console.log("Operacion: 1) deposito  2) retiro  3) consulta");
  ask("Seleccione opcion (1/2/3): ", (op) => {
    if (op !== "1" && op !== "2" && op !== "3") {
      console.log("Opcion invalida");
      return menu(tarjeta);
    }

    ask("Ingrese clave: ", (clave) => {
      if (op === "1") {
        return ask("Ingrese monto a depositar: ", (dineroStr) => {
          const dinero = Number(dineroStr);
          if (!Number.isFinite(dinero) || dinero <= 0) {
            console.log("Monto invalido");
          } else {
            const resp = cajeroServidor.dep(dinero, clave, tarjeta);
            printResponse(resp);
          }
          return otra(tarjeta);
        });
      }

      if (op === "2") {
        return ask("Ingrese monto a retirar: ", (dineroStr) => {
          const dinero = Number(dineroStr);
          if (!Number.isFinite(dinero) || dinero <= 0) {
            console.log("Monto invalido");
          } else {
            const resp = cajeroServidor.ret(dinero, clave, tarjeta);
            printResponse(resp);
          }
          return otra(tarjeta);
        });
      }

      const resp = cajeroServidor.con(clave, tarjeta);
      printResponse(resp);
      return otra(tarjeta);
    });
  });
}

function otra(tarjeta: Tarjeta): void {
  ask("Desea realizar otra transaccion? (s/n): ", (again) => {
    if (again.toLowerCase() !== "s") {
      rl.close();
      return;
    }
    menu(tarjeta);
  });
}

start();
