import HeaderBox from '@/components/ui/HeaderBox'
import TotalBalanceBox from '@/components/ui/TotalBalanceBox';

import React from 'react'

const Home = () => {
    const loggedIn = {firstName: 'Adrians'};
  return (
    <section className='home'>
        <div className='home-content'>
        <header className='home-header'>
        <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'} 
            subtext="Access and manage your account and payments"
            />
           <TotalBalanceBox
            accounts={[]}
            totalBanks={1}
            totalCurrentBalance={1370.50}
           />
        </header>
        </div>
    </section>
  )
}

export default Home
