# Game migration
- [x] Preserve the complete pixel-art game, both modes, audio, effects, and panels.
- [x] Implement verified Lovable Cloud accounts and private synchronized saves.
- [x] Preserve the public leaderboard and verify existing rows without publishing temporary test identities.
- [x] Verify desktop/mobile gameplay, save restoration, Cloud writes, import/export, and access isolation; 10 tests pass.
- [x] Request missing player identities and save exports; document external verification blockers.
- [ ] Import original players and saves and verify their first-login password setup — blocked by missing original IDs, emails, roles, and save JSON exports.
- [ ] Restore verified developer-owner access — blocked by the original owner’s verified identity; historical shared developer signing identity remains read-only.
- [ ] Publish and verify email return links and the first real leaderboard publication — blocked by user cutover and a real player action.