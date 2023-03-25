import Grades from './Grades';
import Games from './Games';
import Footer from 'renderer/components/Footer';

const Home = () => {
  return (
    <div className="mt-5 ">
      <Grades />
      <Games />
      <Footer />
    </div>
  );
};

export default Home;
