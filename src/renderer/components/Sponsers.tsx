import React from 'react';
import Carousel from 'react-bootstrap/Carousel';
import Banner1 from '../../../assets/images/Banner/ds3.png';

const Sponsers = () => {
  const bannerData = [
    {
      image: Banner1,
      date: '2023-04-05',
      link: 'sfsf',
    },
    {
      image: Banner1,
      date: '2023-05-10',
      link: 'sfsf',
    },
    {
      image: Banner1,
      date: '2023-05-15',
      link: 'fsfs',
    },
  ];

  const currentDate = new Date();

  const handleClick = (link: any) => {
    console.log(link);
  };

  return (
    <div className="pt-5">
      <Carousel style={{ border: '5px solid white', borderRadius: '4px' }}>
        {bannerData.map((banner, index) => {
          const bannerDate = new Date(banner.date);
          if (bannerDate > currentDate) {
            return (
              <Carousel.Item
                key={index}
                onClick={() => {
                  handleClick(banner.link);
                }}
                style={{ cursor: 'pointer' }}
              >
                <img
                  className="d-block w-100"
                  src={banner.image}
                  alt={`Banner ${index + 1}`}
                />
              </Carousel.Item>
            );
          }
          return null;
        })}
      </Carousel>
    </div>
  );
};

export default Sponsers;
