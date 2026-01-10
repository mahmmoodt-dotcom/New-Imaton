
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, ArrowLeft, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../../App';
import { StorageService } from '../../store';
import { Category } from '../../types';

const CategoriesAdmin: React.FC = () => {
  const { lang, t } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    enName: '', arName: '', kuName: '', image: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const cats = await StorageService.getCategories();
        setCategories(cats);
      } catch (err) {
        Logger.error("Failed to fetch categories", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let newCategories = [...categories];
      const categoryData: Category = {
        id: editingId || Date.now().toString(),
        name: { en: formData.enName, ar: formData.arName, ku: formData.kuName },
        image: formData.image || 'https://picsum.photos/400/300'
      };
      if (editingId) {
        newCategories = newCategories.map(c => c.id === editingId ? categoryData : c);
      } else {
        newCategories.push(categoryData);
      }
      
      // Save and receive finalized items with Storage URLs
      const response = await StorageService.saveCategories(newCategories);
      setCategories(response);
      closeModal();
      Logger.info(`Category processed and persisted to Storage.`);
    } catch (err) {
      Logger.error("Failed to save category", err);
      alert("Error saving category. Check your internet connection.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this category?")) {
      const filtered = categories.filter(c => c.id !== id);
      await StorageService.saveCategories(filtered);
      setCategories(filtered);
      Logger.info(`Category deleted: ${id}`);
    }
  };

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({ enName: cat.name.en, arName: cat.name.ar, kuName: cat.name.ku, image: cat.image });
    } else {
      setEditingId(null);
      setFormData({ enName: '', arName: '', kuName: '', image: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingId(null); 
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-container">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-12 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-all">
              <ArrowLeft size={20} className="dark:text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-black dark:text-white">{t.categories}</h1>
              <p className="text-gray-500">Manage product groupings</p>
            </div>
          </div>
          <button 
            onClick={() => openModal()}
            className="px-8 py-4 bg-brand hover:bg-brand-dark text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand/20 dark:shadow-none active:scale-95 transition-all"
          >
            <Plus size={20} />
            {t.addCategory}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-xl transition-all">
              <div className="h-40 overflow-hidden bg-gray-50 dark:bg-gray-900">
                <img src={cat.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={cat.name[lang]} />
              </div>
              <div className="p-6">
                 <h3 className="font-bold text-xl dark:text-white">{cat.name[lang]}</h3>
                 <div className="mt-4 flex gap-3">
                   <button onClick={() => openModal(cat)} className="flex-1 py-3 bg-brand/10 text-brand rounded-xl hover:bg-brand hover:text-white font-bold transition-all flex items-center justify-center gap-2">
                     <Edit2 size={16} /> {t.edit}
                   </button>
                   <button onClick={() => handleDelete(cat.id)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all">
                     <Trash2 size={20} />
                   </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold dark:text-white">{editingId ? t.edit : t.addCategory}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Name (English)</label>
                  <input required value={formData.enName} onChange={e => setFormData({...formData, enName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Name (العربية)</label>
                  <input required dir="rtl" value={formData.arName} onChange={e => setFormData({...formData, arName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Name (کوردی)</label>
                  <input required dir="rtl" value={formData.kuName} onChange={e => setFormData({...formData, kuName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Category Image</label>
                  <div className="relative aspect-video bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border-2 border-dashed border-gray-100 dark:border-gray-700 group cursor-pointer">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={40} />
                        <span className="text-xs font-bold mt-2">Upload Image</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  {t.cancel}
                </button>
                <button type="submit" className="flex-1 py-4 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20 dark:shadow-none hover:bg-brand-dark transition-all active:scale-95">
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesAdmin;
