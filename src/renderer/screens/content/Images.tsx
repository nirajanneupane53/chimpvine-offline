interface ImageProps {
  [key: string]: string;
}

const importImages = async () => {
  const images: ImageProps = {};
  const imageContext = require.context(
    '../../../../assets/images/games/',
    false,
    /\.(png|jpe?g|svg)$/
  );
  const imagePaths = imageContext.keys();
  await Promise.all(
    imagePaths.map(async (imagePath: any) => {
      const imageName = imagePath.replace('./', '');
      const imageUrl = await import(
        `../../../../assets/images/games/${imageName}`
      );
      images[imageName] = imageUrl.default;
    })
  );
  return images;
};

export default importImages;
