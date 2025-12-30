
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, ArrowLeft, Save, X, Image as ImageIcon, Search, Filter, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../../App';
import { StorageService } from '../../store';
import { Product, Category } from '../../types';

const ProductsAdmin: React.FC = () => {
  const { lang, t } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  const [formData, setFormData] = useState({
    enName: '', arName: '', kuName: '',
    enDesc: '', arDesc: '', kuDesc: '',
    price: 0, discountPrice: 0,
    categoryId: '',
    image: '', isAvailable: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [prods, cats] = await Promise.all([
          StorageService.getProducts(),
          StorageService.getCategories()
        ]);
        setProducts(prods);
        setCategories(cats);
        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: cats[0].id }));
        }
      } catch (err) {
        Logger.error("Failed to fetch product data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = searchQuery === '' || p.name[lang].toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCat, lang]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.categoryId) {
        alert("Please select a category");
        return;
      }

      const sanitize = (val: string) => val.trim();
      let newProducts = [...products];
      const productData: Product = {
        id: editingId || Date.now().toString(),
        name: { en: sanitize(formData.enName), ar: sanitize(formData.arName), ku: sanitize(formData.kuName) },
        description: { en: sanitize(formData.enDesc), ar: sanitize(formData.arDesc), ku: sanitize(formData.kuDesc) },
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        categoryId: formData.categoryId,
        image: formData.image || 'https://picsum.photos/400/400',
        isAvailable: formData.isAvailable,
        createdAt: editingId ? (products.find(p => p.id === editingId)?.createdAt || Date.now()) : Date.now()
      };
      
      if (editingId) {
        newProducts = newProducts.map(p => p.id === editingId ? productData : p);
      } else {
        newProducts.unshift(productData);
      }
      
      await StorageService.saveProducts(newProducts);
      setProducts(newProducts);
      closeModal();
      Logger.info(`Product saved successfully.`);
    } catch (err) {
      Logger.error("Failed to save product", err);
      alert("Error saving product. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this product?")) {
      const filtered = products.filter(p => p.id !== id);
      await StorageService.saveProducts(filtered);
      setProducts(filtered);
      Logger.info(`Product deleted: ${id}`);
    }
  };

  const openModal = (p?: Product) => {
    if (p) {
      setEditingId(p.id);
      setFormData({
        enName: p.name.en, arName: p.name.ar, kuName: p.name.ku,
        enDesc: p.description.en, arDesc: p.description.ar, kuDesc: p.description.ku,
        price: p.price, discountPrice: p.discountPrice || 0,
        categoryId: p.categoryId,
        image: p.image, isAvailable: p.isAvailable
      });
    } else {
      setEditingId(null);
      setFormData({
        enName: '', arName: '', kuName: '',
        enDesc: '', arDesc: '', kuDesc: '',
        price: 0, discountPrice: 0,
        categoryId: categories[0]?.id || '',
        image: '', isAvailable: true
      });
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
      reader.onloadend = () => { setFormData({ ...formData, image: reader.result as string }); };
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
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
              <ArrowLeft size={20} className="dark:text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-black dark:text-white">{t.products}</h1>
              <p className="text-gray-500">Inventory management</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="relative flex-grow lg:flex-grow-0 lg:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder={t.search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-brand dark:text-white transition-colors" />
            </div>
            
            <div className="relative flex-grow lg:flex-grow-0 lg:w-48">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={selectedCat} 
                onChange={e => setSelectedCat(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-brand dark:text-white transition-colors appearance-none font-bold"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name[lang]}</option>)}
              </select>
            </div>

            <button onClick={() => openModal()} className="px-8 py-4 bg-brand hover:bg-brand-dark text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand/20 dark:shadow-none active:scale-95 transition-all">
              <Plus size={20} />
              {t.addProduct}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden group flex flex-col hover:shadow-xl transition-all">
              <div className="h-48 relative overflow-hidden bg-gray-50 dark:bg-gray-900">
                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name[lang]} />
                {!p.isAvailable && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold line-clamp-1 dark:text-white flex-grow">{p.name[lang]}</h3>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded ml-2">
                    {categories.find(c => c.id === p.categoryId)?.name[lang] || 'No Cat'}
                  </span>
                </div>
                <div className="mt-auto flex justify-between items-center">
                  <span className="font-bold text-brand">{p.discountPrice ? p.discountPrice.toLocaleString() : p.price.toLocaleString()} IQD</span>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(p)} className="p-2 text-gray-400 hover:text-brand transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
               <p className="text-gray-400 font-bold">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
               <h2 className="text-2xl font-bold dark:text-white">{editingId ? t.edit : t.addProduct}</h2>
               <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400 transition-colors"><X size={24} /></button>
             </div>
             <form onSubmit={handleSave} className="p-8 overflow-y-auto space-y-8 flex-grow no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <h4 className="font-bold dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Product Names</h4>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">English Name</label>
                          <input required value={formData.enName} onChange={e => setFormData({...formData, enName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Arabic Name (العربية)</label>
                          <input required dir="rtl" value={formData.arName} onChange={e => setFormData({...formData, arName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kurdish Name (کوردی)</label>
                          <input required dir="rtl" value={formData.kuName} onChange={e => setFormData({...formData, kuName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h4 className="font-bold dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Descriptions</h4>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">English Description</label>
                          <textarea rows={3} value={formData.enDesc} onChange={e => setFormData({...formData, enDesc: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Arabic Description</label>
                          <textarea dir="rtl" rows={3} value={formData.arDesc} onChange={e => setFormData({...formData, arDesc: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kurdish Description</label>
                          <textarea dir="rtl" rows={3} value={formData.kuDesc} onChange={e => setFormData({...formData, kuDesc: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-4">
                        <h4 className="font-bold dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Settings & Category</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block uppercase">Base Price (IQD)</label>
                              <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                           </div>
                           <div>
                              <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block uppercase">Discount Price</label>
                              <input type="number" value={formData.discountPrice} onChange={e => setFormData({...formData, discountPrice: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white" />
                           </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block uppercase">Select Category (Required)</label>
                          <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand dark:text-white appearance-none font-bold">
                             <option value="" disabled>Choose Category...</option>
                             {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name[lang]}</option>)}
                          </select>
                        </div>

                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                          <label className="flex-grow font-bold dark:text-white">Product Availability</label>
                          <button type="button" onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})} className={`w-14 h-8 rounded-full relative transition-colors ${formData.isAvailable ? 'bg-brand' : 'bg-gray-300'}`}>
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isAvailable ? 'left-7' : 'left-1'}`}></div>
                          </button>
                        </div>
                     </div>

                     <div>
                        <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block uppercase">Product Image</label>
                        <div className="relative aspect-square bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden border-2 border-dashed border-gray-100 dark:border-gray-700 group cursor-pointer">
                           {formData.image ? (
                             <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                           ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon size={48} />
                                <span className="text-xs font-bold mt-2">Click to Upload</span>
                             </div>
                           )}
                           <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="flex gap-4 pt-10 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 pb-4">
                 <button type="button" onClick={closeModal} className="flex-1 py-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold dark:text-white transition-colors">
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

export default ProductsAdmin;
