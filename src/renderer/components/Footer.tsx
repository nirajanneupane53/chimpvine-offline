import React from 'react';
import { FaEnvelope, FaPhoneAlt } from 'react-icons/fa';
import { FiMapPin, FiGlobe, FiPhone } from 'react-icons/fi';
// import AdditionInteractiveBook from 'h5p/addition-interactive-book/addition-interactive-book';
// import AdditionInteractiveBook from '../../h5p/addition-interactive-book';

const Footer = () => {
  const openLink = () => {
    const sentData = {
      event: 'open-link',
      link: ' https://np.chimpvine.com/',
    };
    window.electron.ipcRenderer.sendMessage('Screen-data', sentData);
  };
  return (
    <div className="mt-4 mb-3">
      <hr
        className="my-5 "
        style={{ height: '4px', backgroundColor: 'white' }}
      />
      {/* <!-- Footer --> */}
      <footer className="text-center text-lg-start ">
        <section className="">
          <div className="container text-center text-md-start mt-5">
            {/* <!-- Grid row --> */}
            <div className="row mt-3 justify-content-between">
              {/* <!-- Grid column --> */}
              <div className="col mb-4 text-center">
                {/* <!-- Content --> */}
                <FiMapPin className="mb-3" style={{ fontSize: '50px' }} />

                <h6 className="text-uppercase fw-bold ">Our Location</h6>
                <p>Gairidhara, Nepal</p>
              </div>
              {/* <!-- Grid column --> */}

              {/* <!-- Grid column --> */}
              <div className="col mb-4 text-center">
                {/* <!-- Content --> */}
                <FiPhone className="mb-3" style={{ fontSize: '50px' }} />

                <h6 className="text-uppercase fw-bold ">Contact Number</h6>
                <p>+977-9823095678 </p>
              </div>
              {/* <!-- Grid column --> */}
              {/* <!-- Grid column --> */}
              <div className="col mb-4 text-center">
                {/* <!-- Content --> */}
                <FaEnvelope className="mb-3" style={{ fontSize: '50px' }} />

                <h6 className="text-uppercase fw-bold ">Our Email</h6>
                <p>info@chimpvine.com</p>
              </div>
              {/* <!-- Grid column --> */}
              {/* <!-- Grid column --> */}
              <div className="col mb-4 text-center">
                {/* <!-- Content --> */}
                <FiGlobe className="mb-3" style={{ fontSize: '50px' }} />

                <h6 className="text-uppercase fw-bold ">Our Website</h6>
                <p>
                  <a onClick={() => openLink()} style={{ cursor: 'pointer' }}>
                    https://np.chimpvine.com/
                  </a>
                </p>
              </div>
              {/* <!-- Grid column --> */}
            </div>
            {/* <!-- Grid row --> */}
          </div>
        </section>
        {/* <!-- Section: Links  --> */}
      </footer>
      {/* <!-- Footer --> */}

      {/* <AdditionInteractiveBook /> */}
    </div>
  );
};

export default Footer;
