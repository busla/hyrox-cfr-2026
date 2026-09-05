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

`npm run verify` ber saman þrennt:

- **Heimildin** — að hver einasta röð á hverri síðu hafi lesist (timataka birtir stundum aukatöflu neðst með keppendum án tíma), og að Heildarúrslit-síðan innihaldi nákvæmlega sömu keppendur og kynjalistarnir samanlagt. Keppandi sem er aðeins á Heildarúrslit-síðunni myndi annars detta út.
- **Gögnin** — að `data.json` segi það sama og heimildin, og standist innri kröfur: sæti 1..n í réttri röð, 8 hlaup og 8 stöðvar, að `run_total`/`station_total` stemmi við millitímana, og að keppendur án tíma beri `status` og engin millitímagögn.
- **Flokkasíðurnar** — að hver keppandi sé á þeirri flokkasíðu sem flokkurinn hans segir til um, og að flokkasíðurnar innihaldi engan sem vantar hjá okkur. Slóðirnar eru smíðaðar út frá flokkunum í okkar eigin gögnum, ekki teknar af forsíðu timataka: „Parakeppni KVK OPEN" hlekkurinn fyrir 3. mót biður um `cat=f` með `division=Open KK` og skilar tómri síðu, sem felur 15 pör. Þetta er eina prófið sem les flokkinn sjálfan, svo rangt merktur flokkur fellur hér og hvergi annars staðar.

### Leiðréttingar

Stundum er timataka ósamkvæmt sjálfu sér. Slíkar leiðréttingar eru skráðar í `scripts/overrides.json` — aldrei handbreytt í `data.json` — og hver færsla geymir hvað timataka segir (`source_value`), hverju er breytt í (`value`), og hvers vegna. `verify` gætir þeirra: leiðrétting sem á við engan keppanda fellur, og ef timataka lagar málið sjálft eða breytir því í eitthvað annað birtist athugasemd um að endurskoða færsluna. Þannig úreldast þær ekki þegjandi.

Núverandi leiðréttingar eru þrettán, af tvennum toga:

**Flokkur vantar eða stangast á** (2) — nr. 163 „H&H" í 1. móti er skráð MIXED en með tvo karla eftir að timataka breytti liðsmanni, og nr. 152 „Jürgen & Guðni" í 3. móti hefur engan flokk. Hvorugt var á neinni flokkasíðu. Bæði sett í Open KK: KK-hlutinn er öruggur af kynjalistanum, en Pro/Open kemur hvergi fram og er ályktun út frá fyrri mótum.

**Nafn skráð ólíkt milli móta** (11) — stytt millinöfn eða vantandi íslenskir stafir hjá „Skaginn2x", „Foss Hansen", „Systkinin", Aroni Frey Lúðvíkssyni, Halldóri Karli Halldórssyni, Sigurði Jóhanni Einarssyni og Samúel K Ámundasyni. Í öllum tilvikum er fyllsta og réttritaða myndin notuð alls staðar.

Aron var ekki bara snyrtimennska: Framför-flipinn parar keppendur eftir nafni, svo hann taldist tveir menn og datt út úr flipanum þrátt fyrir að hafa keppt í tveimur mótum.

Þrjú nafnanna — Halldór, Sigurður og Samúel — eru algeng íslensk nöfn í ólíkum liðum og verða ekki ráðin af heimildinni einni. Að um sama keppanda sé að ræða er staðfest af skipuleggjendum; Samúel keppir að auki með sama félaga í báðum mótum.

Eftir standa nokkur tilvik þar sem aðeins há-/lágstafur eða broddur skilur að (t.d. „sunneva Jónsdóttir"). Þau kljúfa engan í appinu, enda er borið saman í lágstöfum, og eru látin standa eins og timataka skráir þau.

Skriftirnar geyma sóttar síður í `.cache/` svo endurteknar keyrslur þurfi ekki að sækja neitt. GitHub Actions keyrir `verify` á hverri breytingu á gögnunum og einu sinni í viku — timataka leiðréttir stundum úrslit eftir á, og vikulega keyrslan er það sem lætur okkur vita.

## Tækni

- React + Vite
- Recharts
- GitHub Pages

Gögn: [timataka.net/hyrox2026](https://timataka.net/hyrox2026/)
