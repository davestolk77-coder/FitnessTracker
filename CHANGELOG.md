# Changelog

## 0.8.1 - 2026-07-14

- Vrije training laadt bij het openen automatisch de chronologisch nieuwste opgeslagen oefeningwaarden uit Training A, Training B of Vrije training.
- De koppeling gebruikt stabiele oefening-ID's en negeert schema- en trainingsnamen, lege/niet-opgeslagen oefeningdata en de volgorde van historie-items.
- Cardio gebruikt dezelfde historiebrede koppeling; records blijven eveneens over alle oude en nieuwe schema's berekend.

## 0.8.0 - 2026-07-14

- Training A en B zijn samengevoegd tot één vrije training met elf unieke oefeningen.
- Afronden kan vanaf één opgeslagen oefening; niet-uitgevoerde oefeningen worden niet opgeslagen.
- Actieve oude A/B-sessies migreren veilig met behoud van invoer, status en sessie-ID.
- Historische A/B-trainingen en schema-ID's blijven leesbaar; stabiele oefening-ID's bewaren de koppeling met records en laatste waarden.
- De bestaande verliesvrije cloudmerge blijft behouden.

## 0.7.9 - 2026-07-14

- Firebase Auth initialiseert nu naast lokale persistentie ook expliciet de browser popup/redirectresolver, zodat Google-login op iPhone, Safari en geïnstalleerde PWA's weer kan starten.
- Het same-origin Vercel-authdomein blijft behouden omdat `/__/auth/*` aantoonbaar naar het echte Firebase Auth-domein wordt geproxyd.
- Login- en redirectresultaatfouten tonen voortaan hun Firebase-foutcode; developmentdiagnostiek bevat daarnaast fase, methode, origin, authDomain, message en customData.
- De authregressietest controleert unieke initialisatie, persistence, redirectresolver, redirect-start, redirect-resultaat, Vercel-rewrite en foutafhandeling zonder generieke masking.

## 0.7.8 - 2026-07-14

- Het Dashboard toont onderaan een kleine, gecentreerde versie-indicator.
- Het getoonde versienummer wordt via een centrale versiebron rechtstreeks uit `package.json` ingelezen en verandert automatisch mee met toekomstige versieverhogingen.

## 0.7.7 - 2026-07-14

- De browser-`online`-afhandeling start geen volledige cloudinitialisatie met blokkerende sync-gate meer tijdens een actieve training.
- `SyncProvider` kan daardoor `Trainingen` en het geopende oefeningformulier niet meer unmounten wanneer de verbinding tijdens een debounced autosave beschikbaar wordt.
- Herstel na een `online`-event voert uitsluitend een niet-blokkerende volledige datasynchronisatie uit; alleen de eerste initialisatie van een account mag de sync-gate tonen.
- Een DOM-interactietest met echte React-componenten en fake timers controleert invoer, debounce, online-sync, zichtbaarheid van het formulier en behoud van getypte waarden.

## 0.7.6 - 2026-07-14

- Een geopende oefening blijft geopend tijdens autosave, debounce, Firestore-sync en gewone re-renders.
- Actieve cloudupdates vervangen de lokale React-sessie niet meer via `DATA_GESYNCHRONISEERD_EVENT`; navigatiestate blijft uitsluitend onder gebruikerscontrole.
- Firestore-bevestigingen van dezelfde of een oudere `syncGeneration` kunnen nieuwere lokale invoer niet meer overschrijven.
- Een regressietest bewaakt dat oefeningselectie en getypte waarden behouden blijven wanneer de debounced sync wordt afgehandeld.

## 0.7.5 - 2026-07-14

- Firebase Authentication initialiseert voortaan direct met lokale browserpersistentie, voordat de eerste authstatus wordt uitgelezen.
- Een geldige Google-sessie blijft daardoor behouden na verversen, browserherstart en opnieuw openen van de PWA, totdat de gebruiker expliciet uitlogt.
- Cloudupdates remounten de actieve trainingspagina niet meer en wissen daardoor de geselecteerde oefening niet.
- Een gewijzigde actieve training uit Firestore wordt binnen de bestaande trainingspagina verwerkt, zonder automatische navigatie naar het oefeningenoverzicht.

## 0.7.4 - 2026-07-13

