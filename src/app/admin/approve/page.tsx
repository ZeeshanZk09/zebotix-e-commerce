'use client';
import StoreInfo from '@/components/admin/StoreInfo';
import Loading from '@/components/Loading';
import { useAdminStores } from '@/lib/hooks/useStores';
import toast from 'react-hot-toast';

export default function AdminApprove() {
  const { loading, storesToApprove, handleApprove } = useAdminStores();
  return !loading ? (
    <div className='text-slate-500 mb-28'>
      <h1 className='text-2xl'>
        Approve <span className='text-slate-800 font-medium'>Stores</span>
      </h1>

      {Array.isArray(storesToApprove) && storesToApprove?.length ? (
        <div className='flex flex-col gap-4 mt-4'>
          {storesToApprove.map((store) => (
            <div
              key={store.id!}
              className='bg-white border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl'
            >
              {/* Store Info */}
              <StoreInfo store={store} />

              {/* Actions */}
              <div className='flex gap-3 pt-2 flex-wrap'>
                <button
                  onClick={() =>
                    toast.promise(handleApprove({ storeId: store.id!, status: 'approved' }), {
                      loading: 'approving',
                    })
                  }
                  className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm'
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    toast.promise(handleApprove({ storeId: store.id!, status: 'rejected' }), {
                      loading: 'rejecting',
                    })
                  }
                  className='px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm'
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='flex items-center justify-center h-80'>
          <h1 className='text-3xl text-slate-400 font-medium'>No Application Pending</h1>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
}
