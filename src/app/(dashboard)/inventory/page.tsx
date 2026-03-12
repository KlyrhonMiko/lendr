'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Equipment {
  item_id: string;
  name: string;
  category: string;
  total_qty: number;
  available_qty: number;
  condition: string;
  status_condition?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    total_qty: 0,
    available_qty: 0,
    condition: 'GOOD',
  });

  useEffect(() => {
    fetchEquipment();
  }, [search]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await api.get<Equipment[]>('/inventory/items');
      setItems(res.data);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      total_qty: 0,
      available_qty: 0,
      condition: 'GOOD',
    });
    setEditingItem(null);
    setIsModalOpen(false);
    setError(null);
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      total_qty: item.total_qty,
      available_qty: item.available_qty,
      condition: item.condition,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingItem) {
        await api.patch(`/inventory/items/${editingItem.item_id}`, formData);
      } else {
        await api.post('/inventory/items', formData);
      }
      resetForm();
      fetchEquipment();
    } catch (err: any) {
      setError(err.message || 'Failed to save equipment');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await api.delete(`/inventory/items/${itemId}`);
      fetchEquipment();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Inventory Management</h1>
          <p className="text-muted-foreground text-lg">Add, edit, and track your equipment catalog.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Equipment Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Available / Total</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="font-medium">Loading inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.item_id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">ID: {item.item_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-muted-foreground">
                    {item.category}
                  </td>
                  <td className="p-4">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      item.condition === 'GOOD' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                      item.condition === 'DAMAGED' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                      {item.condition}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.status_condition === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' :
                      item.status_condition === 'LOW_STOCK' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-rose-500/10 text-rose-500'
                    }`}>
                      {item.status_condition}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">
                    <span className="text-foreground">{item.available_qty}</span>
                    <span className="text-muted-foreground"> / {item.total_qty}</span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(item)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.item_id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground font-medium">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No items found in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-xl font-bold font-heading">{editingItem ? 'Edit Equipment' : 'Add New Equipment'}</h2>
              <button onClick={resetForm} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Equipment Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all"
                  placeholder="e.g. Dell Latitude Laptop"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <input
                    required
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all"
                    placeholder="IT Equipment"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all cursor-pointer"
                  >
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Total Quantity</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.total_qty}
                    onChange={(e) => setFormData({ ...formData, total_qty: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Available Quantity</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max={formData.total_qty}
                    value={formData.available_qty}
                    onChange={(e) => setFormData({ ...formData, available_qty: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/25">
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
