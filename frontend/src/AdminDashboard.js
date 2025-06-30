import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Download, Upload, LogOut, Save, X, Users, UserPlus } from 'lucide-react';

const AdminDashboard = ({ token, onLogout }) => {
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [formData, setFormData] = useState({
    location: '',
    age_group: '',
    household_size: '',
    satisfaction: '',
    future_outlook: '',
    topics_housing: '',
    topics_security: '',
    topics_education: '',
    topics_traffic: '',
    topics_environment: '',
    topics_community: '',
    social_media_usage: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    whatsapp: '',
    political_representation: '',
    kiezmacher_known: '',
    engagement_wish: '',
    future_wishes: ''
  });

  const locations = [
    'Um den U-Bhf. Kaulsdorf-Nord herum',
    'Um den U-/S-Bhf. Wuhletal herum',
    'Um den U-Bhf. Kienberg herum',
    'Um den U-Bhf. Hellersdorf herum',
    'Um den U-Bhf. Cottbusser Platz herum',
    'Siedlungsgebiet'
  ];

  const ageGroups = ['18-29', '30-49', '50-69', '70+'];
  const householdSizes = ['1', '2', '3', '4 oder mehr'];
  const satisfactionLevels = ['1', '2', '3', '4', '5'];
  const futureOutlookOptions = ['sehr pessimistisch', 'eher pessimistisch', 'eher optimistisch', 'sehr optimistisch'];
  const yesNoOptions = ['Ja', 'Nein'];

  useEffect(() => {
    fetchSurveyResponses();
  }, []);

  const fetchSurveyResponses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/survey-responses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSurveyResponses(data);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingResponse 
      ? `${process.env.REACT_APP_BACKEND_URL}/api/survey-responses/${editingResponse._id}`
      : `${process.env.REACT_APP_BACKEND_URL}/api/survey-responses`;
    
    const method = editingResponse ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSurveyResponses();
        resetForm();
        alert(editingResponse ? 'Antwort aktualisiert!' : 'Neue Antwort hinzugefügt!');
      }
    } catch (error) {
      console.error('Error saving response:', error);
      alert('Fehler beim Speichern!');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Antwort löschen möchten?')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/survey-responses/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          fetchSurveyResponses();
          alert('Antwort gelöscht!');
        }
      } catch (error) {
        console.error('Error deleting response:', error);
        alert('Fehler beim Löschen!');
      }
    }
  };

  const handleEdit = (response) => {
    setEditingResponse(response);
    setFormData(response);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      location: '',
      age_group: '',
      household_size: '',
      satisfaction: '',
      future_outlook: '',
      topics_housing: '',
      topics_security: '',
      topics_education: '',
      topics_traffic: '',
      topics_environment: '',
      topics_community: '',
      social_media_usage: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      whatsapp: '',
      political_representation: '',
      kiezmacher_known: '',
      engagement_wish: '',
      future_wishes: ''
    });
    setEditingResponse(null);
    setShowAddForm(false);
  };

  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/import-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchSurveyResponses();
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Fehler beim Importieren!');
    }
  };

  const handleCSVExport = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export-csv`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.csv_data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Fehler beim Exportieren!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Survey Dashboard - Admin</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {surveyResponses.length} Antworten
              </span>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Neue Antwort hinzufügen</span>
          </button>
          
          <label className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>CSV Importieren</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
          
          <button
            onClick={handleCSVExport}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Download className="w-4 h-4" />
            <span>CSV Exportieren</span>
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">
                    {editingResponse ? 'Antwort bearbeiten' : 'Neue Antwort hinzufügen'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wohngebiet
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Bitte wählen</option>
                        {locations.map(location => (
                          <option key={location} value={location}>{location}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Altersgruppe
                      </label>
                      <select
                        value={formData.age_group}
                        onChange={(e) => setFormData({...formData, age_group: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Bitte wählen</option>
                        {ageGroups.map(age => (
                          <option key={age} value={age}>{age}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Haushaltsgröße
                      </label>
                      <select
                        value={formData.household_size}
                        onChange={(e) => setFormData({...formData, household_size: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Bitte wählen</option>
                        {householdSizes.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zufriedenheit (1-5)
                      </label>
                      <select
                        value={formData.satisfaction}
                        onChange={(e) => setFormData({...formData, satisfaction: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Bitte wählen</option>
                        {satisfactionLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zukunftsausblick
                      </label>
                      <select
                        value={formData.future_outlook}
                        onChange={(e) => setFormData({...formData, future_outlook: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Bitte wählen</option>
                        {futureOutlookOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kiezmacher bekannt?
                      </label>
                      <select
                        value={formData.kiezmacher_known}
                        onChange={(e) => setFormData({...formData, kiezmacher_known: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Bitte wählen</option>
                        {yesNoOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zukunftswünsche
                    </label>
                    <textarea
                      value={formData.future_wishes}
                      onChange={(e) => setFormData({...formData, future_wishes: e.target.value})}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Was wünschen Sie sich für die Zukunft in Ihrem Kiez?"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingResponse ? 'Aktualisieren' : 'Speichern'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Survey Responses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Umfrageantworten</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wohngebiet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zufriedenheit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zukunftsausblick
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {surveyResponses.map((response) => (
                  <tr key={response._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {response.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {response.age_group || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {response.satisfaction || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {response.future_outlook || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {response.created_at ? new Date(response.created_at).toLocaleDateString('de-DE') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(response)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(response._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;