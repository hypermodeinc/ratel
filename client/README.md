# Dgraph Dashboard UI

This project was bootstrapped with
[Create React App](https://github.com/facebookincubator/create-react-app).

## Setting up

The following steps would help setup the app for development locally.

1. Make sure you have [Node.js](https://nodejs.org/en/) installed.
2. [Install and run](https://docs.dgraph.io) Dgraph on the default port(8080) so that the frontend
   can communicate with it.
3. We use [npm](https://www.npmjs.com/) for dependency management. Run
   `npm install --legacy-peer-deps` from within the dashboard folder to install the deps.
4. Run `npm start` which would open up the UI at `http://localhost:3000`.The UI gets refreshed
   automatically after a change in any files inside the src folder.

You can run `npm run build` to generate the bundled files for production and push them with your
development changes. These files are served by Dgraph on the default port at
`http://localhost:8080`.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md)
  uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses
  [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware
lint rules. Check out the
[TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to
integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
