
import React from 'react';
import { Phone, MapPin, Instagram, Facebook, Clock } from 'lucide-react';
import { useApp } from '../App';

const TikTokIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-1.24-.87-2.21-2.12-2.68-3.47-.04 1.39-.01 2.78-.02 4.17v6.64c.03 1.17-.34 2.35-1.03 3.32-.69.97-1.72 1.72-2.88 2.05-1.16.33-2.42.34-3.56-.03-1.14-.37-2.09-1.2-2.66-2.22-.57-1.02-.75-2.23-.52-3.39.23-1.16.89-2.18 1.83-2.89.94-.71 2.15-1.07 3.33-1.01.27.01.54.04.8.08v4.02c-.31-.13-.65-.18-.99-.17-1.33.02-2.5.89-2.92 2.15-.42 1.26-.06 2.71.93 3.59 1 1 2.76 1 3.75 0 .99-.99 1.12-2.56.28-3.69V.02z"/>
  </svg>
);

const AboutPage: React.FC = () => {
  const { t, lang, settings } = useApp();

  return (
    <div className="space-y-20 pb-20 bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Hero Header */}
      <section className="bg-gray-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-600/20 rounded-full blur-[100px] -ml-48 -mb-48"></div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl lg:text-7xl font-black mb-6 tracking-tight">{t.about}</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium">
            {t.aboutHeroDesc}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <div className="p-4 bg-brand/5 dark:bg-brand/10 border-l-4 border-brand rounded-r-2xl">
              <h2 className="text-3xl font-bold mb-4 dark:text-white">{t.ourStory}</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed italic">
                "{settings.aboutText[lang]}"
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white">
                  <Phone size={20} className="text-brand" />
                  {t.contactInfo}
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                  {settings.phone1 && (
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand rounded-full"></span>
                      {settings.phone1}
                    </li>
                  )}
                  {settings.phone2 && (
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-brand rounded-full"></span>
                      {settings.phone2}
                    </li>
                  )}
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white">
                  <Clock size={20} className="text-brand" />
                  {t.businessHours}
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                  <li>{t.openAllWeek}</li>
                  <li>{t.workingHours}</li>
                </ul>
              </div>
            </div>

            <div className="pt-8 flex flex-wrap gap-4">
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="p-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl hover:bg-brand hover:text-white transition-all shadow-md">
                  <Facebook size={24} />
                </a>
              )}
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="p-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl hover:bg-pink-600 hover:text-white transition-all shadow-md">
                  <Instagram size={24} />
                </a>
              )}
              {settings.tiktok && (
                <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="p-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl hover:bg-black hover:text-white transition-all shadow-md">
                  <TikTokIcon size={24} />
                </a>
              )}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-brand rounded-[2.5rem] transform translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500"></div>
              <img 
                src={settings.aboutImage} 
                alt="Imation Showroom" 
                className="relative z-10 w-full rounded-[2.5rem] shadow-2xl object-cover h-[500px]" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden p-2 transition-colors">
          <div className="h-[450px] w-full rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative">
            {/* Only Google's dedicated "embed" URLs are allowed to render inside
                an iframe; a plain maps.google.com or share.google link is
                refused by Google and would just show a blank frame. */}
            {settings.googleMapsUrl?.includes('/maps/embed') ? (
              <iframe
                src={settings.googleMapsUrl}
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '1rem' }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Location"
              ></iframe>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <MapPin size={40} />
                <p className="text-sm font-bold">{t.openInMaps}</p>
              </div>
            )}
            <div className="absolute bottom-8 right-8 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 hidden md:block max-w-xs transition-colors">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2 dark:text-white">
                <MapPin className="text-brand" size={18} />
                {t.visitShowroom}
              </h3>
              {settings.googleMapsUrl && (
                <button onClick={() => window.open(settings.googleMapsUrl, '_blank')} className="mt-2 w-full py-2 bg-brand text-white rounded-xl text-sm font-bold active:scale-95 transition-all">{t.getDirections}</button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
