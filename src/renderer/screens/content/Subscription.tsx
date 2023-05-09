import React from 'react';

const Subscription = () => {
  return (
    <>
      <div className="mt-5 text-center">
        <h1 className="fw-bold" style={{ fontSize: '50px', color: 'black' }}>
          Your Subscription is Expired
        </h1>
        <h2 className="fw-bold mt-3">
          We're sorry to hear that your software subscription has expired. To
          resume your service and continue using our software, please click on
          the "contact us" button below or call our support team at
          +977-9802322953 . We're here to help you get back up and running as
          quickly as possible. Thank you for choosing our software and for your
          continued support!
        </h2>
        <button className="mt-3">Contact Us</button>
      </div>
    </>
  );
};

export default Subscription;
