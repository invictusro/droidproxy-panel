import { useState } from 'react';
import { RotateCw, Power, Trash2, MoreVertical, Globe } from 'lucide-react';
import type { PhoneWithStatus } from '../types';

interface PhoneCardProps {
  phone: PhoneWithStatus;
  onRotateIP: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  isRotating?: boolean;
  isRestarting?: boolean;
}

export default function PhoneCard({
  phone,
  onRotateIP,
  onRestart,
  onDelete,
  isRotating,
  isRestarting,
}: PhoneCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      default:
        return 'Pending';
    }
  };

  // Check if IP rotation is available based on rotation_capability
  const canRotateIP = phone.rotation_capability && !phone.rotation_capability.includes('not available');

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(phone.status)}`} />
          <div>
            <h3 className="font-medium text-gray-900">{phone.name}</h3>
            <p className="text-sm text-gray-500">{getStatusText(phone.status)}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10">
              {canRotateIP ? (
                <button
                  onClick={() => {
                    onRotateIP(phone.id);
                    setShowMenu(false);
                  }}
                  disabled={phone.status !== 'online' || isRotating}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 mr-2 ${isRotating ? 'animate-spin' : ''}`} />
                  Rotate IP
                </button>
              ) : (
                <div className="px-4 py-2 text-sm text-gray-400">
                  <div className="flex items-center">
                    <RotateCw className="w-4 h-4 mr-2" />
                    Rotate IP
                  </div>
                  <p className="text-xs mt-1">Set DroidProxy as Digital Assistant on phone to enable</p>
                </div>
              )}
              <button
                onClick={() => {
                  onRestart(phone.id);
                  setShowMenu(false);
                }}
                disabled={isRestarting}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <Power className={`w-4 h-4 mr-2 ${isRestarting ? 'animate-pulse' : ''}`} />
                Restart Proxy
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this phone?')) {
                    onDelete(phone.id);
                  }
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {phone.current_ip && (
          <div className="flex items-center text-sm text-gray-600">
            <Globe className="w-4 h-4 mr-2" />
            <span>IP: {phone.current_ip}</span>
          </div>
        )}
        {phone.hub_server && (
          <div className="text-sm text-gray-600">
            Server: {phone.hub_server.location}
          </div>
        )}
        {phone.last_seen && (
          <div className="text-xs text-gray-400">
            Last seen: {new Date(phone.last_seen).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
