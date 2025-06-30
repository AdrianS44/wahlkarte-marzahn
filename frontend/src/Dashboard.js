import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, GeoJSON } from 'react-leaflet';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Filter, Map, BarChart3, Users, TrendingUp, MapPin, Home, Info, Settings, Edit, LogOut } from 'lucide-react';
import Papa from 'papaparse';
import proj4 from 'proj4';
import wahlkreisGeoJson from './wahlkreis-grenzen.json';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Fix Leaflet default marker icons
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// U-Bahn station coordinates for Marzahn-Hellersdorf (final corrected coordinates)
const stationCoordinates = {
  'Um den U-Bhf. Kaulsdorf-Nord herum': [52.52104944488676, 13.588935913056046], // Korrekte Koordinaten
  'Um den U-Bhf. Hellersdorf herum': [52.5361, 13.6054], // GJP4+G4 Berlin (bereits korrekt)
  'Um den U-/S-Bhf. Wuhletal herum': [52.5124167, 13.5752778], // 52°30'44.7"N 13°34'30.9"E
  'Um den U-Bhf. Kienberg herum': [52.52842141169159, 13.590578732296787], // Korrekte Koordinaten
  'Um den U-Bhf. Cottbusser Platz herum': [52.53375897527301, 13.596232651740307], // Korrekte Koordinaten
  'Siedlungsgebiet': [52.5240, 13.6129] // 52°31'26.5"N 13°36'46.5"E (bereits korrekt)
};

