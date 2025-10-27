'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Loading from '@/components/Loading';
import { productDummyData } from './../../../../public/assets/assets';
import { Product } from '@/generated/prisma/browser';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import ImageKit from '@/components/imagekit/Image';
export default function StoreManageProducts() {
  const currency = 'Rs';
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    try {
      const token = await getToken();
      const response = await axios.get('/api/store/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        setProducts(response.data.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const toggleStock = async (productId: string) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `/api/store/stock-toggle`,
        { productId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        setProducts((prevProducts) =>
          prevProducts.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                inStock: !product.inStock,
              };
            }
            return product;
          })
        );
        toast.success(response.data.message);
        fetchProducts();
      }
    } catch (error) {
      toast.error('Error updating stock');
      console.error('Error updating stock:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <h1 className='text-2xl text-slate-500 mb-5'>
        Manage <span className='text-slate-800 font-medium'>Products</span>
      </h1>
      <table className='w-full max-w-4xl text-left  ring ring-slate-200  rounded overflow-hidden text-sm'>
        <thead className='bg-slate-50 text-gray-700 uppercase tracking-wider'>
          <tr>
            <th className='px-4 py-3'>Name</th>
            <th className='px-4 py-3 hidden md:table-cell'>Description</th>
            <th className='px-4 py-3 hidden md:table-cell'>MRP</th>
            <th className='px-4 py-3'>Price</th>
            <th className='px-4 py-3'>Actions</th>
          </tr>
        </thead>
        <tbody className='text-slate-700'>
          {products.map((product) => (
            <tr key={product.id} className='border-t border-gray-200 hover:bg-gray-50'>
              <td className='px-4 py-3'>
                <div className='flex gap-2 items-center'>
                  <ImageKit
                    className='w-14 h-14 p-1 shadow rounded cursor-pointer'
                    src={product.images[0]}
                    alt=''
                  />
                  {product.name}
                </div>
              </td>
              <td className='px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate'>
                {product.description}
              </td>
              <td className='px-4 py-3 hidden md:table-cell'>
                {currency} {product.mrp.toLocaleString()}
              </td>
              <td className='px-4 py-3'>
                {currency} {product.price.toLocaleString()}
              </td>
              <td className='px-4 py-3 text-center'>
                <label className='relative inline-flex items-center cursor-pointer text-gray-900 gap-3'>
                  <input
                    type='checkbox'
                    className='sr-only peer'
                    onChange={() =>
                      toast.promise(toggleStock(product.id), { loading: 'Updating data...' })
                    }
                    checked={product.inStock}
                  />
                  <div className='w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200'></div>
                  <span className='dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4'></span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
