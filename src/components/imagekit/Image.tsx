'use client';
import { Image, ImageKitProvider, buildSrc } from '@imagekit/next';
import { useState } from 'react';

export default function ImageKit() {
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  return (
    <ImageKitProvider
      urlEndpoint='https://ik.imagekit.io/your_imagekit_id' // New prop
    >
      <Image
        transformation={[{ width: 500, height: 500 }]}
        src='/profile.png'
        width={500}
        height={500}
        style={
          showPlaceholder
            ? {
                backgroundImage: `url(${buildSrc({
                  urlEndpoint: 'https://ik.imagekit.io/ikmedia',
                  src: '/default-image.jpg',
                  transformation: [
                    // {}, // Any other transformation you want to apply
                    {
                      quality: 10,
                      blur: 90,
                    },
                  ],
                })})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              }
            : {}
        }
        onLoad={() => {
          setShowPlaceholder(false);
        }}
        alt='Picture of the author'
        loading='eager'
      />
    </ImageKitProvider>
  );
}
