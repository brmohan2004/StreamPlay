const QUALITY_RANK = {
  '2160p': 500,
  '4k': 500,
  uhd: 500,
  '1440p': 400,
  '1080p': 300,
  fhd: 300,
  '720p': 200,
  hd: 200,
  '480p': 100,
  sd: 100,
  auto: 250,
};

const FORMAT_RANK = {
  hls: 30,
  dash: 25,
  mp4: 20,
};

function qualityScore(quality) {
  const key = String(quality ?? '').toLowerCase().trim();
  for (const [label, score] of Object.entries(QUALITY_RANK)) {
    if (key.includes(label)) return score;
  }
  return 150;
}

export class SourceSelector {
  selectAndRank(sources, preferences = {}, providerPriorities = new Map()) {
    const preferredQuality = String(preferences.preferredQuality ?? 'auto').toLowerCase().trim();
    const preferredFormat = String(preferences.preferredFormat ?? '').toLowerCase().trim();
    const preferredLanguage = String(preferences.preferredLanguage ?? '').toLowerCase().trim();
    const preferredProvider = String(preferences.preferredProvider ?? '').toLowerCase().trim();

    // Deduplicate exact playbackUrl entries, keeping highest priority provider
    const seenUrls = new Set();
    const deduped = [];
    for (const src of sources) {
      const key = `${src.playbackUrl}|${src.format}`;
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        deduped.push(src);
      }
    }

    const scored = deduped.map((src) => {
      let score = 0;

      // 1. Provider priority (lower priority integer = higher preference)
      const provPrio = providerPriorities.get(src.providerId) ?? 100;
      score += Math.max(0, 200 - provPrio);

      // 2. Explicit preferred provider boost
      if (preferredProvider && preferredProvider !== 'auto' && src.providerId.toLowerCase() === preferredProvider) {
        score += 400;
      }

      // 3. Quality preference
      const qScore = qualityScore(src.quality);
      if (preferredQuality && preferredQuality !== 'auto') {
        const targetScore = qualityScore(preferredQuality);
        const diff = Math.abs(qScore - targetScore);
        score += Math.max(0, 300 - diff);
      } else {
        score += qScore * 0.5;
      }

      // 4. Format preference
      if (preferredFormat && src.format === preferredFormat) {
        score += 200;
      } else {
        score += FORMAT_RANK[src.format] ?? 10;
      }

      // 5. Language match boost
      if (preferredLanguage) {
        const hasAudioMatch = (src.audioLanguages ?? []).some((l) =>
          l.toLowerCase().includes(preferredLanguage)
        );
        const hasSubMatch = (src.subtitleLanguages ?? []).some((l) =>
          l.toLowerCase().includes(preferredLanguage)
        );
        if (hasAudioMatch) score += 120;
        if (hasSubMatch) score += 40;
      }

      // 6. Richness bonus (multi-subtitles / multi-audio)
      score += Math.min(30, (src.subtitles?.length ?? 0) * 5);
      score += Math.min(20, (src.audioTracks?.length ?? 0) * 5);

      return { src, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.src);
  }
}
