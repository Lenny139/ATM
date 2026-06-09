import { CajeroInterface } from "./interfaces/cajero.interface";
import { Tarjeta } from "./models/tarjeta.model";
import { ServerResponse } from "./models/response.model";

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
