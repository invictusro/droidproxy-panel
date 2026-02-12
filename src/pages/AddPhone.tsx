import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Server, Signal, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { useCreatePhone } from '../hooks/usePhones';
import QRCodeModal from '../components/QRCodeModal';
import type { Server as ServerType, PhoneWithPairing } from '../types';

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  'US': '🇺🇸',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'UK': '🇬🇧',
  'GB': '🇬🇧',
  'United Kingdom': '🇬🇧',
  'DE': '🇩🇪',
  'Germany': '🇩🇪',
  'FR': '🇫🇷',
  'France': '🇫🇷',
  'NL': '🇳🇱',
  'Netherlands': '🇳🇱',
  'CA': '🇨🇦',
  'Canada': '🇨🇦',
  'AU': '🇦🇺',
  'Australia': '🇦🇺',
  'JP': '🇯🇵',
  'Japan': '🇯🇵',
  'SG': '🇸🇬',
  'Singapore': '🇸🇬',
  'IN': '🇮🇳',
  'India': '🇮🇳',
  'BR': '🇧🇷',
  'Brazil': '🇧🇷',
  'RO': '🇷🇴',
  'Romania': '🇷🇴',
};

const regions: Record<string, string[]> = {
  'All Regions': [],
  'North America': ['US', 'USA', 'United States', 'CA', 'Canada'],
  'Europe': ['UK', 'GB', 'United Kingdom', 'DE', 'Germany', 'FR', 'France', 'NL', 'Netherlands', 'RO', 'Romania'],
  'Asia Pacific': ['JP', 'Japan', 'SG', 'Singapore', 'AU', 'Australia', 'IN', 'India'],
  'South America': ['BR', 'Brazil'],
};

function getFlag(location: string): string {
  for (const [key, flag] of Object.entries(countryFlags)) {
    if (location.includes(key)) return flag;
  }
  return '🌍';
}

function getRegion(location: string): string {
  for (const [region, countries] of Object.entries(regions)) {
    if (region === 'All Regions') continue;
    if (countries.some(c => location.includes(c))) return region;
  }
  return 'Other';
}

export default function AddPhone() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [serverId, setServerId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [createdPhone, setCreatedPhone] = useState<PhoneWithPairing | null>(null);

  const { data: servers, isLoading: loadingServers } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await api.getServers();
      return response.data.servers as ServerType[];
    },
  });

  const filteredServers = useMemo(() => {
    if (!servers) return [];
    const activeServers = servers.filter(s => s.is_active);
    if (selectedRegion === 'All Regions') return activeServers;
    return activeServers.filter(s => getRegion(s.location) === selectedRegion);
  }, [servers, selectedRegion]);

  const createPhone = useCreatePhone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serverId) return;

    try {
      const result = await createPhone.mutateAsync({ name, hub_server_id: serverId });
      console.log('========== PHONE CREATED ==========');
      console.log('QR Code Data:', result.qr_code_data);
      console.log('Parsed QR:', JSON.parse(result.qr_code_data));
      console.log('====================================');
      setCreatedPhone(result);
    } catch (error) {
      console.error('Failed to create phone:', error);
    }
  };

  const handleCloseModal = () => {
    setCreatedPhone(null);
    navigate('/phones');
  };

  const selectedServer = servers?.find(s => s.id === serverId);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Phone</h1>

      <form onSubmit={handleSubmit}>
        {/* Phone Name */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Pixel 8, iPhone 15, Samsung S24..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            Give your phone a name to easily identify it in the dashboard
          </p>
        </div>

        {/* Server Selection */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Server Location
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose a server closest to where your phone is located for best performance
              </p>
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.keys(regions).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {loadingServers ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No servers available in this region</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredServers.map(server => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => setServerId(server.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                    serverId === server.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Flag */}
                    <span className="text-3xl">{getFlag(server.location)}</span>

                    {/* Server Info */}
                    <div>
                      <div className="font-medium text-gray-900">{server.name}</div>
                      <div className="flex items-center text-sm text-gray-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {server.location}
                      </div>
                    </div>
                  </div>

                  {/* Status & Selection */}
                  <div className="flex items-center space-x-3">

                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      serverId === server.id
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-gray-300'
                    }`}>
                      {serverId === server.id && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Summary */}
        {selectedServer && name && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-emerald-800">
              <span className="text-2xl mr-3">{getFlag(selectedServer.location)}</span>
              <div>
                <div className="font-medium">Ready to create "{name}"</div>
                <div className="text-sm text-emerald-600">
                  Connected via {selectedServer.name} ({selectedServer.location})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/phones')}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPhone.isPending || !name || !serverId}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            {createPhone.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                Create Phone
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {createdPhone && (
        <QRCodeModal
          isOpen={true}
          onClose={handleCloseModal}
          qrData={createdPhone.qr_code_data}
          phoneName={createdPhone.phone.name}
          pin={createdPhone.pairing_pin}
        />
      )}
    </div>
  );
}