- De browserdialoog voor het stoppen van een actieve training is vervangen door een eigen toegankelijke bevestigingsmodal.
- De stopmodal sluit visueel aan op de donkere interface en ondersteunt iOS/PWA-safe-areas, focusbeheer en scrollvergrendeling.
- De bestaande lokale verwijdering en Firebase-tombstonesynchronisatie zijn inhoudelijk ongewijzigd gebleven.

## 0.7.3 - 2026-07-13

- Firebase redirect-auth gebruikt het vaste Vercel-productiedomein als same-origin `authDomain`.
- Vercel proxyt `/__/auth/*` transparant naar de officiële Firebase Authentication-helper zonder HTTP-redirect.
- De PWA-navigation fallback blijft uitgesloten voor Firebase-auth- en configuratiepaden.
- Desktop blijft Google-login via een popup gebruiken; iOS, iPadOS en andere mobiele browsers blijven redirect gebruiken.

## 0.7.2 - 2026-07-13

- Google-login gebruikt op desktop een popup en op iOS, iPadOS en andere mobiele browsers een redirect.
- De redirectuitkomst wordt tijdens de auth-initialisatie exact eenmaal verwerkt, ook onder React StrictMode.
- Het inlogscherm verschijnt pas nadat zowel de redirectafhandeling als de eerste Firebase-authstatus gereed zijn.
- Lokale Firebase Auth-persistentie wordt voor iedere login expliciet ingesteld en dubbele loginacties worden geblokkeerd.
- Mislukte redirectlogins blijven zichtbaar als duidelijke foutmelding en fouttoast.

## 0.7.1 - 2026-07-13

- Iedere cloudmutatie krijgt een unieke UUID v4-operationId en de permanente lokale `fitnessDeviceId`.
- Profiel, gewicht, instellingen, actieve training, trainingshistorie en tombstones bewaren voortaan `deviceId` en `operationId`.
- Reeds verwerkte operaties en inhoudelijk ongewijzigde entiteiten veroorzaken geen dubbele Firestore-write.
- Bestaande cloud-documenten zonder mutatie-identificatie blijven leesbaar en worden bij een noodzakelijke write veilig aangevuld.
- Synchronisatieacties zijn uitsluitend in development met `console.debug()` te volgen; productiebuilds bevatten deze logging niet.
- `updatedAt` blijft bepalend voor conflictresolutie en bestaande lokale opslag en cloudmigratiemarkeringen blijven ongewijzigd.

## 0.7.0 - 2026-07-13

- Volledige automatische cloudsynchronisatie met Cloud Firestore toegevoegd.
- Trainingen, trainingshistorie, actieve sessie, gewicht en echte gebruikersinstellingen worden per Google-account opgeslagen.
- Bestaande lokale data wordt eenmalig, niet-destructief en met een volledige veiligheidsback-up naar Firestore gemigreerd.
- De app blijft local-first en offline bruikbaar; openstaande wijzigingen synchroniseren automatisch na herstel van de verbinding.
- Een nieuw apparaat herstelt na Google-login automatisch profiel, historie en een eventuele actieve training.
- Lokale historieback-ups en export/import blijven als extra noodvoorziening beschikbaar.
- Records, grafieken en vorige oefenwaarden blijven afgeleid van de gesynchroniseerde trainingshistorie.
- Updates wissen geen lokale of cloudtrainingsgegevens; verwijderingen worden met blijvende tombstones tegen stale writes beschermd.

## 0.5.1 - 2026-07-13

- Het huidige gewicht en de gewichtshistorie synchroniseren na aanmelden automatisch met Cloud Firestore.
- De nieuwste niet-lege versie wint; bestaande lokale gewichtsgegevens worden nooit door lege cloudgegevens overschreven.
- Firestore-offlinepersistentie houdt lokaal opslaan beschikbaar en verwerkt wijzigingen na herstel van de verbinding.
- Trainingen, actieve training, trainingshistorie, records, grafieken en back-ups blijven uitsluitend lokaal en ongewijzigd.

## 0.5.0 - 2026-07-13

- Google-inloggen met Firebase Authentication toegevoegd.
- De login blijft met lokale Firebase-persistentie op het apparaat bewaard.
- Het ingelogde Google-profiel en een veilige uitlogactie zijn aan de app toegevoegd.
- Bestaande trainingsgegevens blijven volledig lokaal en ongewijzigd.
- Firestore-synchronisatie volgt in een latere versie.

## 0.4.3 - 2026-07-13

