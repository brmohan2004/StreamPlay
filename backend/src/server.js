import { createPlaybackApp } from './app.js';

const { app, config, registry } = createPlaybackApp();

const server = app.listen(config.port, config.host, () => {
  const enabledNames = registry.getEnabledProviders().map((p) => p.name).join(', ');
  console.log(
    `[StreamPlay Playback API] Listening on http://${config.host}:${config.port} (Providers: ${enabledNames || 'none'})`
  );
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
