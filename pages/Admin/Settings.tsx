
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Phone, Instagram, Facebook, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../../App';

const SettingsAdmin: React.FC = () => {
  const { settings, updateSettings, t, isSyncing } = useApp();
  const [formData, setFormData] = useState({ ...settings });
  const [saveStatus, setSaveStatus] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSaveStatus(true);
    Logger.info("Admin updated settings for Imation Cloud");
    setTimeout(() => setSaveStatus(false), 3000);
  };

  const handleImageChange = (key: 'logo' | 'heroImage' | 'aboutImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-12 transition-colors duration-200 relative">
      {isSyncing && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-black uppercase tracking-widest text-sm">Syncing with Server...</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <ArrowLeft size={20} className="dark:text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-black dark:text-white">{t.settings}</h1>
              <p className="text-gray-500">Global Imation configuration and branding</p>
            </div>
          </div>
          {saveStatus && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-6 py-3 rounded-xl font-bold text-sm animate-in fade-in slide-in-from-top-4">
              Changes published to all users!
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AssetUpload 
              label="Shop Logo" 
              image={formData.logo} 
              onUpload={e => handleImageChange('logo', e)} 
              aspect="aspect-square"
            />
            <AssetUpload 
              label="Hero Image" 
              image={formData.heroImage} 
              onUpload={e => handleImageChange('heroImage', e)} 
              aspect="aspect-video"
            />
            <AssetUpload 
              label="About Page Image" 
              image={formData.aboutImage} 
              onUpload={e => handleImageChange('aboutImage', e)} 
              aspect="aspect-square"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-6 shadow-sm">
              <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white">
                <Globe size={20} className="text-brand" />
                Store Description
              </h3>
              <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">English Description</label>
                   <textarea rows={3} value={formData.aboutText.en} onChange={e => setFormData({...formData, aboutText: {...formData.aboutText, en: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Arabic Description</label>
                   <textarea dir="rtl" rows={3} value={formData.aboutText.ar} onChange={e => setFormData({...formData, aboutText: {...formData.aboutText, ar: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Kurdish Description</label>
                   <textarea dir="rtl" rows={3} value={formData.aboutText.ku} onChange={e => setFormData({...formData, aboutText: {...formData.aboutText, ku: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-6 shadow-sm">
              <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white">
                <Phone size={20} className="text-brand" />
                Contacts & Links
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Phone 1</label>
                   <input value={formData.phone1} onChange={e => setFormData({...formData, phone1: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Phone 2</label>
                   <input value={formData.phone2} onChange={e => setFormData({...formData, phone2: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Instagram</label>
                   <input value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Facebook</label>
                   <input value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
                 <div className="space-y-1 sm:col-span-2">
                   <label className="text-xs font-bold text-gray-400 uppercase">TikTok</label>
                   <input value={formData.tiktok} onChange={e => setFormData({...formData, tiktok: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
                 </div>
              </div>
              <div className="space-y-1 pt-2">
                 <label className="text-xs font-bold text-gray-400 uppercase">Google Maps Embed URL</label>
                 <input value={formData.googleMapsUrl} onChange={e => setFormData({...formData, googleMapsUrl: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none dark:text-white" />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSyncing}
            className="w-full py-6 bg-brand hover:bg-brand-dark text-white rounded-3xl font-black text-xl shadow-2xl shadow-brand/20 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all mb-12 disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            {isSyncing ? "Syncing..." : t.save}
          </button>
        </form>
      </div>
    </div>
  );
};

const AssetUpload: React.FC<{ label: string, image: string, onUpload: (e: any) => void, aspect: string }> = ({ label, image, onUpload, aspect }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</h3>
    <div className={`relative ${aspect} bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-700 group cursor-pointer`}>
      <img src={image} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ImageIcon className="text-white mb-2" size={32} />
        <span className="text-white text-xs font-bold uppercase">Replace Asset</span>
      </div>
      <input type="file" accept="image/*" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
    </div>
  </div>
);

export default SettingsAdmin;
