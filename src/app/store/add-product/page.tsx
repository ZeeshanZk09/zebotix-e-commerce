'use client';
import axios from 'axios';
import { assets } from './../../../../public/assets/assets';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';

export default function StoreAddProduct() {
  const categories = [
    'Electronics',
    'Clothing',
    'Home & Kitchen',
    'Beauty & Health',
    'Toys & Games',
    'Sports & Outdoors',
    'Books & Media',
    'Food & Drink',
    'Hobbies & Crafts',
    'Others',
  ];

  const [images, setImages] = useState<{
    [key: number]: File | null;
  }>({ 1: null, 2: null, 3: null, 4: null });
  const [productInfo, setProductInfo] = useState({
    name: '',
    description: '',
    mrp: 0,
    price: 0,
    category: '',
  });
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const onChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });
  };

  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!images[1] && !images[2] && !images[3] && !images[4]) {
        toast.error('Please upload at least one image.');
        return;
      }
      setLoading(true);
      const formData = new FormData();
      formData.append('name', productInfo.name);
      formData.append('description', productInfo.description);
      formData.append('mrp', productInfo.mrp.toString());
      formData.append('price', productInfo.price.toString());
      formData.append('category', productInfo.category);
      Object.keys(images).forEach((key) => {
        if (images[Number(key)]) {
          images[Number(key)] && formData.append('images', images[Number(key)] as File);
        }
      });
      const token = await getToken();
      const response = await axios.post('/api/store/product', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        toast.success('Product added successfully');
        setProductInfo({
          name: '',
          description: '',
          mrp: 0,
          price: 0,
          category: '',
        });
        setImages({ 1: null, 2: null, 3: null, 4: null });
      }
      return response.data;
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Error adding product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => toast.promise(onSubmitHandler(e), { loading: 'Adding Product...' })}
      className='text-slate-500 mb-28'
    >
      <h1 className='text-2xl'>
        Add New <span className='text-slate-800 font-medium'>Products</span>
      </h1>
      <p className='mt-7'>Product Images</p>

      <label htmlFor='' className='flex gap-3 mt-4'>
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`}>
            <Image
              width={300}
              height={300}
              className='h-15 w-auto border border-slate-200 rounded cursor-pointer'
              src={
                images[Number(key)]
                  ? URL.createObjectURL(images[Number(key)] as File)
                  : assets.upload_area
              }
              alt=''
            />
            <input
              type='file'
              accept='image/*'
              id={`images${key}`}
              onChange={(e) =>
                setImages({
                  ...images,
                  [Number(key)]: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                })
              }
              hidden
            />
          </label>
        ))}
      </label>

      <label htmlFor='' className='flex flex-col gap-2 my-6 '>
        Name
        <input
          type='text'
          name='name'
          onChange={onChangeHandler}
          value={productInfo.name}
          placeholder='Enter product name'
          className='w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded'
          required
        />
      </label>

      <label htmlFor='' className='flex flex-col gap-2 my-6 '>
        Description
        <textarea
          name='description'
          onChange={onChangeHandler}
          value={productInfo.description}
          placeholder='Enter product description'
          rows={5}
          className='w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none'
          required
        />
      </label>

      <div className='flex gap-5'>
        <label htmlFor='' className='flex flex-col gap-2 '>
          Actual Price (Rs)
          <input
            type='number'
            name='mrp'
            onChange={onChangeHandler}
            value={productInfo.mrp}
            placeholder='0'
            className='w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none'
            required
          />
        </label>
        <label htmlFor='' className='flex flex-col gap-2 '>
          Offer Price (Rs)
          <input
            type='number'
            name='price'
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder='0'
            className='w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none'
            required
          />
        </label>
      </div>

      <select
        onChange={(e) => setProductInfo({ ...productInfo, category: e.target.value })}
        value={productInfo.category}
        className='w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded'
        required
      >
        <option value=''>Select a category</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <br />

      <button
        disabled={loading}
        className='bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition'
      >
        Add Product
      </button>
    </form>
  );
}
