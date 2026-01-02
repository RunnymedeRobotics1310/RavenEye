# Runnymede Robotics Team 1310 Raven Eye Strategy App

This is a FRC strategy app for Runnymede Robotics Team 1310. It is built using React, React Router, TypeScript, 
and Vite. It communicates with the back-end, RavenBrain, via REST.

## Usage

The public URL for the app is https://raveneye.team1310.ca

For local developers, you can access the app at http://localhost:3000

Follow the instructions on the app.

## Development

This app is built as a single-page application using React, React Router, TypeScript, and Vite. To run the app locally, 
follow these steps:

1. Clone the repository
   1. You'll need an IDE (we recommend IntelliJ IDEA Ultimate - free student licenses available). This will include a copy of git.
   2. You'll need a current copy of Node. You can install it directly or use a version manager.
2. Start up [RavenBrain](https://github.com/runnymederobotics1310/ravenbrain). RavenBrain is the back-end for RavenEye.
    1. If you haven't already installed RavenBrain, follow through the steps in the RavenBrain readme.
    2. The URL of the back-end of RavenEye is set in this app as an environment variable.  When RavenEye is running in development mode, it will assume RavenBrain is running locally. If RavenEye is running in production mode, it will use the public location for RavenBrain instead.
2. Run `npm install` to install the dependencies
3. Run `npm run dev` to start the development server
4. Open your browser and navigate to `http://localhost:3000`
5. Make changes to the code and see them reflected in the browser
6. Run `npm run build` to build the app for production

## Architecture
- React 19 with React Router 7
- React Router 7 runs in framework mode
- all client-side rendered
- Track section of the UI works in offline mode once loaded (except sync)
- Other UI sections assume a valid connection to RavenBrain exists


## To Do List

- Swap out LocalStorage for IndexedDB for easier coding + performance. However IndexedDB is clunky so consider a single dependency https://www.npmjs.com/package/dexie
- Implement authentication via basic auth then JWT. Explain login flow in docs.
