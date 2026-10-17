import { app } from "../server.mjs";

export default async function handler(req, res) {
  await app.ready();
  app.server.emit("request", req, res);
}
