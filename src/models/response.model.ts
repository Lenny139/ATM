export type ResponseStatus = "ok" | "not-ok" | "fail";

export interface ServerResponse {
  status: ResponseStatus;
  message: string;
}
