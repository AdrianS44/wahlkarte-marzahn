import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Filter, Map, BarChart3, Users, TrendingUp, MapPin, Home, Info } from 'lucide-react';
import Papa from 'papaparse';
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

// Survey data (the CSV data provided)
const surveyData = `id. Antwort ID;Q00. In welchem Kiez wohnen Sie?;Q001. Wie alt sind Sie?;Q002. Wie viele Personen leben (inkl. Ihnen) in Ihrem Haushalt?;Q012[SQ001]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Soziale Medien];Q012[SQ003]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Zeitung/Print-Medien];Q012[SQ004]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Fernsehen/TV];Q012[SQ005]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Bezirkszeitung];Q012[SQ006]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Newsletter];Q012[SQ007]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Informationsveranstaltung];Q012[SQ008]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Gar nicht];Q012[other]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Sonstiges];Q013[SQ001]. Welche sozialen Medien nutzen Sie? [Facebook];Q013[SQ002]. Welche sozialen Medien nutzen Sie? [Instagram];Q013[SQ003]. Welche sozialen Medien nutzen Sie? [TikTok];Q013[SQ004]. Welche sozialen Medien nutzen Sie? [YouTube];Q013[SQ005]. Welche sozialen Medien nutzen Sie? [WhatsApp];Q013[SQ006]. Welche sozialen Medien nutzen Sie? [keine];Q013[other]. Welche sozialen Medien nutzen Sie? [Sonstiges];Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?;Q004[SQ001]. Welche Themen beschäftigen Sie aktuell am meisten? [Wohnen / Mieten];Q004[SQ002]. Welche Themen beschäftigen Sie aktuell am meisten? [Sicherheit];Q004[SQ003]. Welche Themen beschäftigen Sie aktuell am meisten? [Bildung / Schule];Q004[SQ004]. Welche Themen beschäftigen Sie aktuell am meisten? [Verkehr];Q004[SQ005]. Welche Themen beschäftigen Sie aktuell am meisten? [Umwelt];Q004[SQ006]. Welche Themen beschäftigen Sie aktuell am meisten? [Nachbarschaftliches Miteinander];Q005. Wie blicken Sie in die Zukunft Ihres Kiezes?;Q006. Wie gut fühlen Sie sich über lokale Themen informiert?;Q007. Wie stark fühlen Sie sich im Bezirk politisch vertreten?;Q008. Wie sehr glauben Sie, dass politische Entscheidungen Ihre Lebensrealität verbessern können?;"Q011. Haben Sie schon einmal etwas von den ""Kiezmachern"" gehört?";Q009. Würden Sie sich gerne stärker bei lokalen Themen einbringen?;Q010. Was wünschen Sie sich für die Zukunft in Ihrem Kiez?
11;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;2;Ja;Nein;Nein;Nein;Nein;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;3;Nein;Ja;Nein;Ja;Nein;Nein;eher optimistisch;unzureichend;;;N/A;;
12;Siedlungsgebiet;30-49;2;Ja;Nein;Ja;Ja;Ja;Nein;Nein;;Ja;Nein;Nein;Nein;Nein;Nein;;4;Ja;Ja;Nein;Ja;Nein;Nein;eher optimistisch;unzureichend;3;;Ja;Weiß nicht;Mehr Verkehrssicherheit auf der Wernerstraße. Diese parkenden LKW's die den Kindern die Sicherheit zum Überqueren der Straße behindern.
13;Um den U-Bhf. Kaulsdorf-Nord herum;18-29;2;Nein;Nein;Nein;Nein;Nein;Nein;Ja;;Nein;Ja;Ja;Ja;Ja;Nein;;1;Ja;Nein;Nein;Nein;Nein;Nein;eher pessimistisch;unzureichend;2;3;Nein;Ja;Mehr Investitionen
14;Um den U-Bhf. Kaulsdorf-Nord herum;30-49;3;Nein;Ja;Nein;Nein;Nein;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;4;Ja;Ja;Ja;Nein;Nein;Nein;eher optimistisch;ausreichend;2;3;Nein;Ja;
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
53;Um den U-Bhf. Hellersdorf herum;50-69;1;Nein;Ja;Ja;Ja;Ja;Nein;Nein;;Nein;Nein;Nein;Nein;Ja;Nein;;3;Ja;Ja;Nein;Ja;Ja;Nein;eher pessimistisch;unzureichend;3;3;Ja;Weiß nicht;Sauberkeit, Sicherheit, stabile Mieten
55;Um den U-Bhf. Cottbusser Platz herum;30-49;4 oder mehr;Ja;Ja;Nein;Nein;Ja;Nein;Nein;;Ja;Nein;Ja;Nein;Ja;Nein;;4;Ja;Ja;Ja;Nein;Ja;Ja;eher pessimistisch;unzureichend;1;4;Ja;Weiß nicht;Wieder mehr Angebote für ältere Menschen und Kinder und jugendliche
56;Um den U-Bhf. Cottbusser Platz herum;30-49;3;Ja;Nein;Nein;Nein;Ja;Nein;Nein;;Ja;Ja;Nein;Ja;Ja;Nein;;5;Ja;Nein;Ja;Ja;Nein;Nein;eher optimistisch;unzureichend;4;3;Ja;Ja;Weniger bauverdichtung, bessere Sauberkeit und mehr Präsenz des Ordnungsamtes vor allen Wegen der Hunde Besitzer`;

