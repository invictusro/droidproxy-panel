import { useState } from 'react';
import { Plus, Trash2, Copy, Check, Clock } from 'lucide-react';
import type { PhoneWithStatus, ConnectionCredential, CredentialFormData, ProxyType } from '../types';
import { getProxyTypeLabel, getConnectionStrings } from '../utils';

interface Props {
  phone: PhoneWithStatus;
  credentials: ConnectionCredential[];
  onAddCredential: (data: CredentialFormData) => Promise<void>;
  onDeleteCredential: (credId: string) => void;
  onToggleCredential: (cred: ConnectionCredential) => void;
}

export default function CredentialsSection({
  phone,
  credentials,
  onAddCredential,
  onDeleteCredential,
  onToggleCredential,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [formData, setFormData] = useState<CredentialFormData>({
    name: '',
    auth_type: 'ip',
    proxy_type: 'socks5',
    allowed_ip: '',
    username: '',
    password: '',
    expires_at: '',
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAdd = async () => {
    await onAddCredential(formData);
    setShowAddForm(false);
    setFormData({ name: '', auth_type: 'ip', proxy_type: 'socks5', allowed_ip: '', username: '', password: '', expires_at: '' });
  };

  const isFormValid = formData.name && (formData.auth_type === 'ip' ? formData.allowed_ip : formData.username && formData.password);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Credentials</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Home, Work"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Auth Type</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="ip" checked={formData.auth_type === 'ip'} onChange={() => setFormData({ ...formData, auth_type: 'ip' })} className="mr-2" />
                  IP Whitelist
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="userpass" checked={formData.auth_type === 'userpass'} onChange={() => setFormData({ ...formData, auth_type: 'userpass' })} className="mr-2" />
                  User/Pass
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Proxy Type</label>
              <select value={formData.proxy_type} onChange={(e) => setFormData({ ...formData, proxy_type: e.target.value as ProxyType })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm">
                <option value="socks5">SOCKS5</option>
                <option value="http">HTTP</option>
              </select>
            </div>
            {formData.auth_type === 'ip' ? (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Allowed IP</label>
                <input type="text" value={formData.allowed_ip} onChange={(e) => setFormData({ ...formData, allowed_ip: e.target.value })} placeholder="192.168.1.100" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
                  <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Expires At (optional)</label>
              <input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={!isFormValid} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Add Credential</button>
          </div>
        </div>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">No credentials yet. Add one to enable proxy connections.</div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => (
            <div key={cred.id} className={`p-4 border rounded-xl ${cred.is_active ? 'bg-white border-zinc-200' : 'bg-zinc-50 border-zinc-100 opacity-60'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{cred.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${cred.auth_type === 'ip' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
                    {cred.auth_type === 'ip' ? 'IP' : 'User/Pass'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">{getProxyTypeLabel(cred.proxy_type)}</span>
                  {cred.expires_at && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(cred.expires_at).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onToggleCredential(cred)} className={`px-3 py-1 text-xs rounded-md ${cred.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {cred.is_active ? 'Active' : 'Disabled'}
                  </button>
                  <button onClick={() => onDeleteCredential(cred.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {getConnectionStrings(cred, phone).map((conn, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-12 font-medium">{conn.type}:</span>
                    <code className="flex-1 text-xs bg-zinc-100 px-2 py-1.5 rounded-md font-mono text-zinc-700 truncate">{conn.value}</code>
                    <button onClick={() => copyToClipboard(conn.value, `${cred.id}-${conn.type}`)} className="p-1.5 hover:bg-zinc-100 rounded-lg">
                      {copied === `${cred.id}-${conn.type}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
