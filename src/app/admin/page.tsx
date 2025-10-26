'use client';
import { dummyAdminDashboardData } from './../../../public/assets/assets';
import Loading from '@/components/Loading';
import OrdersAreaChart from '@/components/OrdersAreaChart';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { useAdminDashboard } from '@/lib/hooks/useAdminDashboard';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { refetch, loading, isError, dashboard, cards, allOrders } = useAdminDashboard();
  if (loading) return <Loading />;

  return (
    <div className='text-slate-500'>
      <h1 className='text-2xl'>
        Admin <span className='text-slate-800 font-medium'>Dashboard</span>
      </h1>

      {/* Cards */}
      <div className='flex flex-wrap gap-5 my-10 mt-4'>
        {cards.map((card, index) => (
          <div
            key={index}
            className='flex items-center gap-10 border border-slate-200 p-3 px-6 rounded-lg'
          >
            <div className='flex flex-col gap-3 text-xs'>
              <p>{card.title}</p>
              <b className='text-2xl font-medium text-slate-700'>{card.value}</b>
            </div>
            <card.icon
              size={50}
              className=' w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full'
            />
          </div>
        ))}
      </div>

      {/* Area Chart */}
      <OrdersAreaChart allOrders={allOrders} />
    </div>
  );
}
