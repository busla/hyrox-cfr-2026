# HYROX CFR 2026 — Gagnvirkar tölfræðimyndir

React app sem sýnir niðurstöður og samanburð á HYROX mótaröðinni 2026 hjá Crossfit Reykjavík.

🌐 **[Opna síðuna](https://busla.github.io/hyrox-cfr-2026/)**

## Gröf

- 🏆 Heildarúrslit — lokatími allra keppenda
- 📅 Mótaröðin — samanburður yfir öll þrjú mót
- 🔥 Splits heatmap — tími á hverri stöð
- 📈 Uppsafnaður tími — línurit í gegnum mótið
- 🕸️ Radar graf — styrkleikar og veikleikar
- 📊 Tímaúthlutun — hlaup vs stöðvar
- ⚡ Hlaup vs stöðvar — scatter plot
- 🔍 Samanburður — bera saman tvo keppendur

## Mót

| Mót | Dagsetning | Staða |
|-----|-----------|-------|
| 1. mót | 23. maí 2026 | ✅ Lokið |
| 2. mót | 11. júlí 2026 | ✅ Lokið |
| 3. mót | 5. september 2026 | ✅ Lokið |

## Gögn

Niðurstöður eru sóttar af [timataka.net/hyrox2026](https://timataka.net/hyrox2026/) með skriftum í `scripts/`; `src/data.json` er ekki handskrifað.

```bash
npm run scrape              # sækir allar úrslitasíður og skrifar src/data.json
npm run scrape -- --check   # skrifar ekkert, fellur ef data.json er úrelt
npm run verify              # heilleikapróf á data.json gagnvart timataka
npm run verify -- --refresh # sama, en hunsar skyndiminnið og sækir upp á nýtt
```

`npm run verify` ber saman tvennt:

- **Heimildin** — að hver einasta röð á hverri síðu hafi lesist (timataka birtir stundum aukatöflu neðst með keppendum án tíma), og að Heildarúrslit-síðan innihaldi nákvæmlega sömu keppendur og flokkasíðurnar samanlagt. Keppandi sem er aðeins á Heildarúrslit-síðunni myndi annars detta út.
- **Gögnin** — að `data.json` segi það sama og heimildin, og standist innri kröfur: sæti 1..n í réttri röð, 8 hlaup og 8 stöðvar, að `run_total`/`station_total` stemmi við millitímana, og að keppendur án tíma beri `status` og engin millitímagögn.

Skriftirnar geyma sóttar síður í `.cache/` svo endurteknar keyrslur þurfi ekki að sækja neitt. GitHub Actions keyrir `verify` á hverri breytingu á gögnunum og einu sinni í viku — timataka leiðréttir stundum úrslit eftir á, og vikulega keyrslan er það sem lætur okkur vita.

## Tækni

- React + Vite
- Recharts
- GitHub Pages

Gögn: [timataka.net/hyrox2026](https://timataka.net/hyrox2026/)
