import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiHome } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Heading = () => {
  const navigate = useNavigate();
  return (
    <div>
      <div className="row my-5">
        <div className="col text-start">
          <button onClick={() => navigate(-1)}>
            <FiChevronLeft /> Back
          </button>
        </div>
        <div className="col text-end">
          <Link to="/">
            <button>
              <FiHome />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Heading;
