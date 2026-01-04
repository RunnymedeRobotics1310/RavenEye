# Runnymede Robotics Team 1310 Raven Eye Strategy App
[![semantic-release: raveneye](https://img.shields.io/badge/semantic--release-raveneye-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

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
- Minimize external dependencies
- Code to be kept clear and simple. Students must be able to understand every line in the project

### Storage and Sync
- Game data will be captured and stored in IndexedDB 
- Game data records will be synchronized manually by users
- Aggregate data like dashboard data will be fetched automatically in the background and stored in *IndexedDB*. *IndexedDB* will simplify the async synchronization process by allowing it to capture entire data objects and modify them safely, as compared to storing the data as a series of stringified objects in *localStorage*.

### Visual Rendering
- Use semantic markup whenever possible
- Avoid style and component libraries
- organize style sheets to support common components and extensibility
- Target iPhone 5 compatibility for track pages
- Report UI *may* require desktop/tablet

### Users and Logins
- The system will no longer use a common login for all members with the same role
- Every user will be registered in the back-end
- The following roles will exist
  - `ROLE_MEMBER` - team 1310 member - not necessarily a strat team member
  - `ROLE_DATASCOUT` - general scout - can track all data
  - `ROLE_EXPERTSCOUT` - expert scout - an read all report data
  - `ROLE_ADMIN` - strat team administrator
  - `ROLE_SUPERUSER` - system administrator
- The `ROLE_SUPERUSER` password is set via environment variable
- `ROLE_SUPERUSER` can create users and grant all roles to them
- `ROLE_ADMIN` can create new users and assign all roles except `ROLE_ADMIN` and `ROLE_SUPERUSER`
- Users can self-register for the `ROLE_MEMBER` role by using a secret access key
- If a user forgets their password, they can flag *forgot password* on their account, and `ROLE_ADMIN` can reset it for them.
- Users log in via simple *basic auth* authentication
- a `access_token` JWT is returned upon login
- The `access_token` is stored in `sessionStorage`
- Authorization will use a bearer token with each request, and exposed through a simplified `fetch` wrapper called `rbfetch`.
- Eventually, a `refresh_token` will be employed that will be stored in `localStorage` once appropriate revocation support can be added to the back-end
