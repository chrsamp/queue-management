# Appointment React

Modern React replacement for the public Service BC appointment application.

## Local development

1. Run `./scripts/setup-local-config.sh` from the repository root.
2. Start the API on `http://localhost:5000`.
3. Start the local Keycloak realm on `http://localhost:8085`.
4. Run `npm install` and `npm run dev` in this directory.
5. Open `http://localhost:8100/appointment`.

The legacy Vue appointment application can continue running on port `8081`.
Both applications use the `theq-appointment-frontend` Keycloak client.

Runtime values are loaded without caching from:

- `/config/configuration.json`
- `/config/keycloak.json`

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run license-check
npm run test:e2e
```
