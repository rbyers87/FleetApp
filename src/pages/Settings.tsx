import React, { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useAuthStore } from '../stores/authStore';
    import { supabase } from '../lib/supabase';
    import {
      Users,
      Car,
      AlertCircle,
      Search,
      Plus,
      Edit2,
      Trash2,
      Save,
      X
    } from 'lucide-react';

    interface Profile {
      id: string;
      role: 'admin' | 'user';
      full_name: string;
      badge_number: string | null;
      email: string;
    }

    interface Vehicle {
      id: string;
      unit_number: string;
      make: string;
      model: string;
      year: number;
      status: 'available' | 'assigned' | 'out_of_service';
    }

    function Settings() {
      const navigate = useNavigate();
      const { isAdmin } = useAuthStore();
      const [activeTab, setActiveTab] = useState<'users' | 'vehicles'>('users');
      const [profiles, setProfiles] = useState<Profile[]>([]);
      const [vehicles, setVehicles] = useState<Vehicle[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [searchQuery, setSearchQuery] = useState('');
      const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
      const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
      const [showNewUserForm, setShowNewUserForm] = useState(false);
      const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);

      // Form states
      const [newProfile, setNewProfile] = useState({
        email: '',
        full_name: '',
        badge_number: '',
        role: 'user',
        password: ''
      });

      const [newVehicle, setNewVehicle] = useState({
        unit_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear()
      });

      useEffect(() => {
        if (!isAdmin) {
          navigate('/dashboard');
          return;
        }

        if (activeTab === 'users') {
          fetchProfiles();
        } else {
          fetchVehicles();
        }
      }, [activeTab, isAdmin, navigate]);

      async function fetchProfiles() {
        try {
          const { data, error: profilesError } = await supabase
            .from('profiles')
            .select(`
              id,
              role,
              full_name,
              badge_number,
              auth_users (email)
            `)
            .order('full_name');

          if (profilesError) throw profilesError;

          // Transform the data to flatten the email field
          const transformedProfiles = data.map(profile => ({
            ...profile,
            email: profile.auth_users?.email || ''
          }));

          setProfiles(transformedProfiles as Profile[]);
        } catch (err) {
          setError('Failed to fetch profiles');
          console.error('Error:', err);
        } finally {
          setLoading(false);
        }
      }

      async function fetchVehicles() {
        try {
          const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('unit_number');

          if (error) throw error;
          setVehicles(data || []);
        } catch (err) {
          setError('Failed to fetch vehicles');
          console.error('Error:', err);
        } finally {
          setLoading(false);
        }
      }

      async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        try {
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newProfile.email,
            password: newProfile.password,
            options: {
              emailRedirectTo: `${window.location.origin}/login`
            }
          });

          if (authError) throw authError;

          if (authData.user) {
            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([{
                id: authData.user.id,
                role: newProfile.role,
                full_name: newProfile.full_name,
                badge_number: newProfile.badge_number || null
              }]);

            if (profileError) throw profileError;
          }

          setShowNewUserForm(false);
          setNewProfile({
            email: '',
            full_name: '',
            badge_number: '',
            role: 'user',
            password: ''
          });
          fetchProfiles();
        } catch (err) {
          setError('Failed to create user');
          console.error('Error:', err);
        }
      }

      async function handleUpdateProfile(profile: Profile) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              role: profile.role,
              full_name: profile.full_name,
              badge_number: profile.badge_number || null
            })
            .eq('id', profile.id);

          if (error) throw error;

          setEditingProfile(null);
          fetchProfiles();
        } catch (err) {
          setError('Failed to update profile');
          console.error('Error:', err);
        }
      }

      async function handleCreateVehicle(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        try {
          const { error } = await supabase
            .from('vehicles')
            .insert([{
              ...newVehicle,
              status: 'available'
            }]);

          if (error) throw error;

          setShowNewVehicleForm(false);
          setNewVehicle({
            unit_number: '',
            make: '',
            model: '',
            year: new Date().getFullYear()
          });
          fetchVehicles();
        } catch (err) {
          setError('Failed to create vehicle');
          console.error('Error:', err);
        }
      }

      async function handleUpdateVehicle(vehicle: Vehicle) {
        try {
          const { error } = await supabase
            .from('vehicles')
            .update({
              unit_number: vehicle.unit_number,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year
            })
            .eq('id', vehicle.id);

          if (error) throw error;

          setEditingVehicle(null);
          fetchVehicles();
        } catch (err) {
          setError('Failed to update vehicle');
          console.error('Error:', err);
        }
      }

      const filteredProfiles = profiles.filter(profile =>
        profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.badge_number && profile.badge_number.includes(searchQuery))
      );

      const filteredVehicles = vehicles.filter(vehicle =>
        vehicle.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.year.toString().includes(searchQuery)
      );

      if (loading) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`
                  flex items-center px-1 py-4 border-b-2 font-medium text-sm
                  ${activeTab === 'users'
                    ? 'border-blue-800 text-blue-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Users className="w-5 h-5 mr-2" />
                User Management
              </button>
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`
                  flex items-center px-1 py-4 border-b-2 font-medium text-sm
                  ${activeTab === 'vehicles'
                    ? 'border-blue-800 text-blue-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Car className="w-5 h-5 mr-2" />
                Fleet Management
              </button>
            </nav>
          </div>

          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'users' ? 'users' : 'vehicles'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => activeTab === 'users' ? setShowNewUserForm(true) : setShowNewVehicleForm(true)}
              className="ml-4 flex items-center px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add {activeTab === 'users' ? 'User' : 'Vehicle'}
            </button>
          </div>

          {/* Users Tab Content */}
          {activeTab === 'users' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Badge Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProfile?.id === profile.id ? (
                          <input
                            type="text"
                            value={editingProfile.full_name}
                            onChange={(e) => setEditingProfile({
                              ...editingProfile,
                              full_name: e.target.value
                            })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">
                            {profile.full_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{profile.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProfile?.id === profile.id ? (
                          <input
                            type="text"
                            value={editingProfile.badge_number || ''}
                            onChange={(e) => setEditingProfile({
                              ...editingProfile,
                              badge_number: e.target.value
                            })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">
                            {profile.badge_number || '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProfile?.id === profile.id ? (
                          <select
                            value={editingProfile.role}
                            onChange={(e) => setEditingProfile({
                              ...editingProfile,
                              role: e.target.value as 'admin' | 'user'
                            })}
                            className="w-full px-2 py-1 border rounded"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`
                            px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${profile.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                          `}>
                            {profile.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingProfile?.id === profile.id ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleUpdateProfile(editingProfile)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingProfile(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingProfile(profile)}
                            className="text-blue-800 hover:text-blue-900"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vehicles Tab Content */}
          {activeTab === 'vehicles' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Make
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingVehicle?.id === vehicle.id ? (
                          <input
                            type="text"
                            value={editingVehicle.unit_number}
                            onChange={(e) => setEditingVehicle({
                              ...editingVehicle,
                              unit_number: e.target.value
                            })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.unit_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingVehicle?.id === vehicle.id ? (
                          <input
                            type="text"
                            value={editingVehicle.make}
                            onChange={(e) => setEditingVehicle({
                              ...editingVehicle,
                              make: e.target.value
                            })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{vehicle.make}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingVehicle?.id === vehicle.id ? (
                          <input
                            type="text"
                            value={editingVehicle.model}
                            onChange={(e) => setEditingVehicle({
                              ...editingVehicle,
                              model: e.target.value
                            })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{vehicle.model}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingVehicle?.id === vehicle.id ? (
                          <input
                            type="number"
                            value={editingVehicle.year}
                            onChange={(e) => setEditingVehicle({
                              ...editingVehicle,
                              year: parseInt(e.target.value)
                            })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{vehicle.year}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingVehicle?.id === vehicle.id ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleUpdateVehicle(editingVehicle)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingVehicle(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingVehicle(vehicle)}
                            className="text-blue-800 hover:text-blue-900"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New User Modal */}
          {showNewUserForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-md mx-4">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                    <button
                      onClick={() => setShowNewUserForm(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={newProfile.email}
                      onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newProfile.full_name}
                      onChange={(e) => setNewProfile({ ...newProfile, full_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Badge Number
                    </label>
                    <input
                      type="text"
                      value={newProfile.badge_number}
                      onChange={(e) => setNewProfile({ ...newProfile, badge_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={newProfile.role}
                      onChange={(e) => setNewProfile({ ...newProfile, role: e.target.value as 'admin' | 'user' })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newProfile.password}
                      onChange={(e) => setNewProfile({ ...newProfile, password: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewUserForm(false)}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* New Vehicle Modal */}
          {showNewVehicleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-md mx-4">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Vehicle</h2>
                    <button
                      onClick={() => setShowNewVehicleForm(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newVehicle.unit_number}
                      onChange={(e) => setNewVehicle({ ...newVehicle, unit_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make
                    </label>
                    <input
                      type="text"
                      required
                      value={newVehicle.make}
                      onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      required
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewVehicleForm(false)}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Vehicle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    export default Settings;
