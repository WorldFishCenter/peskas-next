## About the Project

The dashboard implements a two-year research study evaluating the effects of digital information on behavior change in small-scale reef fisheries. The study uses a Before-After-Control-Impact (BACI) approach across 35 accessible landing sites in Kenya's 5 coastal counties, organized into Beach Management Units (BMUs).

### Key Features

- **Multi-level Information Access**: Five treatment groups with varying levels of data access (Control, Individual, Community, Individual+Community, Neighborhood)
- **Comprehensive Metrics Tracking**: CPUE, IPUE, catch volumes, fishing effort, costs, profit, gear performance
- **Role-based Dashboards**: Tailored views for different user groups (IIA, CIA, AIA, WBCIA, Admin)
- **Bilingual Support**: Full internationalization with English and Swahili
- **Real-time Analytics**: Interactive charts and visualizations for fisheries data
- **Behavioral Research Framework**: Tests Knowledge-Attitude-Practice (KAP) model effectiveness

### Research Purpose

The study addresses challenges of sustainable fisheries management by testing three behavioral models:
- Information Deficit Model
- Self-Interested Actor Model
- Neighborhood Interested Actor Model

Results will inform governments and conservation organizations on balancing ecological sustainability with community needs through digital information tools.

## Technology Stack

This monorepo is powered by [Turborepo](https://turbo.build/), using modern web technologies:
- **Framework**: Next.js 14.2.3 with App Router
- **Database**: MongoDB with Mongoose ODM
- **API**: tRPC for type-safe client-server communication
- **Auth**: NextAuth.js with JWT strategy
- **UI**: React 18, Tailwind CSS, Recharts, Deck.gl
- **i18n**: react-i18next (English and Swahili)

## Getting Started

System Requirements:

- [Node.js 18.17](https://nodejs.org/en) or later.
- [Turborepo 2.0.1](https://turbo.build/repo/docs/getting-started/installation)
- [pnpm - package manager 9.1.4](https://pnpm.io/installation#using-npm) (recommended). We used this version. But you can change it as you want. Learn more about [Turborepo packageManager](https://turbo.build/repo/docs/getting-started/support-policy)

**Tuborepo**: For quick install just run the following command it will install turbo in your system globally.

```bash
npm install -g turbo
```

## Starting development server

To start the development server locally run the following commands

```bash
pnpm install

pnpm run dev

```

To build locally and view the local build run the following commands.

```bash
pnpm run build

pnpm run start

```

**You can find more commands in the project root `package.json` file.**

## Project Structure

```
peskas-next/
├── apps/
│   ├── isomorphic-i18n/      # Main production application (port 3001)
│   ├── isomorphic/           # Base dashboard without i18n
│   └── isomorphic-starter/   # Minimal starter template
├── packages/
│   ├── api/                  # tRPC API routers (@isomorphic/api)
│   ├── isomorphic-core/      # Shared UI components (@isomorphic/core)
│   ├── nosql/                # MongoDB schemas and models (@repo/nosql)
│   └── config-*/             # Shared configurations
├── NEWS.md                   # Project changelog
├── CONTRIBUTING.md           # Contribution guidelines
└── turbo.json               # Turborepo configuration
```

### Main Application Architecture

The `isomorphic-i18n` app implements a sophisticated role-based access control (RBAC) system:

- **IIA (Individual Information Access)**: Individual fishers - personal fishing data only
- **CIA (Community Information Access)**: BMU-level managers - aggregated catch data for their BMU
- **AIA (Administrative Information Access)**: Administrative users - BMU-level administrative metrics
- **WBCIA (Whole BMU Community Information Access)**: Regional managers - multi-BMU data access
- **Admin**: Full system access with all BMU data and user management

Each role has tailored dashboard components and data access patterns aligned with the research study's experimental design.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines and release process
- [NEWS.md](NEWS.md) - Complete project changelog
- [Turborepo Documentation](https://turbo.build/repo/docs/handbook)

Happy coding! 🎣

## Release Process

This project uses automated releases via GitHub Actions. When you push to the `dev` branch:

1. The workflow extracts the version from `NEWS.md`
2. Checks if a git tag for that version already exists
3. If the tag doesn't exist, creates a GitHub Release with the changelog

### Creating a New Release

1. Update `NEWS.md` with your changes at the top of the file:
   ```markdown
   # peskas-next X.Y.Z

   ## New features
   - Your new feature

   ## Enhancements
   - Your enhancements

   ## Fixes
   - Your bug fixes

   ---
   ```

2. Commit and push to `dev`:
   ```bash
   git add NEWS.md
   git commit -m "Release version X.Y.Z"
   git push origin dev
   ```

3. The GitHub Action will automatically:
   - Create a git tag `vX.Y.Z`
   - Create a GitHub Release with the changelog

See [NEWS.md](NEWS.md) for the complete changelog and [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.
