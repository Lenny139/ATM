import { Tarjeta } from "../models/tarjeta.model";
import { ServerResponse } from "../models/response.model";

export interface CajeroInterface {
  dep(dinero: number, clave: string, tarjeta: Tarjeta): ServerResponse;
  ret(dinero: number, clave: string, tarjeta: Tarjeta): ServerResponse;
  con(clave: string, tarjeta: Tarjeta): ServerResponse;
}
