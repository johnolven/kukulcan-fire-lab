# Kukulcan Fire Lab

**Project Swarm Mind Kukulcan · NASA Space Apps Challenge 2026 · Flame in Freefall**

A lab table for the people who design crewed spacecraft, stations, surface bases, pressurized rovers and suits. Pick the cabin atmosphere you are designing and the lab shows which of NASA's microgravity combustion tests sit near it, which investigations matter most, and what nobody has tested yet.

## What it does

- **Harmonized dataset.** The experimental tables of 19 combustion investigations in NASA's Physical Sciences Informatics (PSI) repository, each with its own columns and units, merged into 1,946 records with common fields: fuel or material, oxygen (%), pressure (atm), air flow (cm/s), diluent, outcome, burn time. Values the source does not give stay blank. Assumed values are marked.
- **Evidence map.** Every record placed by oxygen and pressure, with your design point and the Moon base corner (30% oxygen or more, 10.2 psi or less) drawn on top.
- **Ranking.** All 24 combustion investigations scored out of 100 for the current design, with the reasons shown: fire-safety directness, proximity of tested conditions, material relevance, evidence volume, data availability.
- **Evidence gaps.** What is missing. The headline: 476 tests reach 30% oxygen or more and none of them is a solid material.
- **Flame bench.** Change oxygen, pressure, air flow and diluent gas and see what the closest real tests did. It is an emulator anchored to test records, not a physics simulation.
- **Six baseline drawings.** Suit, capsule, transit spacecraft, station, surface base, pressurized rover, each with a starting design atmosphere.
- **Swarm Mind analysts.** Prevention, detection and suppression agents plus a lead write a cited brief for a design question.
- **Voice console.** Talk to the lab (Vapi) or type commands; the voice moves the table and quotes the records.
- **MCP servers.** The same data and tools are available to any MCP client.

The lab reports what was tested. It never certifies a material or design as safe, and PSI holds no partial-gravity data.

## MCP

| Server | Path | Use |
|---|---|---|
| Research | `/api/mcp` | 15 tools: `lab_overview`, `search_investigations`, `get_investigation`, `query_tests`, `evidence_for_design`, `rank_investigations`, `material_evidence`, `coverage_gaps`, `list_files`, `get_file_link`, `run_fire_scenario`, `fire_models`, `build_chart`, `ask_chart`, `consult_swarm` |
| Resources | `/api/resources/mcp` | 6 tools over the challenge's NASA resources (PSI, Combustion Science, Researcher's Guide, Apollo 1, Apollo 13, Mir fire, three Spinoff articles) and partner-agency links (JAXA FLARE, JAXA Kibo leaflet, Saffire on eoPortal): `list_resources`, `search_resources`, `get_resource`, `incident_lessons`, `earth_benefits`, `partner_agencies` |
| Orchestrator | `/api/orchestrator/mcp` | `ask_lab`: one question, one cited answer; Claude decides which tools of the records and resources servers to call and returns the trace. `list_servers` |
| Voice | `/api/voice/mcp` | 7 tools that return one short spoken answer each |

Both speak MCP Streamable HTTP (stateless JSON). Example: `claude mcp add --transport http fire-lab https://<host>/api/mcp`

## Run

```bash
npm install
npm run dev
```

Optional environment variables are listed in `.env.example`. Without any of them the dashboard, both MCP servers, typed commands and the evidence-only brief all work.

## Rebuild the data

```bash
python3 scripts/psi_manifest.py data/psi/catalog          # investigation metadata + file manifest (about 14 TB listed, nothing heavy downloaded)
python3 scripts/psi_download.py data/psi/catalog/file_manifest.csv data/psi/files tier1   # tables, documents, reports (about 6 GB)
python3 scripts/harmonize.py data/psi data/harmonized     # one test-level dataset
python3 scripts/build_app_data.py .                       # copy into the app
```

Video and raw image sets stay on NASA's servers. The app asks PSI for a temporary link when a file is opened.

## Data and resources

- NASA Physical Sciences Informatics (PSI) repository, combustion science: https://psi.nasa.gov/physci/repo/search?q=combustion
- NASA Combustion Science (Glenn Research Center): https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/
- A Researcher's Guide to: Combustion Science: https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/

Other tools: Next.js, React, Tailwind CSS, Anthropic API (Claude), Vapi.

## Use of SI

Code, the six line drawings and the dataset harmonization scripts were produced with SI assistance (Claude). Analyst briefs are SI-generated text when a model key is configured and are labeled as such on screen. Spoken replies are synthetic voice. No NASA logos or mission insignia are used. This project is not affiliated with or endorsed by NASA.
