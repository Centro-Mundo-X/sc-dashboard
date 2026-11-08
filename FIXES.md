# Login detrás de un proxy: qué se corrigió

Reemplaza la lista de parches locales. **No hace falta ninguno**: los problemas
están corregidos en el código fuente. Al reconstruir la imagen, quitar los
parches montados sobre `server.ts` y sobre el JS compilado del login.

## La arquitectura

El contenedor sirve las dos cosas. **El servidor es SvelteKit**: escucha en
`PORT`, atiende las páginas y los assets, y reenvía `/api/*` al API, que escucha
en `API_PORT` sobre el loopback. Un contenedor, un puerto público.

## Los cinco problemas

**1. `trustProxy`** — el login respondía 200 sin `sc_session`, y todo lo demás
daba 401: `@fastify/session` borraba la cookie `Secure` al ver
`protocol === 'http'`. Ahora `TRUST_PROXY` acepta direcciones y rangos CIDR, un
número de saltos, `true`, o vacío/`false` (por defecto). Se valida al arrancar
(`apps/api/src/config.ts`); un valor inválido detiene el proceso.

**2. El dashboard no se servía** — `GET /` devolvía 404: el `Dockerfile` construía
el frontend y nadie lo servía. Ahora el entrypoint arranca
`apps/web/build/index.js` como servidor y el API detrás.

**3. `fetch` perdía un `Set-Cookie`** — undici colapsa las dos cabeceras del API
en una. El login usa `node:http` y `rawHeaders`. Es el `.ts` de siempre, así que
`vite build` compila la versión buena.

**4. `HEALTHCHECK`** — usaba `curl`, que la imagen no trae. Ahora es un
`node -e "fetch(...)"` contra `/api/health`, que pasa por el dashboard.

**5. `ORIGIN`** — validado y obligatorio en producción, documentado en `README.md`
y `.env.example`.

## El 403 no era `ORIGIN`

Con `ORIGIN` puesto el login seguía dando `403 Cross-site POST form submissions
are forbidden`. SvelteKit compara `Origin` contra `kit.paths.origin` (fijado en
build) o contra `request.url`, que sin cabeceras reenviadas es `http://<socket>`.

El entrypoint pone `PROTOCOL_HEADER=x-forwarded-proto` y
`HOST_HEADER=x-forwarded-host`, así que el `request.url` es el público y el CSRF
coincide. El proxy debe reenviar esas dos cabeceras (ejemplo de nginx en el
`README.md`).

Verificado con el build de producción: login 200 con ambos cookies, `/sessions`
200, `/api/*` 200 con cookie y 401 sin ella.

## Variables

| Variable | Estado |
|---|---|
| `PORT` | Puerto público, el del dashboard |
| `API_PORT` | Nuevo. Puerto del API, loopback |
| `ORIGIN` | Nuevo, obligatorio en producción |
| `TRUST_PROXY` | Nuevo |
| `PROTOCOL_HEADER`, `HOST_HEADER` | Nuevos; el entrypoint les da defaults |
| `API_BASE_URL` | A dónde reenvía el dashboard. Por defecto, `API_PORT` |
| `API_FORWARDED_PROTO` | Protocolo que el dashboard anuncia al API; `https` por defecto |
