import { logoutAccount } from '@/lib/actions/user.actions';
import Image from 'next/image';
import React from 'react';

type FooterProps = {
  user: User | null;
  type?: 'desktop' | 'mobile';
};

const Footer = ({ user, type = 'desktop' }: FooterProps) => {
  const firstLetter = user?.firstName?.[0] || 'G';
  const firstName = user?.firstName || 'Guest';
  const lastName = user?.lastName || '';
  const email = user?.email || '';

  return (
    <footer className="footer flex items-center justify-between p-2">
      {/* Profile Icon */}
      <div className={type === 'mobile' ? 'footer_icon-mobile' : 'footer_icon'}>
        <p className="text-xl font-bold text-gray-700">{firstLetter}</p>
      </div>

      {/* User info */}
      <div className={type === 'mobile' ? 'footer_info-mobile flex flex-col truncate ml-2' : 'footer_info'}>
        <h1 className="text-sm text-gray-800 font-semibold truncate">{firstName} {lastName}</h1>
        <p className="text-xs text-gray-600 truncate">{email}</p>
      </div>

      {/* Logout */}
      <div className="footer_logout ml-auto relative w-6 h-6">
        <button 
          onClick={async () => {
            await logoutAccount(); // redirect is handled by the server action
          }} 
          className="w-full h-full flex items-center justify-center"
          aria-label="Logout"
        >
          <Image src="/icons/logout.svg" fill alt="Logout" />
        </button>
      </div>
    </footer>
  );
};

export default Footer;
