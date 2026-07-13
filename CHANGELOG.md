# Changelog

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