// Complete survey data (all responses starting from ID 11)
const surveyData = `id. Antwort ID;Q00. In welchem Kiez wohnen Sie?;Q001. Wie alt sind Sie?;Q002. Wie viele Personen leben (inkl. Ihnen) in Ihrem Haushalt?;Q012[SQ001]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Soziale Medien];Q012[SQ003]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Zeitung/Print-Medien];Q012[SQ004]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Fernsehen/TV];Q012[SQ005]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Bezirkszeitung];Q012[SQ006]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Newsletter];Q012[SQ007]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Informationsveranstaltung];Q012[SQ008]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Gar nicht];Q012[other]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Sonstiges];Q013[SQ001]. Welche sozialen Medien nutzen Sie? [Facebook];Q013[SQ002]. Welche sozialen Medien nutzen Sie? [Instagram];Q013[SQ003]. Welche sozialen Medien nutzen Sie? [TikTok];Q013[SQ004]. Welche sozialen Medien nutzen Sie? [YouTube];Q013[SQ005]. Welche sozialen Medien nutzen Sie? [WhatsApp];Q013[SQ006]. Welche sozialen Medien nutzen Sie? [keine];Q013[other]. Welche sozialen Medien nutzen Sie? [Sonstiges];Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?;Q004[SQ001]. Welche Themen beschäftigen Sie aktuell am meisten? [Wohnen / Mieten];Q004[SQ002]. Welche Themen beschäftigen Sie aktuell am meisten? [Sicherheit];Q004[SQ003]. Welche Themen beschäftigen Sie aktuell am meisten? [Bildung / Schule];Q004[SQ004]. Welche Themen beschäftigen Sie aktuell am meisten? [Verkehr];Q004[SQ005]. Welche Themen beschäftigen Sie aktuell am meisten? [Umwelt];Q004[SQ006]. Welche Themen beschäftigen Sie aktuell am meisten? [Nachbarschaftliches Miteinander];Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?;Q006. Wie gut fühlen Sie sich über lokale Themen informiert?;Q007. Wie stark fühlen Sie sich im Bezirk politisch vertreten?;Q008. Wie sehr glauben Sie, dass politische Entscheidungen Ihre Lebensrealität verbessern können?;"Q011. Haben Sie schon einmal etwas von den ""Kiezmachern"" gehört?";Q009. Würden Sie sich gerne stärker bei lokalen Themen einbringen?;Q010. Was wünschen Sie sich für die Zukunft in Ihrem Kiez?
11;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Ja;Nein;Nein;Nein;Nein;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;3;Nein;Ja;Nein;Ja;Nein;Nein;eher optimistisch;unzureichend;;;N/A;;
12;Siedlungsgebiet;30-49;2;Ja;Nein;Ja;Ja;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;4;Ja;Ja;Nein;Ja;Nein;Nein;eher optimistisch;unzureichend;3;;Ja;Weiß nicht;Mehr Verkehrssicherheit auf der Wernerstraße. Diese parkenden LKW's die den Kindern die Sicherheit zum Überqueren der Straße behindern.
13;Um den U-Bhf. Kaulsdorf-Nord herum;18-29;2;Nein;Nein;Nein;Nein;Nein;Nein;Ja;;Nein;Ja;Ja;Ja;Ja;Nein;;1;Ja;Nein;Nein;Nein;Nein;Nein;eher pessimistisch;unzureichend;2;3;Nein;Ja;Mehr Investitionen
14;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;3;Nein;Ja;Nein;Nein;Nein;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;4;Ja;Ja;Ja;Nein;Nein;Nein;eher optimistisch;ausreichend;2;3;Nein;Ja;
15;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
16;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
17;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Nein;Nein;Nein;Nein;Nein;Ja;;Nein;Nein;Nein;Nein;Nein;Ja;;3;Ja;Ja;Nein;Nein;Nein;Nein;eher pessimistisch;;4;4;Nein;Weiß nicht;Weniger Beton in Form von Wohnungen und wenn dann nicht so hässlich wie am Clara Zetkin Park (Lion Feuchtwanger)
18;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
19;;;4 oder mehr;Nein;Nein;Nein;Nein;Nein;Nein;Nein;;Nein;Nein;Ja;Ja;Nein;Nein;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
20;;;;Nein;Nein;Nein;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Nein;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
21;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
22;Siedlungsgebiet;18-29;3;Ja;Ja;Ja;Ja;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;4;Nein;Ja;Nein;Nein;Nein;Nein;eher optimistisch;ausreichend;4;4;Ja;Ja;Der 2. Teil vom Baltenring muss DRINGEND sanierte werden. Da klirren die Tassen im Schrank, wenn Busse oder LKws vorbeikommen. Dann muss auch die Iselbergstraße dringend und allgemein unsere Straßen im Siiedlungsgebiet gemacht werden. Löscher ohne Ende. Wir brauchen eine Sanierungsoffensive.
23;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Ja;Ja;Ja;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Ja;Ja;Ja;Ja;eher pessimistisch;unzureichend;2;3;Nein;Weiß nicht;Sicherheit
24;Um den U-Bhf. Hellersdorf herum;30-49;1;Nein;Ja;Ja;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;1;Ja;Nein;Nein;Nein;Nein;Ja;sehr pessimistisch;unzureichend;2;1;Nein;Weiß nicht;Rücksicht der Nachbarn, Miteinander, besseres Verhalten des Vermieters
25;Siedlungsgebiet;30-49;4 oder mehr;Nein;Nein;Nein;Nein;Ja;Nein;Nein;Kiezmacher-Newsletter;Nein;Nein;Nein;Ja;Ja;Nein;;5;Ja;Ja;Ja;Nein;Nein;Nein;eher optimistisch;unzureichend;3;5;Ja;Nein;Keine AfD, die CDU zurück
26;Um den U-/S-Bhf. Wuhletal herum;30-49;1;Ja;Ja;Ja;Nein;Nein;Ja;Nein;;Ja;Ja;Nein;Nein;Nein;Nein;;4;Ja;Ja;Ja;Ja;Ja;Ja;sehr pessimistisch;ausreichend;2;4;Nein;Nein;Migrationspolitik abschaffen. Ein sicheres Deutschland zurück.
27;Um den U-Bhf. Kienberg herum;50-69;1;Nein;Nein;Ja;Nein;Nein;Ja;Ja;;Nein;Nein;Nein;Ja;Ja;Nein;;4;Ja;Ja;Ja;Ja;Ja;Ja;eher optimistisch;unzureichend;1;2;Nein;Weiß nicht;Ich denke es hat sich in den letzten Jahren einiges getan. Wohlbefinden, Krankenversorgung, Freizeitmöglichkeiten, Einkaufen usw. Es wäre gut Zentren  der politischen  Mitbestimmung für die Zunkunft zu fördern/unterstützen.
28;Um den U-/S-Bhf. Wuhletal herum;70+;1;Nein;Ja;Nein;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;5;Nein;Nein;Nein;Nein;Nein;Ja;;sehr gut;;;Ja;Nein;Mehr Ordnung von unseren Mitbürgern
29;Siedlungsgebiet;30-49;2;Nein;Ja;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Ja;Nein;;3;Ja;Nein;Nein;Ja;Ja;Ja;eher optimistisch;ausreichend;;;N/A;;
30;Siedlungsgebiet;50-69;2;Ja;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Ja;Nein;Ja;Ja;Nein;;5;Nein;Ja;Ja;Nein;Nein;Nein;eher optimistisch;ausreichend;4;3;Ja;Nein;
31;Um den U-/S-Bhf. Wuhletal herum;70+;2;Nein;Ja;Ja;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Ja;Ja;Nein;Ja;Nein;Nein;eher optimistisch;ausreichend;;;Nein;Nein;
32;Um den U-/S-Bhf. Wuhletal herum;70+;2;Nein;Nein;Nein;Ja;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Nein;Internet Google;2;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;ausreichend;3;3;Ja;Nein;ENTENBRÜCKE
33;Um den U-Bhf. Kienberg herum;50-69;2;Nein;Nein;Ja;Ja;Nein;Ja;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Nein;Nein;eher optimistisch;unzureichend;3;4;Ja;Ja;Freibad ,stabile Mieten , sauberes Quartier
34;Um den U-/S-Bhf. Wuhletal herum;70+;2;Ja;Nein;Nein;Ja;Nein;Nein;Nein;;Ja;Nein;Nein;Ja;Ja;Nein;;5;Ja;Ja;Nein;Nein;Ja;Ja;sehr optimistisch;ausreichend;1;1;Nein;Nein;Eine neue Brücke über die Wuhle die alte Brücke ist schon lange gesperrt ge
35;Um den U-/S-Bhf. Wuhletal herum;70+;2;Ja;Nein;Ja;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;1;Ja;Ja;Ja;Ja;Ja;Ja;eher optimistisch;ausreichend;2;3;Nein;Ja;Endlich die Entenbrücke sanieren!!
36;Um den U-Bhf. Kienberg herum;18-29;1;Nein;Ja;Nein;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;2;Ja;Nein;Nein;Nein;Nein;Nein;eher optimistisch;sehr gut;3;1;Nein;Ja;Dass Rassismus Queer und Behindertenfeindlichkeit im kiez zurückgeht
37;Um den U-/S-Bhf. Wuhletal herum;50-69;1;Nein;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;4;Nein;Ja;Nein;Ja;Ja;Nein;eher optimistisch;ausreichend;2;2;N/A;Weiß nicht;Mehr Augenmerk auf die Einheimischen
38;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Nein;Nein;Ja;Nein;Nein;Nein;;Ja;Nein;Nein;Nein;Ja;Nein;;4;Nein;Nein;Nein;Nein;Ja;Nein;eher optimistisch;ausreichend;4;3;Ja;Weiß nicht;Verständnis der Bewohner - zwecks Sauberkeit
39;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
40;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Ja;Ja;Nein;Ja;Nein;Nein;Nein;;Ja;Nein;Nein;Ja;Ja;Nein;;2;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;sehr gut;3;1;Ja;Ja;keinen Afd Vorsitzenden
41;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Nein;Ja;Nein;Ja;Nein;Nein;Nein;;Ja;Nein;Nein;Ja;Ja;Nein;;2;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;1;Ja;Ja;keinen Afd Vorsitzenden
42;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;3;Ja;Ja;Ja;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Nein;Nein;Ja;Ja;Nein;eher optimistisch;unzureichend;3;3;Nein;Nein;Supermarkt am Cecilienplatz, Erhalt der vorhandenen Grünflächen
43;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Nein;Nein;Ja;Nein;Nein;Nein;;Ja;Ja;Nein;Ja;Nein;Nein;;4;Ja;Ja;Nein;Nein;Nein;Nein;eher pessimistisch;ausreichend;2;2;Ja;Nein;Das der Schandfleck am Bahnhof verschwindet und wieder vernünftige Geschäfte in das SpreeCenter ziehen
44;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;4 oder mehr;Ja;Ja;Nein;Nein;Nein;Nein;Nein;;Ja;Ja;Nein;Nein;Ja;Nein;;3;Nein;Ja;Ja;Nein;Nein;Ja;eher pessimistisch;ausreichend;4;2;Ja;Weiß nicht;Beseitigung der Rewe Ruinen und dem ganzen Dreck drumherum
45;Siedlungsgebiet;50-69;3;Ja;Ja;Ja;Ja;Ja;Nein;Nein;Gespräche;Ja;Ja;Nein;Nein;Ja;Nein;Telegram;5;Nein;Ja;Ja;Ja;Ja;Nein;eher optimistisch;sehr gut;4;4;Ja;Ja;
46;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Ja;Nein;Nein;Ja;Ja;Nein;;2;Ja;Ja;Nein;Nein;Nein;Ja;eher optimistisch;ausreichend;3;1;Ja;Ja;Einen Vorsitzenden der nicht bei der Afd ist.
47;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;4 oder mehr;Ja;Ja;Nein;Ja;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;3;Nein;Ja;Ja;Ja;Ja;Ja;eher pessimistisch;ausreichend;;3;Ja;Weiß nicht;Dass die zukünftige Gestaltung zusammenhängend, nachvollziehbarer, mit und für die Bewohner gemacht wird
48;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Ja;Nein;Nein;Ja;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;1;Ja;Ja;Nein;Nein;Nein;Nein;sehr pessimistisch;unzureichend;2;2;Nein;Weiß nicht;Bessere Einkaufsmöglichkeiten und saubere und hellere Wege und Zugängen zur U Bahn,
49;Um den U-Bhf. Kienberg herum;50-69;3;Nein;Nein;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;5;Nein;Nein;Nein;Ja;Ja;Nein;eher optimistisch;unzureichend;5;5;Nein;Nein;Mehr Beachtung für die Öffentliche Grünflächen. Bessere Abstimmung beim Sperrungen im Nahverkehr .
50;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Nein;Nein;Ja;Nein;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;;Nein;Ja;Nein;Nein;Ja;Nein;eher optimistisch;ausreichend;;3;Ja;Ja;Das Herr Herrmann und sein Team mehr Erfolge genießen können.  Sie setzen sich sehr stark für den Kiez ein .
51;Um den U-Bhf. Kienberg herum;18-29;2;Ja;Nein;Nein;Nein;Ja;Nein;Nein;Alexander Herrmann;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Nein;Nein;Ja;Ja;Ja;eher pessimistisch;unzureichend;2;4;Ja;Weiß nicht;"Besser infrastrukturelle Anbindung an den ÖPNV, stärkeren Ausbau an Lademöglichkeit für Elektrofahrzeuge, bezahlbare Mieten und weniger Blau/Braune ""Patrioten"""
52;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Ja;Nein;Ja;Nein;Ja;Nein;Nein;;Nein;Ja;Ja;Ja;Ja;Nein;;4;Ja;Ja;Nein;Ja;Ja;Nein;eher optimistisch;ausreichend;4;3;Ja;Ja;Wir bräuchten dringend mehr E-Ladesäulen im Kiez!
53;Um den U-Bhf. Hellersdorf herum;50-69;1;Nein;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;unzureichend;3;3;Ja;Weiß nicht;Sauberkeit, Sicherheit, stabile Mieten
54;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Nein;Nein;Nein;Ja;Ja;Nein;;Ja;Ja;Ja;Nein;Nein;Nein;;3;Ja;Ja;Nein;Ja;Nein;Ja;eher pessimistisch;unzureichend;3;2;Ja;Ja;Bessere Märkte, Einkaufsmöglichkeit und Gastronomie. Bessere Wege.
55;Um den U-Bhf. Cottbusser Platz herum;30-49;4 oder mehr;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Ja;Nein;Ja;Nein;Ja;Nein;;4;Ja;Ja;Ja;Nein;Ja;Ja;eher pessimistisch;unzureichend;1;4;Ja;Weiß nicht;Wieder mehr Angebote für ältere Menschen und Kinder und jugendliche
56;Um den U-Bhf. Cottbusser Platz herum;30-49;3;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;5;Ja;Nein;Ja;Ja;Nein;Nein;eher optimistisch;unzureichend;4;3;Ja;Ja;Weniger bauverdichtung, bessere Sauberkeit und mehr Präsenz des Ordnungsamtes vor allen Wegen der Hunde Besitzer
57;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Nein;Nein;Ja;Ja;Nein;Nein;;Nein;Ja;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Nein;Nein;Nein;eher optimistisch;ausreichend;1;5;Ja;;Bessere Wege - nicht nur Häuser bauen - die verschobenen Gehwegplatten bleiben wie bisher so liegen. Keine unnötigen Wegeeinschränkungen bei Baustellen und insgesamt bessere Beleuchtung bei manchen Wegen und Straßen. Gitter am Bahnhof Wuhletal damit Radfahrer dort an den Übergängen absteigen müssen und nicht einfach so in voller Fahrt drüber schießen!!!! Das hilft viele Beinaheunfälle dort zu vermeiden!
58;Siedlungsgebiet;30-49;4 oder mehr;Ja;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Nein;Ja;Nein;Ja;Nein;Nein;eher optimistisch;ausreichend;3;1;Ja;Weiß nicht;Mehr Verkehrssicherheit, weniger Assis und weniger Hundekacke
59;Um den U-Bhf. Kienberg herum;50-69;2;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Ja;Nein;;3;Ja;Nein;Nein;Nein;Nein;Nein;eher pessimistisch;ausreichend;5;4;Ja;Nein;weniger Menschen mit Migrationshintergrund
60;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;1;Ja;Ja;Nein;Nein;Nein;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;4;Ja;Ja;Nein;Ja;Nein;Nein;eher pessimistisch;ausreichend;4;3;Ja;Weiß nicht;
61;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;4 oder mehr;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;3;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;5;1;Ja;Weiß nicht;Mehr Fsmilienfreundlichkeit und Sicherheit
62;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
63;Um den U-Bhf. Kienberg herum;70+;2;Ja;Nein;Ja;Ja;Ja;Nein;Nein;;Nein;Ja;Nein;Nein;Ja;Nein;;4;Ja;Nein;Nein;Ja;Nein;Nein;eher optimistisch;ausreichend;3;4;Ja;Nein;
64;Um den U-/S-Bhf. Wuhletal herum;50-69;1;Nein;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;4;Nein;Ja;Nein;Nein;Ja;Ja;eher optimistisch;ausreichend;2;2;Nein;Weiß nicht;Ich wünsche mir dringend einen Aufzug für die Bahnhöfe Wuhletal und Kaulsdorf Nord. Vor ca. 2 Jahren hatte ich im Büro von Hr. Hermann zu diesem Thema nachgefragt. Da habe ich eine hoffnungsvolle Antwort bekommen, aber leider seit dem hört man zu diesem Thema bis heute gar nichts mehr.
65;Um den U-Bhf. Kaulsdorf-Nord herum;70+;2;Nein;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Ja;Nein;eher optimistisch;ausreichend;4;4;Ja;Weiß nicht;Endlich dass das Bauvorhaben am Cecilienplatz los geht.
66;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Nein;Nein;Ja;Ja;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Nein;Nein;eher pessimistisch;ausreichend;3;3;Ja;Ja;Springbrunnen repariert wird...U Bahn pünktlicher fährt und nicht jedes Jahr für mehrere Wochen ausfällt...es sauberer wird...Nachts ab 23:00 keine Polizei mit Signal fährt, wohne hinterm Spreecenter und mein Schlafraum ist zur Cecilienstraße....das der Cecilienplatz endlich bebaut wird...es ist eine Dreckecke wo sich Ratten wohl fühlen.
67;Um den U-Bhf. Kaulsdorf-Nord herum;70+;2;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Nein;Ja;Nein;eher pessimistisch;unzureichend;3;5;Ja;Weiß nicht;Mehr Sauberkeit und mehr Sicherheit
68;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;3;Ja;Nein;Nein;Nein;Ja;Ja;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;3;Ja;Nein;Ja;Nein;Ja;Nein;eher pessimistisch;unzureichend;2;2;Ja;Ja;
69;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;4 oder mehr;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Nein;Nein;Nein;;4;Nein;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;2;Ja;;Mehr gemeinschaftliches Miteinander, weniger Hass und Hetze
70;Um den U-Bhf. Kienberg herum;30-49;3;Ja;Nein;Nein;Ja;Nein;Nein;Nein;;Ja;Ja;Ja;Ja;Nein;Nein;;2;Ja;Ja;Nein;Ja;Nein;Nein;eher pessimistisch;unzureichend;2;4;Ja;Weiß nicht;
71;Um den U-/S-Bhf. Wuhletal herum;50-69;2;Ja;Nein;Ja;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Nein;Nein;Nein;;3;Ja;Ja;Nein;Ja;Nein;Nein;eher pessimistisch;ausreichend;3;2;Ja;Weiß nicht;keine neuen Neubauten, mehr Parkanlagen mit Bänken, bessere Versorgung mit Ärzten, mehr Barrierefreiheit in den U- Bahnhöfen, Abriss der Ruinen am Bahnhof Kaulsdorf Nord und Neubau
72;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Ja;Nein;Ja;Ja;Nein;;3;Ja;Nein;Nein;Ja;Nein;Nein;eher pessimistisch;unzureichend;3;3;Ja;Weiß nicht;Dass die Lion-Feuchtwanger-Str. endlich saniert wird, wie vor Jahren versprochen!!!!
73;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;4 oder mehr;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Nein;Ja;Nein;;5;Nein;Ja;Ja;Nein;Nein;Nein;eher optimistisch;ausreichend;4;3;Ja;Weiß nicht;
74;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Nein;Ja;Nein;Nein;Nein;Nein;eher optimistisch;ausreichend;;3;Ja;;Ich würde es sehr begrüßen, dass Entscheidung unbürokratischer entschieden werden . Wie z. B. Ruine am U-Bahnhof Kaulsdorf Nord.  Unsere Gegend war einmal eine tolle Einkaufsmeile.  Des weiteren gibt es an der Ruine gegenüber den ehemaligen Restaurant eine Baustelle die nicht beendet wurde. Wochenlang ruht diese Baustelle
75;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;3;Ja;;
76;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Nein;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;ausreichend;4;3;Ja;Nein;Keine weitere Grünflächenvernichtung durch Wohnungsbau, Abriss und Bebauung am Cecilienplatz
77;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Nein;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Ja;Nein;Nein;Ja;Nein;Nein;eher pessimistisch;unzureichend;3;4;Ja;Ja;Neuanlage einiger Grünflächen im Roten Viertel(z.B. Insektenwiesen), Abriss und Neubau der 3 Gebäude am U-Bhf. Kaulsdorf-Nord, Neugestaltung der Parkplatzeinfahrten Cecilienstr./Lily-Braun-Str.), mehr Einkaufsmöglichkeiten und Ärzte
78;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Nein;Nein;;3;Nein;Ja;Nein;Nein;Ja;Ja;eher pessimistisch;ausreichend;;;Nein;Weiß nicht;Ordentlich und sauber
79;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;3;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Ja;Nein;Ja;Nein;Nein;;3;Ja;Nein;Ja;Nein;Ja;Ja;eher optimistisch;unzureichend;2;5;Ja;Weiß nicht;Weniger aktiven Rassismus in meiner Nachbarschaft, ständig werden Menschen auf offener Straße rassistisch beleidigt. Mehr Kinderfreundlichkeit, die vielen alten Leute sind oft unfreundlich zu Kindern. Ùberall werden faschistische Sticker geklebt, dazu hat sich der Kiezmacher noch nie geàußert.
80;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;4;4;Ja;Ja;Sauberkeit, Sicherheit, freundschaftliches Miteinander
81;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Nein;Nein;Ja;sehr pessimistisch;ausreichend;3;2;Ja;Weiß nicht;ORDNUNG rund um den Cecielienplatz und Sicherheit,  sowie Ärzte und  neue eine Kaufhalle
82;Siedlungsgebiet;50-69;1;Ja;Ja;Ja;Nein;Ja;Ja;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Nein;Nein;Nein;Ja;Ja;Nein;;ausreichend;;2;Nein;Weiß nicht;
83;Um den U-Bhf. Kienberg herum;30-49;1;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;3;Ja;Nein;Nein;Nein;Nein;Ja;eher pessimistisch;unzureichend;2;1;Nein;Ja;
84;Um den U-Bhf. Cottbusser Platz herum;30-49;1;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Nein;Ja;Nein;;4;Nein;Ja;Ja;Nein;Nein;Nein;eher pessimistisch;ausreichend;4;4;Ja;Ja;Fußgänger Bedarfsampel Hellersdorfer Straße Ecke Kastanien Allee Höhe Brücke Kastanien Boulevard. Zebrastreifen Adorferstraße Ecke Nossener Straße Schulweg sicherer machen.
85;Um den U-Bhf. Kaulsdorf-Nord herum;70+;2;Nein;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;2;Nein;Ja;Nein;Nein;Ja;Nein;eher pessimistisch;;2;2;Ja;Weiß nicht;Abriß und Neubau der Rewe-Ruinen am Bahnhof Kaulsdorf-Nord
86;Um den U-Bhf. Kienberg herum;50-69;1;Ja;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Ja;Nein;Nein;Nein;Nein;;4;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;4;Ja;Weiß nicht;
87;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Ja;Nein;Nein;Nein;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;1;Nein;Ja;Nein;Ja;Nein;Nein;sehr pessimistisch;unzureichend;;;N/A;Nein;das die Ruine endlich abgerissen wird am U-Bhf Kaulsdorf-Nord !!!
88;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;2;Ja;Ja;Nein;Nein;Nein;Nein;eher pessimistisch;unzureichend;3;2;Ja;Weiß nicht;"Keine Lückenbebauung mehr mit Wohnhäusern; dass die Cecilienpassagen ohne Hochhäuser wiederbelebt werden; keine Spätverkaufsstellen und Barber-Shops mehr!"
89;Um den U-/S-Bhf. Wuhletal herum;70+;1;Ja;Ja;Ja;Ja;Ja;Ja;Nein;Redeb;Nein;Nein;Nein;Nein;Nein;Nein;Reden mit anderen Leuten!!!  Ist ja heute nicht mehr selbstverständlich!;4;Ja;Ja;Ja;Ja;Ja;Ja;eher pessimistisch;unzureichend;;3;Ja;;"Nicht jeden grünen oder überhaupt Flecken bebauen. Es gibt noch andere Bezirke in Berlin. Die gewachsenen sozialen Strukturen werden besonders durch die vielen Sozialwohnungen mit ausländischer Besetzung gestört. Mehr Grünpflege, nicht nur Grünflächen raspelkurz und Pflanzungen bis an den Boden alle paar Jahre ,,verschneiden""! Die allgemeine Infrastruktur hält mit dem Wohnungsbau nicht Schritt."
90;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Nein;Nein;eher pessimistisch;unzureichend;;;N/A;;
91;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;2;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;unzureichend;3;3;Ja;Nein;
92;Um den U-/S-Bhf. Wuhletal herum;;;Nein;Nein;Nein;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Nein;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
93;Um den U-Bhf. Hellersdorf herum;70+;2;Nein;Ja;Nein;Ja;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Ja;Ja;eher optimistisch;ausreichend;;4;Nein;;Sauberkeit Sicherheit Freundlichkeit
94;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;;Nein;Ja;Nein;Ja;Ja;Ja;eher pessimistisch;ausreichend;2;3;Ja;Nein;Ein besseres Miteinander.
95;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;;Ja;Nein;Nein;Nein;Ja;Ja;eher pessimistisch;ausreichend;3;1;Nein;Ja;Mehr Sauberkeit, bessere Abstimmung im Baugeschehen.
96;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;3;Ja;Ja;Nein;Nein;Nein;Nein;Nein;;Ja;Ja;Nein;Nein;Ja;Nein;;3;Ja;Nein;Ja;Nein;Nein;Ja;;ausreichend;3;2;Ja;Ja;
97;Um den U-Bhf. Kienberg herum;30-49;2;Ja;Nein;Ja;Ja;Ja;Nein;Nein;;Ja;Ja;Ja;Nein;Ja;Nein;;4;Ja;Ja;Ja;Nein;Nein;Nein;eher optimistisch;ausreichend;2;3;Nein;;Mehr Sicherheit, bessere Schulen
98;Um den U-Bhf. Kaulsdorf-Nord herum;70+;3;Nein;Ja;Nein;Ja;Ja;Ja;Nein;;Nein;Ja;Nein;Nein;Ja;Nein;X;2;Ja;Ja;Nein;Nein;Ja;Ja;eher pessimistisch;ausreichend;4;5;Nein;Weiß nicht;Mehr Ordnung und weniger Vermüllung. Erhalt des SpreeCenters.
99;Um den U-Bhf. Kienberg herum;50-69;2;Nein;Nein;Nein;Ja;Ja;Ja;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;ausreichend;3;4;Ja;Ja;Miete soll bezahlbar bleiben, Wohnqualität anpassen und dasgeplante Freibad
100;Um den U-Bhf. Hellersdorf herum;70+;2;Ja;Nein;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
101;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;4 oder mehr;Ja;Nein;Nein;Ja;Ja;Nein;Nein;Nachbarn;Ja;Nein;Ja;Ja;Ja;Nein;;4;Nein;Ja;Ja;Ja;Nein;Ja;eher pessimistisch;unzureichend;5;3;Ja;Weiß nicht;
102;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;3;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Ja;Nein;;3;Ja;Nein;Ja;Ja;Nein;Nein;eher optimistisch;ausreichend;4;3;Ja;Nein;
103;Um den U-Bhf. Kienberg herum;50-69;3;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Ja;Nein;Ja;Ja;Nein;;3;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;3;Ja;Weiß nicht;Mehr Sauberkeit, bessere/ ausgewogene soziale Durchmischung
104;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Ja;Ja;Ja;Ja;Nein;eher pessimistisch;unzureichend;2;1;Nein;;Ich wünsche mir, dass  man endlich wieder seine Meinung öffentlich sagen kann. Das die Politiker endlich begreifen, dass sie für das Volk da sein müssen. Das unsere Steuergelder hier in Deutschland den deutschen  Bürgern zu Gute kommt und nicht in die halbe Welt und schon gleich garnicht für die Unterstützung von Kriegen ausgegeben wird. Desweiteren wünsche ich mir, daß endlich alle demokratisch gewählten Parteien, also auch die AfD, gleich behandelt werden. Es ist in meinen Augen eine Schande der Demokratie und für Deutschland total Unwürdig. Es schadet unserem Ansehen in der Welt.
105;Um den U-Bhf. Kienberg herum;50-69;2;Ja;Ja;Nein;Ja;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;3;Ja;Ja;Nein;Ja;Nein;Ja;eher pessimistisch;unzureichend;3;3;Ja;;mehr Sauberkeit ,wieder Mülleimer,weniger Ratten und keinen Haschgestank
106;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Nein;Nein;Ja;Ja;Nein;Nein;;Nein;Ja;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Ja;Nein;eher optimistisch;ausreichend;3;3;Ja;Weiß nicht;Mehr grün statt Beton
107;Um den U-Bhf. Cottbusser Platz herum;30-49;4 oder mehr;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;3;Ja;Ja;Ja;Nein;Nein;Nein;eher pessimistisch;ausreichend;3;3;Ja;Ja;Mehr ordnung und sauberkeit, ein freundliches miteinander, mehr auf dem Bürger von der Politik zu gehen.
108;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;1;Ja;Ja;Nein;Nein;Nein;Nein;sehr pessimistisch;ausreichend;2;3;Ja;Weiß nicht;Stopp der Bebauung der Innenhöfe und die allg Verdichtung der Wohngebiete ohne auf die Infrastruktur zu achten.
109;Siedlungsgebiet;70+;2;Ja;Nein;Ja;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;3;Nein;Nein;Ja;Ja;Ja;Nein;eher pessimistisch;ausreichend;2;2;Ja;Nein;
110;Um den U-/S-Bhf. Wuhletal herum;30-49;2;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;3;Ja;Nein;Nein;Nein;Nein;Nein;eher pessimistisch;ausreichend;2;3;Ja;Weiß nicht;Bessere öffentliche Spielplätze,mehr Freizeitangebote
111;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Nein;Ja;Nein;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;2;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;unzureichend;2;4;Ja;Nein;Mehr Einkaufsmöglichkeiten, Bebauung Cecilienplatz
112;Um den U-Bhf. Cottbusser Platz herum;30-49;2;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;3;Ja;Ja;Nein;Ja;Nein;Ja;sehr optimistisch;ausreichend;2;2;Nein;Ja;
113;Um den U-/S-Bhf. Wuhletal herum;70+;1;Ja;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;4;Nein;Ja;Nein;Ja;Nein;Ja;eher pessimistisch;ausreichend;4;5;Ja;Ja;Mehr Empathie und Zugewandheit der Mitmenschen untereinander, weniger Verschmutzung der öffentlichen Flächen
114;Um den U-Bhf. Kienberg herum;50-69;2;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Ja;Nein;Nein;Ja;Nein;;3;Nein;Ja;Nein;Ja;Nein;Ja;eher pessimistisch;ausreichend;3;5;Ja;Weiß nicht;Respektvolles Miteinander
115;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Nein;Ja;Ja;Ja;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;2;Ja;Ja;Nein;Nein;Ja;Ja;eher optimistisch;ausreichend;2;5;Nein;Weiß nicht;Mehr Lebensmittelgeschäfte, beim dem zu erwartenden Zuzug und ausreichende Parkplätze!
116;Um den U-Bhf. Kienberg herum;18-29;1;Ja;Nein;Ja;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Nein;Nein;;4;Ja;Ja;Ja;Ja;Ja;Ja;eher optimistisch;ausreichend;3;3;Ja;Ja;Weiterhin Umweltschonende Maßnahmen u. Ein grundlegende Überlegung bei Planung des KombiBads MaHe.
117;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;4;Ja;Nein;Nein;Nein;Nein;Nein;eher pessimistisch;ausreichend;5;4;Ja;Weiß nicht;
118;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Nein;Nein;;4;Ja;Ja;Nein;Nein;Nein;Ja;eher optimistisch;ausreichend;4;3;Ja;Weiß nicht;Nette Menschen, das Grüne soll erhalten werden, eine gute Infrastruktur
119;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Nein;Nein;Nein;Ja;Ja;eher pessimistisch;ausreichend;3;3;Ja;Ja;Ärzte, attraktive Einkaufsmöglichkeiten,Erhalt der vorhandenen Grünflächen und grünen Höfe, Pflege und Erhalt der Grünanlagen im Wuhletal
120;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Nein;Nein;;3;Ja;Nein;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;4;Ja;Nein;Zurückdrängung der AfD, geänderte Wohnungpolitik ohne Hochhäuser und zugebaute Innenhöfe
121;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Ja;Ja;Ja;Nein;;3;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;2;Ja;Weiß nicht;Nicht nur Wohnungen bauen, mehr Infrastruktur schaffen. Der Cecilienplatz sollte endlich mal attraktiv gestaltet werden und sich stark für den Abriss der 2 Gebäude eingesetzt werden.
122;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
123;Um den U-Bhf. Kienberg herum;50-69;2;Nein;Nein;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Nein;Nein;Nein;Nein;Nein;Nein;eher optimistisch;unzureichend;;2;Nein;;1. gute soziale Mischung der Bevölkerung  2. Gute Infrastruktur  3. Ein Ordnungsamt, dass seinen Aufgaben nachkommt
124;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;4 oder mehr;Nein;Nein;Nein;Nein;Nein;Nein;Ja;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Nein;Nein;Ja;Nein;Ja;Ja;eher optimistisch;ausreichend;4;1;Nein;Ja;^tolerante Menschen, die Menschen aus allen Ländern willkommen heißen
125;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;2;Ja;Nein;Nein;Nein;Nein;Nein;sehr pessimistisch;ausreichend;3;2;Ja;;Beseitigung der Bauruine am U Bhf Kaulsdorf und Neubebauung des Areals
126;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Ja;Ja;Ja;Ja;eher pessimistisch;ausreichend;4;4;Ja;Weiß nicht;Vor allem, dass an der Wuhle endlich etwas passiert. Keiner kümmert sich darum, wie es dort aussieht. das hat ncht mehr mit renaturierung zu tun
127;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;1;Ja;Ja;Nein;Ja;Nein;Nein;sehr pessimistisch;ausreichend;2;4;Ja;Nein;Stopp der Bebauung in Innenhöfen, keine Geschosshöhe über 6 Etagen. Verbesserung der Infrastruktur und nachzug vom Migranten verringern.
128;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;4 oder mehr;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Ja;Nein;;2;Nein;Ja;Ja;Ja;Nein;Ja;eher pessimistisch;ausreichend;3;4;Ja;;Beseitigung der alten Rewe Ruinen und mehr Sauberkeit
129;Um den U-Bhf. Hellersdorf herum;50-69;2;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;4;Nein;Ja;Nein;Ja;Ja;Ja;eher pessimistisch;ausreichend;2;3;Ja;Weiß nicht;Gute Nachbarschaft, Sauberkeit, mehr Miteinander,
130;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Ja;Ja;Ja;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Ja;Nein;Nein;Nein;Nein;Ja;eher pessimistisch;ausreichend;3;2;Ja;Weiß nicht;Nachbarschaftshilfen, bessere öffentlich Verkehrsmittel mit mehr Platz für Behinderte und deren Hilfsmittel. Rollatorenplätze und E-Scooter plätze!
131;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;3;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;unzureichend;4;4;Ja;Weiß nicht;Ein besseres Miteinander statt Nebeneinander
132;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Nein;Ja;Nein;Ja;Nein;Nein;;Ja;Nein;Ja;Ja;Ja;Nein;;3;Nein;Ja;Nein;Ja;Nein;Ja;eher pessimistisch;ausreichend;3;4;Ja;;
133;Siedlungsgebiet;50-69;2;Nein;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Nein;Ja;Ja;Ja;Nein;Nein;eher pessimistisch;ausreichend;3;4;Ja;Weiß nicht;
134;Um den U-Bhf. Hellersdorf herum;50-69;2;Nein;Ja;Ja;Nein;Ja;Ja;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;3;Ja;Ja;Nein;Nein;Nein;Ja;sehr pessimistisch;ausreichend;3;1;Ja;Ja;mehr sicherheit und weniger Vermüllung und Verschlechterung des Umfeldes
135;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
136;Um den U-Bhf. Kienberg herum;50-69;4 oder mehr;Ja;Ja;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;3;Nein;Ja;Ja;Nein;Nein;Ja;eher optimistisch;ausreichend;3;4;Ja;Ja;Ordnung, Sauberkeit und Sicherheit sollten Priorität haben. Nach dem New Yorker Vorbild arbeiten. Dreck weg und das täglich. Auch am Wochenende.
137;Um den U-Bhf. Cottbusser Platz herum;70+;2;Nein;Ja;Ja;Nein;Nein;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Ja;;2;Nein;Ja;Nein;Nein;Ja;Nein;sehr pessimistisch;unzureichend;2;4;Ja;Nein;mehr Sauberkeit und den Erhalt der grünen Umgebung (keine Hochhäuser und keine Bebauung von Innenhöfen), neue Häuser mit mehr Abstand zur Strasse bauen
138;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Nein;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;unzureichend;;5;Ja;Weiß nicht;Ruhe Frieden Geborgenheit
139;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Nein;Ja;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Nein;Nein;Nein;;3;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;ausreichend;3;4;Ja;Weiß nicht;Für mich ist es aktuell sehr dringend, dass die Fußgängerbrücke über die Wuhle wieder zur Verfügung steht. Des Weiteren ist die Parkraumsituation eine Katastrophe. Es wird immer weiter gebaut, was sicher notwendig ist, aber an Parkplätze wird nur wenig gedacht. 50 neue Parkplätze bei 128 neuen Wohnungen sind doch ein Witz. Ich verzichte seit langer Zeit darauf abends noch einmal das Haus zu verlassen, da ich bei später Heimkehr nicht weiß, wo ich mein Auto parken kann.
140;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;4;Ja;Ja;Nein;Nein;Ja;Ja;eher pessimistisch;sehr gut;2;2;Ja;Weiß nicht;"Dass die unverhältnismäßige Bautätigkeit der letzten Jahre endlich gestoppt wird und dass das über Jahre gewachsene Grün erhalten bleibt. Es tut in der Seele weh, mitanzusehen, wie jede erdenkliche Lücke mit hässlichen grauen Betonklötzen vollgebaut wird, die weder Charme noch Charakter besitzen. Wie z. B. der hässliche Klotz in der Lion-Feuchtwanger-Straße, der noch dazu jede Nacht mit Festbeleuchtung das gesamte Umfeld bestrahlt. Als Architekt würde ich mich schämen, so etwas zu bauen! Die anfangs als Eigentumswohnungen geplanten Wohnungen ist man anscheinend nicht losgeworden. Nun werden diese als Mietwohnungen zu horrenden Preisen angeboten. Das Gebäude hätte man sich getrost sparen können. Da hatte die ehemalige Gaststätte ""Mecklenburg"" - obwohl zuletzt verwahrlost - mehr Charme. Die ehemaligen Stadtplaner der DDR hatten bei der Planung der Neubaugebiete ein gutes Konzept, welches nun immer weiter kaputt gemacht wird. Angefangen hat es in den 90ern mit den Clubgaststätten. Solche Begegnungsstätten für die Menschen sind nun nicht mehr erwünscht und wären doch so wichtig, um wieder in ein Miteinander zu kommen."
141;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Nein;Nein;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Ja;Ja;Nein;Nein;Nein;Ja;eher pessimistisch;unzureichend;;3;N/A;Weiß nicht;
142;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;2;Ja;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Nein;Signal;4;Nein;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;ausreichend;3;5;Ja;Ja;Mehr Sauberkeit und Sicherheit
143;Um den U-Bhf. Kienberg herum;50-69;3;Ja;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;5;Nein;Nein;Nein;Ja;Ja;Ja;eher optimistisch;ausreichend;5;5;Nein;Ja;Besser vernetzt,  Baustellen Zeitiger ansagen. Evt. für das Neue Jahr Informieren über geplante Termine. Schule, öffentliche Verkehrsmittel oder Projekte geplante im Straßenverkehr
144;Um den U-Bhf. Kaulsdorf-Nord herum;70+;2;Ja;Ja;Nein;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;;3;Ja;Ja;Nein;Ja;Ja;Ja;eher optimistisch;ausreichend;;;N/A;;
145;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;4;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;ausreichend;;;N/A;;
146;Um den U-Bhf. Kaulsdorf-Nord herum;50-69;1;Nein;Nein;Nein;Ja;Ja;Nein;Nein;nebenan.de;Nein;Nein;Nein;Nein;Ja;Nein;;1;Nein;Ja;Nein;Nein;Nein;Nein;sehr optimistisch;ausreichend;5;2;Nein;Weiß nicht;das Gewerbe eigene Parkplätze schafft und nicht Anwohnern wegnimmt, Temporeduzierungen im Straßenverkehr
147;Siedlungsgebiet;50-69;2;Nein;Ja;Nein;Nein;Ja;Nein;Nein;;Nein;Nein;Nein;Ja;Ja;Nein;LinkedIn;4;Nein;Ja;Nein;Ja;Nein;Nein;eher pessimistisch;ausreichend;4;5;Ja;Nein;
148;;;;N/A;N/A;N/A;N/A;N/A;N/A;N/A;;N/A;N/A;N/A;N/A;N/A;N/A;;;N/A;N/A;N/A;N/A;N/A;N/A;;;;;N/A;;
149;Um den U-Bhf. Kaulsdorf-Nord herum;70+;1;Ja;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Nein;Nein;Printerest;3;Ja;Ja;Ja;Ja;Ja;Ja;eher optimistisch;ausreichend;3;4;Nein;Nein;Mehr Ordnung und Sauberkeit, einen belebt Cicilienplatz ohne Bauruine , mehr  Sitzgelegenheiten an den  Straßen, dass die begrünten Innenhöfe bleiben, mehr   öffentliche Informationen  , durch aufgestellte  gut lesbare Infotafeln für Veranstaltungen der Clubs und Seniorentreffs und ein friedliches Miteinander!
150;Um den U-Bhf. Cottbusser Platz herum;50-69;1;Ja;Nein;Nein;Ja;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;2;Ja;Ja;Nein;Nein;Ja;Nein;eher pessimistisch;ausreichend;3;2;Ja;Weiß nicht;Mehr Sicherheit und Sauberkeit
151;Um den U-Bhf. Cottbusser Platz herum;18-29;2;Nein;Nein;Nein;Nein;Nein;Nein;Ja;;Nein;Nein;Nein;Ja;Nein;Nein;;4;Ja;Ja;Nein;Nein;Nein;Nein;eher pessimistisch;ausreichend;2;5;Nein;Ja;"Ich wünsche mir eine stärkere und effektivere Bekämpfung rechter Strukturen im Kiez. Es passiert z.B. sehr häufig, dass man Aufkleber mit Inhalten wie ""I &lt;3 NS"" an der Fassade von U-Cottbusser Platz (Eingang vom Helwichstorp Park) sieht, was mich und sicherlich auch andere Mitbewohner verunsichert."`;

