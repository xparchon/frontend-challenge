module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      startServerReadyPattern: '4173',
      startServerReadyTimeout: 60_000,
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/market/nfts/emerald-ape-042',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse/reports/desktop',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