- De officiële Firebase SDK en een centrale Firebase Core-initialisatie zijn toegevoegd als voorbereiding op toekomstige koppelingen.
- De bestaande app blijft volledig lokaal werken; Firebase-diensten, gegevensopslag en gegevensuitlezing zijn nog niet ingeschakeld.

## 0.4.2 - 2026-07-13

- Niet-uitgevoerde oefeningen kunnen achteraf aan een gedeeltelijke training worden toegevoegd.
- De bewerkweergave toont uitgevoerde en ontbrekende oefeningen uit het bijbehorende trainingsschema.
- Een gedeeltelijke training wordt automatisch volledig wanneer alle oefeningen later zijn toegevoegd.
- Bestaande historie, opslagkeys, exportgegevens en roterende back-ups blijven behouden.
- Niet-kritieke succes-, informatie- en foutmeldingen verschijnen als tijdelijke, niet-blokkerende toastmeldingen.

## 0.4.1 - 2026-07-13

- Kritieke oplossing toegevoegd voor het blijvend behouden van trainingshistorie.
- Gedeeltelijk afgeronde trainingen verschijnen nu correct in Historie.
- Historie-opslag gebruikt automatische, roterende back-ups, een gecontroleerde tijdelijke schrijfsleutel en rollback bij fouten.
- Eerdere historie wordt waar mogelijk uit bekende legacy-, back-up- en afgeronde actieve-trainingsstructuren hersteld.
- Niet-destructieve datanormalisatie vervangt de eerdere migratie die trainingsgegevens kon wissen.
- Handmatig back-ups exporteren en veilig samenvoegend importeren is toegevoegd aan Historie.
- App-updates en schemawijzigingen wissen voortaan geen trainingshistorie, records, actieve trainingen of gewichtsgegevens.

## 0.4.0 - 2026-07-13

- Opgeslagen trainingen kunnen vanuit de historie worden geopend, bekeken en aangepast.
- Oefeningen binnen een opgeslagen training kunnen worden gewijzigd of afzonderlijk verwijderd.
- Volledige trainingen kunnen na een duidelijke bevestiging worden verwijderd.
- Persoonlijke records, krachtgrafieken en vorige oefenwaarden worden na wijzigingen opnieuw uit de resterende historie berekend.
- Oudere historie-items blijven compatibel en worden pas bij een gerichte wijziging veilig met ontbrekende statusvelden aangevuld.
- Bestaande trainingshistorie, actieve trainingen en gewichtsgegevens blijven behouden.

## 0.3.0 - 2026-07-12

- Oefeningen kunnen tijdens een training in vrije volgorde worden uitgevoerd.
- Nieuw trainingsoverzicht met een duidelijke status per oefening.
- Voltooide oefeningen kunnen opnieuw worden geopend en aangepast.
- Na het opslaan keert de gebruiker automatisch terug naar het trainingsoverzicht.
- De vaste stap-voor-stapnavigatie is verwijderd.

## 0.2.0 - 2026-07-12

- Persoonlijk dashboard met een tijdsafhankelijke begroeting voor Dave.
- Doelgewicht van 80 kg met actuele resterende voortgang en een positieve melding zodra het doel is bereikt.
- Slim voorstel voor de volgende training, met een knop om direct te starten.
- Uitgebreidere informatie over de laatste training, inclusief datum, duur, oefeningen en sets waar beschikbaar.
- Nieuwe indeling met uitsluitend Training A – Bovenlichaam & buik en Training B – Benen, rug & core.
- Cardio is als eerste onderdeel opgenomen in iedere training.
- Bestaande gewichtsmetingen blijven behouden; oude trainingshistorie wordt conform de schone start éénmalig verwijderd.
- Verbeterde bediening tijdens actieve trainingen met oefeningvoortgang, vorige waarden, plus- en minknoppen, automatische rusttimer en duidelijke vervolgacties.

## 0.1.0 - 2026-07-12

- Vernieuwde layout, geïnspireerd op de gebruiksvriendelijke en rustige schermopbouw van AirTraXX.
- Consistente knoppen, kaarten, headers, schermmarges en navigatie in de volledige app.
- Het bestaande donkergroene FitnessTracker-kleurenschema is behouden en centraal vastgelegd.
- Verbeterde safe-area-afhandeling, aanraakvlakken, pressed- en disabled-states en weergave op kleine schermen.
- Geen wijzigingen aan trainingsdata, opslagstructuur of bestaande functionaliteit.
