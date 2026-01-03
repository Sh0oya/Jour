import React from 'react';
import { Home, History, BarChart2, Settings, User } from 'lucide-react';
import { Tab, User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  user: UserType;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, user }) => {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden">
      {/* Header */}
      {/* Header Removed to avoid duplication with page headers */}
      <div className="pt-4"></div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-mint-50 pb-24 px-4 relative">
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between items-center z-20 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <NavButton
          icon={<Home size={24} />}
          label="Home"
          active={activeTab === Tab.DASHBOARD}
          onClick={() => onTabChange(Tab.DASHBOARD)}
        />
        <NavButton
          icon={<History size={24} />}
          label="History"
          active={activeTab === Tab.HISTORY}
          onClick={() => onTabChange(Tab.HISTORY)}
        />
        <NavButton
          icon={<BarChart2 size={24} />}
          label="Insight"
          active={activeTab === Tab.ANALYTICS}
          onClick={() => onTabChange(Tab.ANALYTICS)}
        />
        <NavButton
          icon={<Settings size={24} />}
          label="Settings"
          active={activeTab === Tab.SETTINGS}
          onClick={() => onTabChange(Tab.SETTINGS)}
        />
      </div>
    </div>
  );
};

const NavButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-emerald-800 scale-105' : 'text-gray-400 hover:text-emerald-600'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default Layout;