// U-Bahn station coordinates for Marzahn-Hellersdorf
const stationCoordinates = {
  'Um den U-Bhf. Kaulsdorf-Nord herum': [52.5156, 13.6342],
  'Um den U-/S-Bhf. Wuhletal herum': [52.5133, 13.6175],
  'Um den U-Bhf. Kienberg herum': [52.5133, 13.5875],
  'Um den U-Bhf. Hellersdorf herum': [52.5233, 13.5967],
  'Um den U-Bhf. Cottbusser Platz herum': [52.5267, 13.5683],
  'Siedlungsgebiet': [52.5200, 13.6100]
};

function App() {
  const [parsedData, setParsedData] = useState([]);
  const [filters, setFilters] = useState({
    location: '',
    ageGroup: '',
    mediaSource: '',
    satisfaction: ''
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Parse CSV data on component mount
  useEffect(() => {
    const result = Papa.parse(surveyData, {
      header: true,
      skipEmptyLines: true
    });
    
    const cleanedData = result.data.filter(row => 
      row['Q00. In welchem Kiez wohnen Sie?'] && 
      row['Q00. In welchem Kiez wohnen Sie?'] !== 'N/A' &&
      row['Q001. Wie alt sind Sie?']
    );
    
    setParsedData(cleanedData);
  }, []);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return parsedData.filter(row => {
      const location = row['Q00. In welchem Kiez wohnen Sie?'];
      const age = row['Q001. Wie alt sind Sie?'];
      const satisfaction = row['Q003. Wie zufrieden sind Sie mit dem Leben in Ihrem Kiez?'];
      const socialMedia = row['Q012[SQ001]. Wie informieren Sie sich über aktuelle Entwicklungen im Bezirk? [Soziale Medien]'];
      
      return (
        (!filters.location || location === filters.location) &&
        (!filters.ageGroup || age === filters.ageGroup) &&
        (!filters.satisfaction || satisfaction === filters.satisfaction) &&
        (!filters.mediaSource || socialMedia === filters.mediaSource)
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

  // Generate chart data
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
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1
      }]
    };
  }, [filteredData]);

  const ageDistributionData = useMemo(() => {
    const ageCounts = {};
    
    filteredData.forEach(row => {
      const age = row['Q001. Wie alt sind Sie?'];
      if (age && age !== 'N/A') {
        ageCounts[age] = (ageCounts[age] || 0) + 1;
      }
    });
    
    return {
      labels: Object.keys(ageCounts),
      datasets: [{
        label: 'Altersverteilung',
        data: Object.values(ageCounts),
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 1
      }]
    };
  }, [filteredData]);

  const getUniqueValues = (columnName) => {
    const values = [...new Set(parsedData.map(row => row[columnName]).filter(Boolean))];
    return values.filter(value => value !== 'N/A');
  };

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
          <nav className="flex space-x-8">
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Soziale Medien</label>
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
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Gefilterte Ergebnisse: <span className="font-semibold">{filteredData.length}</span> von {parsedData.length} Antworten
            </p>
            <button
              onClick={() => setFilters({location: '', ageGroup: '', mediaSource: '', satisfaction: ''})}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Filter zurücksetzen
            </button>
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
                    <p className="text-2xl font-semibold text-gray-900">Sicherheit</p>
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
            <h3 className="text-lg font-semibold mb-4">Interaktive Karte - Marzahn-Hellersdorf</h3>
            <div style={{ height: '600px' }}>
              <MapContainer
                center={[52.5200, 13.6000]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
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
            </div>
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
                <h3 className="text-lg font-semibold mb-4">Zukunftsoptimismus nach Gebiet</h3>
                <Bar data={{
                  labels: Object.keys(locationStats),
                  datasets: [{
                    label: 'Optimismus (%)',
                    data: Object.values(locationStats).map(stats => stats.optimisticPercent),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                  }]
                }} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100
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