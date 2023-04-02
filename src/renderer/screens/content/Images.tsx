import React from 'react';

// import image from "../../../../assets/images/"
interface ImageProps {
  [key: string]: string;
}

const importImages = () => {
  const images: ImageProps = {};
  const imageContext = require.context(
    '../../../../assets/images/games/',
    false,
    /\.(png|jpe?g|svg)$/
  );
  imageContext.keys().forEach((imageName: any) => {
    images[imageName] = imageContext(imageName).default;
  });
  return images;
};

export default importImages;
