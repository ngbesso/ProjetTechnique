import { useEffect, useState } from "react";
import { api } from "./api/client";

export default function App() {
  const [status, setStatus] = useState("…");

  useEffect(() => {
    api
      .get("/health")
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("API injoignable"));
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Plateforme OBNL</h1>
      <p>État de l'API : {status}</p>
    </main>
  );
}