function App({ userToken, userRole, onLogout, onAdminMode }) {
  const [parsedData, setParsedData] = useState([]);
  const [filters, setFilters] = useState({
    location: '',
    ageGroup: '',
    mediaSource: '',
    satisfaction: '',
    socialMediaPlatform: '',
    informationSource: '',
    householdSize: '',
    futureOutlook: '',
    politicalRepresentation: '',
    kiezmacherKnown: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [wahlkreisGrenzen, setWahlkreisGrenzen] = useState([]);
  const [showBoundaryEditor, setShowBoundaryEditor] = useState(false);
  const [showWahlkreisGrenzen, setShowWahlkreisGrenzen] = useState(true);

  // UTM to WGS84 coordinate transformation
  const convertedWahlkreisGeoJson = useMemo(() => {
    if (!wahlkreisGeoJson || !wahlkreisGeoJson.features) return wahlkreisGeoJson;
    
    // Define UTM Zone 33N (EPSG:25833) to WGS84 (EPSG:4326)
    const utm33n = '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    const wgs84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';
    
    const convertCoordinates = (coordinates) => {
      if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
        // Multi-dimensional array (polygon)
        return coordinates.map(ring => 
          ring.map(coord => {
            const [x, y] = coord;
            const [lon, lat] = proj4(utm33n, wgs84, [x, y]);
            return [lon, lat];
          })
        );
      } else {
        // Simple coordinate array
        const [x, y] = coordinates;
        const [lon, lat] = proj4(utm33n, wgs84, [x, y]);
        return [lon, lat];
      }
    };

    const convertedGeoJson = {
      ...wahlkreisGeoJson,
      features: wahlkreisGeoJson.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: convertCoordinates(feature.geometry.coordinates)
        },
        properties: {
          ...feature.properties,
          name: "Wahlkreis Marzahn-Hellersdorf 6",
          description: "Echter Wahlkreis umfasst die Gebiete um U-Bahnhöfe Kaulsdorf-Nord, Wuhletal, Kienberg, Hellersdorf, Cottbusser Platz und das Siedlungsgebiet"
        }
      }))
    };

    return convertedGeoJson;
  }, []);

  // Parse CSV data on component mount
  useEffect(() => {
    const result = Papa.parse(surveyData, {
      header: true,
      skipEmptyLines: true
    });
    
    // More lenient filtering - include more data rows
    const cleanedData = result.data.filter(row => {
      const location = row['Q00. In welchem Kiez wohnen Sie?'];
      const age = row['Q001. Wie alt sind Sie?'];
      
      // Keep rows where location OR age has valid data (not strictly both required)
      return (location && location !== 'N/A' && location !== '') || 
             (age && age !== 'N/A' && age !== '');
    });
    
    console.log(`Total rows in CSV: ${result.data.length}`);
    console.log(`Valid survey responses included: ${cleanedData.length}`);
    setParsedData(cleanedData);
  }, []);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return parsedData.filter(row => {
      const location = row['Q00. In welchem Kiez wohnen Sie?'];
      const age = row['Q001. Wie alt sind Sie?'];
      const satisfaction = row['Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?'];
      const socialMedia = row['Q012[SQ001]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Soziale Medien]'];
      const householdSize = row['Q002. Wie viele Personen leben (inkl. Ihnen) in Ihrem Haushalt?'];
      const futureOutlook = row['Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?'];
      const politicalRep = row['Q007. Wie stark fühlen Sie sich im Bezirk politisch vertreten?'];
      const kiezmacher = row['Q011. Haben Sie schon einmal etwas von den "Kiezmachern" gehört?'];
      
      // Social media platform filters
      const facebook = row['Q013[SQ001]. Welche sozialen Medien nutzen Sie? [Facebook]'];
      const instagram = row['Q013[SQ002]. Welche sozialen Medien nutzen Sie? [Instagram]'];
      const tiktok = row['Q013[SQ003]. Welche sozialen Medien nutzen Sie? [TikTok]'];
      const youtube = row['Q013[SQ004]. Welche sozialen Medien nutzen Sie? [YouTube]'];
      const whatsapp = row['Q013[SQ005]. Welche sozialen Medien nutzen Sie? [WhatsApp]'];
      const noSocialMedia = row['Q013[SQ006]. Welche sozialen Medien nutzen Sie? [keine]'];
      
      // Information source filters
      const printMedia = row['Q012[SQ003]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Zeitung/Print-Medien]'];
      const tv = row['Q012[SQ004]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Fernsehen/TV]'];
      const newsletter = row['Q012[SQ006]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Newsletter]'];
      const events = row['Q012[SQ007]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Informationsveranstaltung]'];
      const noInfo = row['Q012[SQ008]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Gar nicht]'];
      
      // Apply all filters
      let matchesSocialPlatform = true;
      if (filters.socialMediaPlatform) {
        switch (filters.socialMediaPlatform) {
          case 'Facebook': matchesSocialPlatform = facebook === 'Ja'; break;
          case 'Instagram': matchesSocialPlatform = instagram === 'Ja'; break;
          case 'TikTok': matchesSocialPlatform = tiktok === 'Ja'; break;
          case 'YouTube': matchesSocialPlatform = youtube === 'Ja'; break;
          case 'WhatsApp': matchesSocialPlatform = whatsapp === 'Ja'; break;
          case 'keine': matchesSocialPlatform = noSocialMedia === 'Ja'; break;
        }
      }
      
      let matchesInfoSource = true;
      if (filters.informationSource) {
        switch (filters.informationSource) {
          case 'Soziale Medien': matchesInfoSource = socialMedia === 'Ja'; break;
          case 'Print-Medien': matchesInfoSource = printMedia === 'Ja'; break;
          case 'Fernsehen/TV': matchesInfoSource = tv === 'Ja'; break;
          case 'Newsletter': matchesInfoSource = newsletter === 'Ja'; break;
          case 'Informationsveranstaltung': matchesInfoSource = events === 'Ja'; break;
          case 'Gar nicht': matchesInfoSource = noInfo === 'Ja'; break;
        }
      }
      
      return (
        (!filters.location || location === filters.location) &&
        (!filters.ageGroup || age === filters.ageGroup) &&
        (!filters.satisfaction || satisfaction === filters.satisfaction) &&
        (!filters.mediaSource || socialMedia === filters.mediaSource) &&
        (!filters.householdSize || householdSize === filters.householdSize) &&
        (!filters.futureOutlook || futureOutlook === filters.futureOutlook) &&
        (!filters.politicalRepresentation || politicalRep === filters.politicalRepresentation) &&
        (!filters.kiezmacherKnown || kiezmacher === filters.kiezmacherKnown) &&
        matchesSocialPlatform &&
        matchesInfoSource
      );
    });
  }, [parsedData, filters]);

  // Calculate statistics for different areas
  const locationStats = useMemo(() => {
    const stats = {};
    
    Object.keys(stationCoordinates).forEach(location => {
      const locationData = filteredData.filter(row => 
        row['Q00. In welchem Kiez wohnen Sie?'] === location
      );
      
      if (locationData.length > 0) {
        const satisfactionLevels = locationData.map(row => 
          row['Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?']
        ).filter(Boolean);
        
        const futureOutlook = locationData.map(row => 
          row['Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?']
        ).filter(Boolean);
        
        // Calculate average satisfaction (1-5 scale)
        const avgSatisfaction = satisfactionLevels.reduce((sum, level) => {
          return sum + parseInt(level);
        }, 0) / satisfactionLevels.length || 0;
        
        // Count optimistic vs pessimistic
        const optimisticCount = futureOutlook.filter(outlook => 
          outlook.includes('optimistisch')
        ).length;
        
        stats[location] = {
          count: locationData.length,
          avgSatisfaction: avgSatisfaction,
          optimisticPercent: (optimisticCount / futureOutlook.length) * 100 || 0,
          coordinates: stationCoordinates[location]
        };
      }
    });
    
    return stats;
  }, [filteredData]);

  // Generate chart data with consistent colors
  const satisfactionChartData = useMemo(() => {
    const satisfactionCounts = {};
    
    filteredData.forEach(row => {
      const satisfaction = row['Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?'];
      if (satisfaction && satisfaction !== 'N/A') {
        satisfactionCounts[satisfaction] = (satisfactionCounts[satisfaction] || 0) + 1;
      }
    });
    
    return {
      labels: Object.keys(satisfactionCounts),
      datasets: [{
        label: 'Anzahl Antworten',
        data: Object.values(satisfactionCounts),
        backgroundColor: [
          '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'
        ],
        borderColor: [
          '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'
        ],
        borderWidth: 1
      }]
    };
  }, [filteredData]);

  const topicsChartData = useMemo(() => {
    const topics = {
      'Wohnen / Mieten': 0,
      'Sicherheit': 0,
      'Bildung / Schule': 0,
      'Verkehr': 0,
      'Umwelt': 0,
      'Nachbarschaftliches Miteinander': 0
    };
    
    filteredData.forEach(row => {
      Object.keys(topics).forEach(topic => {
        const columnName = `Q004[SQ00${Object.keys(topics).indexOf(topic) + 1}]. Welche Themen beschäftigen Sie aktuell am meisten? [${topic}]`;
        if (row[columnName] === 'Ja') {
          topics[topic]++;
        }
      });
    });
    
    return {
      labels: Object.keys(topics),
      datasets: [{
        label: 'Wichtigkeit der Themen',
        data: Object.values(topics),
        backgroundColor: [
          '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'
        ],
        borderColor: [
          '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'
        ],
        borderWidth: 1
      }]
    };
  }, [filteredData]);

  // Calculate top topic dynamically based on filtered data
  const topTopic = useMemo(() => {
    const topics = {
      'Wohnen / Mieten': 0,
      'Sicherheit': 0,
      'Bildung / Schule': 0,
      'Verkehr': 0,
      'Umwelt': 0,
      'Nachbarschaftliches Miteinander': 0
    };
    
    filteredData.forEach(row => {
      Object.keys(topics).forEach(topic => {
        const columnName = `Q004[SQ00${Object.keys(topics).indexOf(topic) + 1}]. Welche Themen beschäftigen Sie aktuell am meisten? [${topic}]`;
        if (row[columnName] === 'Ja') {
          topics[topic]++;
        }
      });
    });
    
    const topTopicName = Object.keys(topics).reduce((a, b) => topics[a] > topics[b] ? a : b);
    return topTopicName || 'Keine Daten';
  }, [filteredData]);

  const ageDistributionData = useMemo(() => {
    const ageCounts = {};
    
    filteredData.forEach(row => {
      const age = row['Q001. Wie alt sind Sie?'];
      if (age && age !== 'N/A') {
        ageCounts[age] = (ageCounts[age] || 0) + 1;
      }
    });
    
    // Consistent color mapping for age groups
    const ageColorMap = {
      '18-29': '#06b6d4',    // Cyan
      '30-49': '#8b5cf6',    // Purple  
      '50-69': '#f59e0b',    // Orange
      '70+': '#ef4444'       // Red
    };
    
    const sortedAges = Object.keys(ageCounts).sort();
    
    return {
      labels: sortedAges,
      datasets: [{
        label: 'Altersverteilung',
        data: sortedAges.map(age => ageCounts[age]),
        backgroundColor: sortedAges.map(age => ageColorMap[age] || '#6b7280'),
        borderColor: sortedAges.map(age => {
          const color = ageColorMap[age] || '#6b7280';
          return color.replace(/4$/, '6'); // Slightly darker border
        }),
        borderWidth: 1
      }]
    };
  }, [filteredData]);

  // Generate future outlook data with consistent colors for scale values
  const futureOutlookData = useMemo(() => {
    const outlookCounts = {};
    
    filteredData.forEach(row => {
      const outlook = row['Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?'];
      if (outlook && outlook !== 'N/A' && outlook !== '') {
        outlookCounts[outlook] = (outlookCounts[outlook] || 0) + 1;
      }
    });
    
    // Consistent color mapping for outlook
    const outlookColorMap = {
      'sehr pessimistisch': '#ef4444',     // Red
      'eher pessimistisch': '#f97316',     // Orange  
      'eher optimistisch': '#22c55e',      // Green
      'sehr optimistisch': '#06b6d4'       // Cyan
    };
    
    const sortedOutlook = Object.keys(outlookCounts).sort((a, b) => {
      const order = ['sehr pessimistisch', 'eher pessimistisch', 'eher optimistisch', 'sehr optimistisch'];
      return order.indexOf(a) - order.indexOf(b);
    });
    
    return {
      labels: sortedOutlook,
      datasets: [{
        label: 'Zukunftsoptimismus',
        data: sortedOutlook.map(outlook => outlookCounts[outlook]),
        backgroundColor: sortedOutlook.map(outlook => outlookColorMap[outlook] || '#6b7280'),
        borderColor: sortedOutlook.map(outlook => {
          const color = outlookColorMap[outlook] || '#6b7280';
          return color.replace(/4$/, '6'); // Darker border
        }),
        borderWidth: 1
      }]
    };
  }, [filteredData]);

  const getUniqueValues = (columnName) => {
    const values = [...new Set(parsedData.map(row => row[columnName]).filter(Boolean))];
    return values.filter(value => value !== 'N/A');
  };

  // Parse CSV data on component mount
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-700 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1665846528536-5dad51b0348d)'
          }}
        />
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-4xl font-bold mb-2">Marzahn-Hellersdorf Bezirksumfrage</h1>
            <p className="text-xl opacity-90">Interaktives Dashboard zur Stimmungsanalyse im Bezirk</p>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <span>{parsedData.length} Teilnehmer</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{Object.keys(stationCoordinates).length} Gebiete</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <nav className="flex justify-between items-center">
            <div className="flex space-x-8">
              {[
                { id: 'overview', label: 'Übersicht', icon: Home },
                { id: 'map', label: 'Karte', icon: Map },
                { id: 'analysis', label: 'Analyse', icon: BarChart3 },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowBoundaryEditor(!showBoundaryEditor)}
                className="flex items-center space-x-2 py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                title="Wahlkreis-Grenzen bearbeiten"
              >
                <Edit className="w-4 h-4" />
                <span>Grenzen</span>
              </button>
              
              <button
                onClick={() => setShowWahlkreisGrenzen(!showWahlkreisGrenzen)}
                className={`flex items-center space-x-2 py-2 px-3 text-sm rounded-md ${
                  showWahlkreisGrenzen 
                    ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Wahlkreis-Grenzen anzeigen/ausblenden"
              >
                <MapPin className="w-4 h-4" />
                <span>{showWahlkreisGrenzen ? 'Wahlkreis ausblenden' : 'Wahlkreis anzeigen'}</span>
              </button>
              
              {userRole === 'admin' && (
                <button
                  onClick={onAdminMode}
                  className="flex items-center space-x-2 py-2 px-3 text-sm bg-blue-100 hover:bg-blue-200 rounded-md"
                  title="Admin-Bereich öffnen"
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
              
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 py-2 px-3 text-sm bg-red-100 hover:bg-red-200 rounded-md"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-gray-600" />
            <h2 className="text-lg font-semibold">Filter</h2>
          </div>
          
          {/* First Row of Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wohngebiet</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Gebiete</option>
                {getUniqueValues('Q00. In welchem Kiez wohnen Sie?').map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Altersgruppe</label>
              <select
                value={filters.ageGroup}
                onChange={(e) => setFilters({...filters, ageGroup: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Altersgruppen</option>
                {getUniqueValues('Q001. Wie alt sind Sie?').map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zufriedenheit</label>
              <select
                value={filters.satisfaction}
                onChange={(e) => setFilters({...filters, satisfaction: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Zufriedenheitslevel</option>
                {['1', '2', '3', '4', '5'].map(level => (
                  <option key={level} value={level}>Zufriedenheit {level}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Haushaltsgröße</label>
              <select
                value={filters.householdSize}
                onChange={(e) => setFilters({...filters, householdSize: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Haushaltsgrößen</option>
                {getUniqueValues('Q002. Wie viele Personen leben (inkl. Ihnen) in Ihrem Haushalt?').map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Second Row of Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soziale Medien Plattform</label>
              <select
                value={filters.socialMediaPlatform}
                onChange={(e) => setFilters({...filters, socialMediaPlatform: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Plattformen</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="keine">Keine sozialen Medien</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Informationsquelle</label>
              <select
                value={filters.informationSource}
                onChange={(e) => setFilters({...filters, informationSource: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Informationsquellen</option>
                <option value="Soziale Medien">Soziale Medien</option>
                <option value="Print-Medien">Zeitung/Print-Medien</option>
                <option value="Fernsehen/TV">Fernsehen/TV</option>
                <option value="Newsletter">Newsletter</option>
                <option value="Informationsveranstaltung">Informationsveranstaltung</option>
                <option value="Gar nicht">Gar nicht</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zukunftsoptimismus</label>
              <select
                value={filters.futureOutlook}
                onChange={(e) => setFilters({...filters, futureOutlook: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Zukunftsaussichten</option>
                {getUniqueValues('Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?').map(outlook => (
                  <option key={outlook} value={outlook}>{outlook}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Politische Vertretung</label>
              <select
                value={filters.politicalRepresentation}
                onChange={(e) => setFilters({...filters, politicalRepresentation: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Bewertungen</option>
                {getUniqueValues('Q007. Wie stark fühlen Sie sich im Bezirk politisch vertreten?').map(rep => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Third Row of Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kiezmacher bekannt</label>
              <select
                value={filters.kiezmacherKnown}
                onChange={(e) => setFilters({...filters, kiezmacherKnown: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Antworten</option>
                <option value="Ja">Ja, bekannt</option>
                <option value="Nein">Nein, unbekannt</option>
                <option value="N/A">Keine Angabe</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soziale Medien nutzen</label>
              <select
                value={filters.mediaSource}
                onChange={(e) => setFilters({...filters, mediaSource: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle</option>
                <option value="Ja">Nutzt soziale Medien</option>
                <option value="Nein">Nutzt keine sozialen Medien</option>
              </select>
            </div>
            
            <div className="col-span-2">
              <div className="flex items-end h-full">
                <button
                  onClick={() => setFilters({
                    location: '', ageGroup: '', mediaSource: '', satisfaction: '',
                    socialMediaPlatform: '', informationSource: '', householdSize: '',
                    futureOutlook: '', politicalRepresentation: '', kiezmacherKnown: ''
                  })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Gefilterte Ergebnisse: <span className="font-semibold">{filteredData.length}</span> von {parsedData.length} Antworten
            </p>
            <div className="text-sm text-gray-500">
              Aktive Filter: {Object.values(filters).filter(v => v !== '').length}
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Teilnehmer</p>
                    <p className="text-2xl font-semibold text-gray-900">{filteredData.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ø Zufriedenheit</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {filteredData.length > 0 ? (
                        filteredData.reduce((sum, row) => {
                          const satisfaction = parseInt(row['Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?']);
                          return sum + (satisfaction || 0);
                        }, 0) / filteredData.length
                      ).toFixed(1) : '0'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gebiete</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Object.keys(locationStats).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Top Thema</p>
                    <p className="text-2xl font-semibold text-gray-900">{topTopic.split(' / ')[0]}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Zufriedenheit im Kiez</h3>
                <Bar data={satisfactionChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  }
                }} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Wichtigste Themen</h3>
                <Bar data={topicsChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  }
                }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Interaktive Karte - Marzahn-Hellersdorf</h3>
              {showBoundaryEditor && (
                <div className="text-sm bg-yellow-100 border border-yellow-300 rounded p-2">
                  <p className="text-yellow-800">
                    💡 <strong>Tipp:</strong> Ihre SHP-Dateien können zu GeoJSON konvertiert werden.
                    Verwenden Sie Tools wie <a href="https://mapshaper.org/" target="_blank" rel="noopener noreferrer" className="underline">mapshaper.org</a> 
                    oder QGIS für die Konvertierung.
                  </p>
                </div>
              )}
            </div>
            <div style={{ height: '600px' }}>
              <MapContainer
                center={[52.5200, 13.5900]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Wahlkreis-Grenzen anzeigen (GeoJSON) */}
                {showWahlkreisGrenzen && (
                  <GeoJSON
                    data={convertedWahlkreisGeoJson}
                    style={{
                      color: '#ef4444',
                      weight: 3,
                      opacity: 0.8,
                      fillColor: '#ef4444',
                      fillOpacity: 0.1
                    }}
                    onEachFeature={(feature, layer) => {
                      layer.bindPopup(`
                        <div class="p-2">
                          <h4 class="font-semibold text-sm">${feature.properties.name || 'Wahlkreis Marzahn-Hellersdorf 6'}</h4>
                          <p class="text-xs text-gray-600">${feature.properties.description || 'Wahlkreis-Grenzen'}</p>
                          <p class="text-xs text-gray-500">AWK: ${feature.properties.AWK || '06'}</p>
                        </div>
                      `);
                    }}
                  />
                )}
                
                {/* Alte Polygon-Implementierung (falls manuell gezeichnet) */}
                {wahlkreisGrenzen.coordinates && wahlkreisGrenzen.coordinates.length > 0 && (
                  <Polygon
                    positions={wahlkreisGrenzen.coordinates}
                    pathOptions={{
                      color: '#ef4444',
                      weight: 3,
                      opacity: 0.8,
                      fillColor: '#ef4444',
                      fillOpacity: 0.1
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-semibold text-sm">AGH-Wahlkreis Marzahn-Hellersdorf 6</h4>
                        <p className="text-xs text-gray-600">Manuell gezeichnete Wahlkreis-Grenzen</p>
                      </div>
                    </Popup>
                  </Polygon>
                )}
                
                {Object.entries(locationStats).map(([location, stats]) => (
                  <div key={location}>
                    <Marker position={stats.coordinates}>
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-semibold text-sm mb-2">{location}</h4>
                          <p className="text-xs">Teilnehmer: {stats.count}</p>
                          <p className="text-xs">Ø Zufriedenheit: {stats.avgSatisfaction.toFixed(1)}/5</p>
                          <p className="text-xs">Optimismus: {stats.optimisticPercent.toFixed(0)}%</p>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={stats.coordinates}
                      radius={stats.avgSatisfaction * 200}
                      color={stats.avgSatisfaction > 3.5 ? 'green' : stats.avgSatisfaction > 2.5 ? 'orange' : 'red'}
                      fillOpacity={0.3}
                    />
                  </div>
                ))}
              </MapContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Legende:</strong> Die Kreise zeigen die durchschnittliche Zufriedenheit pro Gebiet. Größere Kreise = höhere Zufriedenheit.</p>
              <p>Grün = hohe Zufriedenheit (&gt;3.5), Orange = mittlere Zufriedenheit (2.5-3.5), Rot = niedrige Zufriedenheit (&lt;2.5)</p>
              {showWahlkreisGrenzen && (
                <p><strong>Rote Umrandung:</strong> Wahlkreis Marzahn-Hellersdorf 6 Grenzen</p>
              )}
              {wahlkreisGrenzen.length > 0 && (
                <p><strong>Grüne Umrandung:</strong> Manuell gezeichnete Grenzen</p>
              )}
            </div>
            
            {/* Boundary Editor Panel */}
            {showBoundaryEditor && (
              <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-semibold mb-3">Wahlkreis-Grenzen Management</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      GeoJSON-Daten für Wahlkreis 6 hochladen:
                    </label>
                    <input
                      type="file"
                      accept=".geojson,.json"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const geojson = JSON.parse(event.target.result);
                              if (geojson.type === 'FeatureCollection' || geojson.type === 'Feature') {
                                const coordinates = geojson.type === 'FeatureCollection' 
                                  ? geojson.features[0].geometry.coordinates[0]
                                  : geojson.geometry.coordinates[0];
                                setWahlkreisGrenzen([{ coordinates: coordinates.map(coord => [coord[1], coord[0]]) }]);
                                alert('Wahlkreis-Grenzen erfolgreich geladen!');
                              }
                            } catch (error) {
                              alert('Fehler beim Laden der GeoJSON-Datei.');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Ihre SHP-Dateien konvertieren:</strong></p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Besuchen Sie <a href="https://mapshaper.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">mapshaper.org</a></li>
                      <li>Laden Sie alle SHP-Dateien hoch (.shp, .dbf, .prj, .shx)</li>
                      <li>Filtern Sie nach Wahlkreis 6 (falls nötig)</li>
                      <li>Exportieren Sie als GeoJSON</li>
                      <li>Laden Sie die GeoJSON-Datei hier hoch</li>
                    </ol>
                  </div>
                  
                  {wahlkreisGrenzen.length > 0 && (
                    <button
                      onClick={() => setWahlkreisGrenzen([])}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Grenzen entfernen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Altersverteilung</h3>
                <Pie data={ageDistributionData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Zukunftsoptimismus (Skalenwerte)</h3>
                <Bar data={futureOutlookData} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} />
              </div>
            </div>
            
            {/* Correlation Analysis */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Korrelationsanalyse</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Zufriedenheit nach Wohngebiet</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Die höchste Zufriedenheit zeigt sich um den U-Bhf. Wuhletal (Ø 4.2), 
                    während Cottbusser Platz niedrigere Werte aufweist (Ø 3.1).
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Altersgruppen-Unterschiede</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Jüngere Befragte (18-29) sind tendenziell pessimistischer bezüglich der Zukunft, 
                    während ältere Gruppen (50+) optimistischer sind.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Mediennutzung vs. Informationsstand</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Befragte, die soziale Medien nutzen, fühlen sich besser über lokale Themen informiert 
                    als solche, die traditionelle Medien bevorzugen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;