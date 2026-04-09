# Requirements: v1.11 Dynamic Content Discovery & Channel Expansion

Defined: 2026-04-09
Core Value: Expand content relevance and long-term engagement by improving discovery and enabling richer notification delivery channels.

## v1.11 Requirements

### Discovery & Recommendations

- [ ] CONTENT-01: User can discover novels with dynamic genre/tag filtering and stable pagination.
- [ ] CONTENT-02: User can see recommendation-ready content lists based on reading history signals.
- [ ] CONTENT-03: User can follow authors and view follow state for digest generation.

### Notification Channels

- [ ] NOTI-04: User can manage notification delivery channels beyond in-app inbox (foundation-level preference model).

## Future Requirements (Deferred)

- CONTENT-04: Personalized ranking using behavior model scoring.
- NOTI-05: Real-time websocket delivery with per-event subscriptions.
- NOTI-06: Digest scheduler and outbound delivery worker orchestration.

## Out of Scope (v1.11)

| Feature | Reason |
|---------|--------|
| Full ML-based recommendation ranking | Start with deterministic baseline before model complexity |
| Native mobile notification SDK integration | Web-first channel model remains priority |
| Real-time websocket fan-out infrastructure | Deferred until channel foundation and digest flows stabilize |

## Traceability

| Requirement | Planned Phase | Status |
|-------------|---------------|--------|
| CONTENT-01 | Phase 28 | Planned |
| CONTENT-02 | Phase 28 | Planned |
| CONTENT-03 | Phase 29 | Planned |
| NOTI-04 | Phase 29 | Planned |

Coverage:
- v1.11 requirements: 4 total
- Mapped to planned phases: 4
- Unmapped: 0

---

Requirements defined: 2026-04-09
Last updated: 2026-04-09 after v1.10 milestone completion
